import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

// Available ElevenLabs voices — same set as pipeline-worker.mjs CHARACTER_VOICES
export const VOICE_ROSTER = [
  { key: 'narrator',     name: 'Daniel',    label: 'Narrator',      description: 'Deep, cinematic. Great for narration.' },
  { key: 'deep_male',    name: 'George',    label: 'Deep Male',     description: 'Mature, resonant male voice.' },
  { key: 'male',         name: 'Liam',      label: 'Male',          description: 'Younger, clear male voice.' },
  { key: 'old_male',     name: 'Bill',      label: 'Older Male',    description: 'Aged, weathered male voice.' },
  { key: 'female',       name: 'Charlotte', label: 'Female',        description: 'Clear, expressive female voice.' },
  { key: 'young_female', name: 'Alice',     label: 'Young Female',  description: 'Bright, younger female voice.' },
  { key: 'default',      name: 'Charlie',   label: 'Neutral',       description: 'Neutral, versatile voice.' },
]

const PARSE_SYSTEM_PROMPT = `You are a professional audiobook producer. Your job is to parse a book manuscript into a structured JSON array of narration/dialogue segments, ready for a full-cast text-to-speech audiobook render.

Each segment is either:
- NARRATOR: prose narration, scene description, action
- A specific character name: dialogue spoken by that character

RULES:
1. Preserve the exact text of every word — do NOT summarize, paraphrase, or skip content.
2. Split on speaker changes. Each time the speaker changes (narrator → character, character → narrator, character A → character B), start a new segment.
3. Include dialogue attribution text (e.g. "he said", "she whispered") in the NARRATOR segment BEFORE the dialogue, not inside the character segment.
4. Strip quotation marks from character dialogue segments — they will be spoken, not read.
5. Keep segments a reasonable length — split very long narrator passages at paragraph breaks.
6. Identify character names from the text exactly as they appear.
7. Return ONLY a valid JSON array. No markdown, no code blocks, no explanation.

Output format:
[
  { "index": 0, "speaker": "NARRATOR", "text": "It was a dark and stormy night." },
  { "index": 1, "speaker": "NARRATOR", "text": "Jonathan looked up and said," },
  { "index": 2, "speaker": "Jonathan", "text": "I must find the castle before nightfall." },
  { "index": 3, "speaker": "NARRATOR", "text": "The old woman grabbed his arm." },
  { "index": 4, "speaker": "Old Woman", "text": "Do not go there. He is not a man." }
]`

export async function POST(
  request: Request,
  { params }: { params: { bookId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookId } = params
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch book + verify ownership
    const { data: book } = await sb
      .from('books')
      .select('id, title, author_id, pdf_url')
      .eq('id', bookId)
      .single()
    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }
    if (!book.pdf_url) {
      return Response.json({ error: 'No manuscript uploaded for this book' }, { status: 400 })
    }

    // Fetch characters already extracted for this book
    const { data: characters } = await sb
      .from('characters')
      .select('name, role, voice_key')
      .eq('book_id', bookId)

    // Download the manuscript PDF and extract text
    const pdfRes = await fetch(book.pdf_url)
    if (!pdfRes.ok) {
      return Response.json({ error: 'Could not fetch manuscript' }, { status: 500 })
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

    // Use pdf-parse to extract text
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js')
    const pdfData = await pdfParse(pdfBuffer)
    const manuscriptText = pdfData.text

    // Truncate to ~60k chars to stay within Claude context (~15k tokens)
    const truncated = manuscriptText.length > 60000
      ? manuscriptText.slice(0, 60000) + '\n\n[manuscript continues...]'
      : manuscriptText

    const charList = characters?.map(c => c.name).join(', ') || 'unknown'
    const userPrompt = `Book title: "${book.title}"
Known characters: ${charList}

Parse this manuscript into dialogue segments:

${truncated}`

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      system: PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawJson = (message.content[0] as { type: string; text: string }).text.trim()

    // Parse and validate
    let segments: Array<{ index: number; speaker: string; text: string }>
    try {
      segments = JSON.parse(rawJson)
      if (!Array.isArray(segments)) throw new Error('Not an array')
      // Re-index to ensure clean ordering
      segments = segments.map((s, i) => ({ index: i, speaker: s.speaker || 'NARRATOR', text: s.text || '' }))
    } catch {
      return Response.json({ error: 'Failed to parse manuscript dialogue' }, { status: 500 })
    }

    // Build unique speaker list (excluding NARRATOR)
    const speakers = [...new Set(segments.map(s => s.speaker).filter(s => s !== 'NARRATOR'))]

    // Map existing character voice assignments
    const voiceMap: Record<string, string> = { NARRATOR: 'narrator' }
    for (const char of (characters || [])) {
      voiceMap[char.name] = char.voice_key || 'default'
    }
    // Auto-assign voices to any new speakers not yet in characters table
    const unassigned = speakers.filter(s => !voiceMap[s])
    const autoVoices = ['deep_male', 'male', 'female', 'young_female', 'old_male', 'default']
    unassigned.forEach((s, i) => {
      voiceMap[s] = autoVoices[i % autoVoices.length]
    })

    const wordCount = manuscriptText.split(/\s+/).length

    return Response.json({
      segments,
      speakers,
      voiceMap,
      voiceRoster: VOICE_ROSTER,
      wordCount,
      estimatedCredits: 900,
      estimatedMinutes: Math.round(wordCount / 150), // ~150 words/min narration
    })
  } catch (err) {
    console.error('[audiobook/parse] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
