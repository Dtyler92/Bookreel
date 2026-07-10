import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type BlurbSection = 'backCover' | 'shortHook' | 'tiktokHooks' | 'instagramCaption' | 'tweetThread' | 'goodreadsBlurb'

const SECTION_PROMPTS: Record<BlurbSection, (title: string, genre: string, description: string, scenes: string, voiceover: string) => string> = {
  backCover: (title, genre, description, scenes, voiceover) => `You are a professional book marketer. Write a back cover blurb for this book.

Title: "${title}" | Genre: ${genre}
Description: ${description}
Key scenes: ${scenes}
${voiceover ? `Narrator script (tone reference): ${voiceover}` : ''}

Write a 150-200 word back cover blurb. Opens with a hook, builds tension, ends with a cliffhanger. No spoilers. Match the genre tone exactly.
Return ONLY valid JSON: { "backCover": "..." }`,

  shortHook: (title, genre, description) => `You are a professional book marketer. Write a short hook for this book.

Title: "${title}" | Genre: ${genre}
Description: ${description}

Write one punchy sentence (15-25 words) capturing the book's premise and emotional hook. Perfect for ads.
Return ONLY valid JSON: { "shortHook": "..." }`,

  tiktokHooks: (title, genre, description, scenes) => `You are a professional book marketer. Write 4 TikTok hooks for this book.

Title: "${title}" | Genre: ${genre}
Description: ${description}
Key scenes: ${scenes}

Write 4 opening hooks:
1. POV hook (starts with 'POV:')
2. Emotional hook (starts with a feeling or dramatic statement)
3. Curiosity hook (starts with 'What if' or a provocative question)
4. Story hook (starts mid-action)
Return ONLY valid JSON: { "tiktokHooks": ["...", "...", "...", "..."] }`,

  instagramCaption: (title, genre, description) => `You are a professional book marketer. Write an Instagram caption for this book.

Title: "${title}" | Genre: ${genre}
Description: ${description}

Write an 80-120 word Instagram caption. Conversational, emotional, ends with a CTA. Include 5 relevant hashtags.
Return ONLY valid JSON: { "instagramCaption": "..." }`,

  tweetThread: (title, genre, description) => `You are a professional book marketer. Write a 4-tweet thread announcing this book.

Title: "${title}" | Genre: ${genre}
Description: ${description}

Write 4 tweets (max 280 chars each): hook, premise, stakes, CTA.
Return ONLY valid JSON: { "tweetThread": ["...", "...", "...", "..."] }`,

  goodreadsBlurb: (title, genre, description, scenes) => `You are a professional book marketer. Write a Goodreads blurb for this book.

Title: "${title}" | Genre: ${genre}
Description: ${description}
Key scenes: ${scenes}

Write a 100-150 word Goodreads-style blurb. Third person, present tense. Focus on protagonist and central conflict.
Return ONLY valid JSON: { "goodreadsBlurb": "..." }`,
}

async function callAI(prompt: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY

  if (!anthropicKey && !openrouterKey) {
    throw new Error('No AI API keys configured. Add ANTHROPIC_API_KEY or OPENROUTER_API_KEY to Vercel environment variables.')
  }

  if (anthropicKey) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    return message.content[0].type === 'text' ? message.content[0].text : ''
  } else {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }
}

// POST /api/books/[bookId]/blurbs
// body: {} for full generation, or { section: BlurbSection } for single section regen
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as { section?: BlurbSection }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: book } = await supabase
      .from('books')
      .select('id, title, genre, description, author_id')
      .eq('id', bookId)
      .single()

    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const { data: scenes } = await supabase
      .from('scenes')
      .select('scene_number, description')
      .eq('book_id', bookId)
      .order('scene_number', { ascending: true })

    const { data: bookFull } = await supabase
      .from('books')
      .select('voiceover')
      .eq('id', bookId)
      .single()

    const title = book.title
    const genre = book.genre || 'Fiction'
    const description = book.description || '(none provided)'
    const sceneList = (scenes || []).map(s => `Scene ${s.scene_number}: ${s.description}`).join('\n') || '(none provided)'
    const voiceover = bookFull?.voiceover || ''

    // ── Single section regeneration ───────────────────────────────────────────
    if (body.section && SECTION_PROMPTS[body.section]) {
      const prompt = SECTION_PROMPTS[body.section](title, genre, description, sceneList, voiceover)
      const raw = await callAI(prompt)
      const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      const result = JSON.parse(cleaned)
      const value = result[body.section]

      // Merge updated section into existing saved blurbs and persist
      const { data: existing } = await supabase.from('books').select('blurbs_json').eq('id', bookId).single()
      const merged = { ...(existing?.blurbs_json as object ?? {}), [body.section]: value }
      await supabase.from('books').update({ blurbs_json: merged }).eq('id', bookId)

      return Response.json({ section: body.section, value })
    }

    // ── Full generation ───────────────────────────────────────────────────────
    const fullPrompt = `You are a professional book marketer who specializes in copy that drives sales and reader engagement. Generate a complete marketing copy pack for this book.

BOOK DETAILS:
Title: "${title}"
Genre: ${genre}
Description: ${description}

KEY SCENES:
${sceneList}

${voiceover ? `NARRATOR SCRIPT (for tone reference):\n${voiceover}\n` : ''}

Generate the following marketing copy. Return ONLY valid JSON — no markdown, no preamble, exactly this structure:

{
  "backCover": "150-200 word back cover blurb. Opens with a hook, builds tension, ends with a question or cliffhanger. NO spoilers. Match the genre tone exactly.",
  "shortHook": "One punchy sentence (15-25 words) that captures the entire book's premise and emotional hook. Perfect for ads.",
  "tiktokHooks": [
    "POV hook (starts with 'POV:')",
    "Emotional hook (starts with a feeling or dramatic statement)",
    "Curiosity hook (starts with 'What if' or a provocative question)",
    "Story hook (starts mid-action)"
  ],
  "instagramCaption": "Instagram caption 80-120 words. Conversational, emotional, ends with a CTA. Include 5 relevant hashtags at the end.",
  "tweetThread": [
    "Tweet 1: Hook tweet (max 280 chars)",
    "Tweet 2: Premise/setup (max 280 chars)",
    "Tweet 3: Stakes/conflict (max 280 chars)",
    "Tweet 4: CTA + where to find it (max 280 chars)"
  ],
  "goodreadsBlurb": "Goodreads-style blurb, 100-150 words. Third person, present tense. Focuses on protagonist and central conflict."
}`

    const raw = await callAI(fullPrompt)
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
    const blurbs = JSON.parse(cleaned)

    // Persist to DB so the author never loses their blurbs
    await supabase.from('books').update({ blurbs_json: blurbs }).eq('id', bookId)

    return Response.json({ blurbs })
  } catch (err) {
    console.error('[blurbs] Error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to generate blurbs' }, { status: 500 })
  }
}

