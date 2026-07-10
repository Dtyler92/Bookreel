import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// POST /api/books/[bookId]/blurbs
// Generates a full marketing copy pack for the book using Claude.
// Returns: { backCover, shortHook, tiktokHooks[], instagramCaption, tweetThread[], goodreadsBlurb }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify ownership + fetch book data
    const { data: book } = await supabase
      .from('books')
      .select('id, title, genre, description, author_id')
      .eq('id', bookId)
      .single()

    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch scenes for story context
    const { data: scenes } = await supabase
      .from('scenes')
      .select('scene_number, description')
      .eq('book_id', bookId)
      .order('scene_number', { ascending: true })

    // Fetch screenplay voiceover if exists
    const { data: bookFull } = await supabase
      .from('books')
      .select('voiceover')
      .eq('id', bookId)
      .single()

    const sceneList = (scenes || [])
      .map(s => `Scene ${s.scene_number}: ${s.description}`)
      .join('\n')

    const voiceover = bookFull?.voiceover || ''

    const prompt = `You are a professional book marketer who specializes in copy that drives sales and reader engagement. Generate a complete marketing copy pack for this book.

BOOK DETAILS:
Title: "${book.title}"
Genre: ${book.genre || 'Fiction'}
Description: ${book.description || '(none provided)'}

KEY SCENES:
${sceneList || '(none provided)'}

${voiceover ? `NARRATOR SCRIPT (for tone reference):\n${voiceover}\n` : ''}

Generate the following marketing copy. Return ONLY valid JSON — no markdown, no preamble, exactly this structure:

{
  "backCover": "150-200 word back cover blurb. Opens with a hook, builds tension, ends with a question or cliffhanger that makes the reader NEED to know what happens. NO spoilers. Match the genre tone exactly.",
  "shortHook": "One punchy sentence (15-25 words) that captures the entire book's premise and emotional hook. Perfect for ads.",
  "tiktokHooks": [
    "POV hook (starts with 'POV:')",
    "Emotional hook (starts with a feeling or dramatic statement)",
    "Curiosity hook (starts with 'What if' or a provocative question)",
    "Story hook (starts mid-action)"
  ],
  "instagramCaption": "Instagram caption 80-120 words. Conversational, emotional, ends with a CTA like 'Link in bio to listen free'. Include 5 relevant hashtags at the end.",
  "tweetThread": [
    "Tweet 1: Hook tweet that makes people want to read more (max 280 chars)",
    "Tweet 2: The premise / setup (max 280 chars)",
    "Tweet 3: The stakes / conflict (max 280 chars)",
    "Tweet 4: CTA + where to find it (max 280 chars)"
  ],
  "goodreadsBlurb": "Goodreads-style blurb, 100-150 words. Third person, present tense. Focuses on the protagonist and their central conflict. Matches genre expectations."
}`

    // Try Anthropic first, fall back to OpenRouter
    let content = ''
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openrouterKey = process.env.OPENROUTER_API_KEY

    if (!anthropicKey && !openrouterKey) {
      return Response.json({ error: 'AI API keys not configured on this server. Add ANTHROPIC_API_KEY or OPENROUTER_API_KEY to Vercel environment variables.' }, { status: 500 })
    }

    if (anthropicKey) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic({ apiKey: anthropicKey })
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })
      content = message.content[0].type === 'text' ? message.content[0].text : ''
    } else {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      content = data.choices?.[0]?.message?.content || ''
    }

    // Parse JSON — strip any markdown fences
    const cleaned = content.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
    const blurbs = JSON.parse(cleaned)

    return Response.json({ blurbs })
  } catch (err) {
    console.error('[blurbs] Error:', err)
    return Response.json({ error: 'Failed to generate blurbs' }, { status: 500 })
  }
}
