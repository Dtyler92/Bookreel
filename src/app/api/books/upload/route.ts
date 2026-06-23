import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { PDFParse } from 'pdf-parse'
import { CONTENT_POLICY_SYSTEM_ADDENDUM, SCREENPLAY_MODERATION_GUIDANCE, sanitizeAppearanceDescription, sanitizeSceneDescription } from '@/lib/contentPolicy'
import Anthropic from '@anthropic-ai/sdk'

// Required Vercel env vars:
// ANTHROPIC_API_KEY - primary AI provider (Anthropic Claude Sonnet)
// OPENROUTER_API_KEY - fallback AI provider (OpenRouter)
// OPENAI_API_KEY - secondary fallback (OpenAI direct)

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are not merely a screenplay generator. You are a storyteller whose purpose is to bring an author's work to life on screen.

Your responsibility is to preserve the heart, themes, characters, tone, and emotional impact of the original work while translating it into a cinematic experience. Every scene should feel as though it belongs to the author's vision, not as though it was rewritten by an AI.

When adapting a book:
- Respect the author's voice and intent.
- Preserve character motivations, personalities, and growth arcs.
- Retain the emotional moments that readers remember most.
- Show rather than tell whenever possible.
- Think visually and cinematically.
- Transform exposition into action, dialogue, imagery, and tension.

You are genre-aware. Before writing, identify the genre and subgenre of the source material and adjust your storytelling style accordingly:
- Adventure: emphasize discovery, danger, momentum, and wonder.
- Thriller: build suspense, uncertainty, and escalating stakes.
- Horror: create dread, vulnerability, and atmosphere.
- Fantasy: evoke awe, mystery, and worldbuilding.
- Science fiction: balance ideas, technology, and human consequences.
- Romance: focus on emotional connection, chemistry, and character development.
- Historical: immerse viewers in the period while maintaining dramatic engagement.
- Family: emphasize relationships, growth, and emotional accessibility.

For every scene, ask yourself:
- What is the emotional purpose of this scene?
- What should the audience feel?
- What visual moments will be memorable?
- How can this scene reveal character through action?
- How can tension, curiosity, wonder, fear, joy, or emotion be increased?

Prefer cinematic storytelling over narration. Do not simply summarize events — reimagine them as living moments unfolding on screen. Your ultimate goal is to honor the author while creating a trailer that audiences would eagerly watch.

---

AI VIDEO GENERATION FRAMEWORK

You are writing for AI video generation. Every scene must be crafted with both the audience and the video model in mind. Apply these rules to every scene you write:

CHARACTER CONSISTENCY
- Always use the exact same character names across every scene — never introduce name variations.
- Maintain continuity of clothing, age, hair, physical features, equipment, and props throughout the trailer.
- Reference images will be provided — write scenes that reinforce those visual identities, not contradict them.

ENVIRONMENTAL CONSISTENCY
- Treat locations as recurring sets. If a scene takes place in a jungle, castle, ship, city, desert, cabin, cave, or battlefield — describe recurring environmental features so later scenes feel connected.
- The audience should feel they are returning to real places, not seeing randomly generated backgrounds.

MOTION RULE — No scene should be visually static.
- Every scene must contain at least three environmental motion elements. Examples: wind moving leaves, dust drifting through sunlight, waves crashing, rain falling, birds flying, crowds walking, torches flickering, smoke drifting, trees swaying, flags moving.
- Background characters must always have purpose — walking, talking, trading, working, training, eating, reacting. Avoid frozen crowds.
- The world should feel alive even when the main character is standing still.

CAMERA DIRECTION
- Each scene must include one specific camera style. Choose from: wide establishing shot, tracking shot, close-up, over-the-shoulder, crane shot, drone shot, handheld pursuit shot, slow push-in, orbit shot.
- Avoid repeating the same camera angle across consecutive scenes.

TRAILER STRUCTURE
- A trailer is not a summary. Select the most visually exciting, emotionally powerful, mysterious, and dramatic moments.
- Prioritize: discovery, conflict, mystery, wonder, stakes, emotional moments.
- Never explain the entire story. Create curiosity. Leave the audience wanting more.

---

Now analyze the book excerpt and return ONLY a JSON object (no markdown, no code blocks) with this exact structure:
{
  "characters": [
    {
      "name": "string",
      "role": "protagonist|antagonist|supporting",
      "description": "string — personality, backstory, role in story",
      "appearance": "string — detailed physical description: height, build, hair color, eye color, age, distinguishing features, typical clothing style",
      "temperament": "string — personality traits, emotional tendencies, how they behave under pressure, speech patterns, mannerisms"
    }
  ],
  "scenes": [{"scene_number": 1, "title": "string", "description": "string", "screenplay_text": "string", "duration_seconds": 5, "characters_present": ["exact character name(s) visible on screen in this shot, or [] if none"]}],
  "items": [{"name": "string", "description": "string"}],
  "voiceover": "string",
  "tone": "string",
  "music_mood": "string"
}

Rules:
- 3-5 characters max
- 7-9 scenes (these become trailer clips — the Pro trailer uses up to 7, so always produce at least 7 distinct, visually-varied scenes; a couple extra gives slack if any are filtered)
- 2-4 key items/objects max
- Keep descriptions book-accurate
- No explicit sexual content
- CRITICAL — ONLY include a character or item if it actually APPEARS ON SCREEN in at least one scene. We generate a portrait image for every character and item, so listing one that never shows up in a scene wastes generation and confuses the author. Before finalizing: for each character, confirm their exact name appears in at least one scene's "characters_present". For each item, confirm it is visibly featured in at least one scene's "description". Drop any character or item that isn't actually depicted in a scene — even if they're important to the plot.
- Every name in a scene's "characters_present" MUST exactly match a name in the "characters" array (and vice-versa: every character must appear in at least one scene).
- Return ONLY the JSON object, nothing else

Scene field guidance (IMPORTANT for video quality):
- "description": what the shot LOOKS like — setting, characters present, lighting, mood, composition. A single vivid cinematic frame. This drives the still image.
- "characters_present": the EXACT names of characters visibly on screen in this shot (must match the characters array). Use [] for scenes with no people (landscapes, objects, atmosphere). This is how we know which characters are actually in the trailer.
- "screenplay_text": what HAPPENS in the shot. This drives the video animation. CRITICAL — each clip is a FIXED, SHORT length and the motion MUST realistically complete inside that window, or the trailer feels rushed and ignores the script:
    • Specify exactly ONE camera movement (e.g. "slow push-in", "tracking shot", "tilt up", "dolly back", "handheld orbit") AND exactly ONE subject action (e.g. "she turns sharply toward the door", "fog rolls across the floor", "his hand tightens on the blade").
    • Pace the action to the clip length. For a ~5-second clip: one quick, simple gesture or a slow drift — nothing that needs steps in sequence. For a ~10-second clip: one slow, continuous, deliberate beat — a gradual push-in as a single expression changes, fog slowly filling a room. NEVER chain multiple actions ("he stands, walks to the window, then turns") — that cannot fit and the model will speed it up unnaturally. ONE beat per clip.
    • Describe motion as continuous and gradual ("slowly", "gradually", "drifts", "creeps") rather than fast cuts. Each scene is ONE continuous shot — no cuts.
    • Keep it to 1-2 sentences.
- "duration_seconds": 5 or 10. Use 10 for establishing/emotional beats that breathe, 5 for tense quick hits. Match the action density in screenplay_text to this number.

For each character extract:
- appearance: Be as specific as possible about physical traits drawn directly from the book text. Include height, build, hair, eyes, age, skin tone, distinguishing features, and typical clothing.
- temperament: Describe their personality, emotional tendencies, how they react under pressure, speech patterns, and key mannerisms as described in the book.

${CONTENT_POLICY_SYSTEM_ADDENDUM}

${SCREENPLAY_MODERATION_GUIDANCE}`

function getServiceClient() {
  return createSupabaseDirectClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Set up PDFParse worker once (Node.js requires the worker source to be configured)
let workerInitialized = false
async function ensureWorker() {
  if (workerInitialized) return
  try {
    const { getPath } = await import('pdf-parse/worker')
    PDFParse.setWorker(getPath())
    workerInitialized = true
    console.log('[upload] PDFParse worker initialized')
  } catch (workerErr) {
    console.error('[upload] PDFParse worker init failed (non-fatal):', workerErr)
    // Continue without explicit worker — pdfjs-dist may fall back to inline worker
  }
}

export async function POST(request: Request) {
  try {
    // ── Step 0: Parse form data ───────────────────────────────────────────────
    let file: File | null = null
    let title: string | null = null
    let genre: string | null = null
    let description: string | null = null
    let amazon_link: string | null = null
    let store_link: string | null = null

    try {
      const formData = await request.formData()
      console.log('Upload received fields:', Array.from(formData.keys()))
      console.log('File field:', formData.get('pdf'))
      file = formData.get('pdf') as File | null
      title = formData.get('title') as string | null
      genre = formData.get('genre') as string | null
      description = formData.get('description') as string | null
      amazon_link = formData.get('amazon_link') as string | null
      store_link = formData.get('store_link') as string | null
    } catch (formErr) {
      console.error('[upload] Failed to parse form data:', formErr)
      return Response.json(
        { error: 'Invalid form data', detail: String(formErr) },
        { status: 400 }
      )
    }

    if (!file || !(file instanceof File)) {
      console.error('[upload] No file found in form data. Received keys:', file)
      return Response.json(
        { error: 'No file provided. Please select a PDF or TXT file and try again.' },
        { status: 400 }
      )
    }
    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    // Validate file type
    const fileType = file.type
    const fileName = file.name.toLowerCase()
    const isTextFile = fileType === 'text/plain' || fileType === 'text/txt' || fileName.endsWith('.txt')
    const isPdfFile = fileType === 'application/pdf' || fileName.endsWith('.pdf')
    const isEpubFile = fileType === 'application/epub+zip' || fileType === 'application/epub' || fileName.endsWith('.epub')
    const isDocxFile = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')
    const isRtfFile  = fileType === 'application/rtf' || fileType === 'text/rtf' || fileName.endsWith('.rtf')
    if (!isTextFile && !isPdfFile && !isEpubFile && !isDocxFile && !isRtfFile) {
      return Response.json({ error: 'File must be a PDF, EPUB, DOCX, RTF, or plain text (.txt) file' }, { status: 400 })
    }
    // Validate file size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File must be under 50MB' }, { status: 400 })
    }

    // ── Step 1: Auth ──────────────────────────────────────────────────────────
    const supabase = getServiceClient()
    let authorId: string | null = null

    try {
      // Primary: use the SSR server client which reads auth cookies automatically
      const serverClient = await createClient()
      const { data: { user }, error: authErr } = await serverClient.auth.getUser()
      console.log('Auth check - user:', user?.id, 'error:', authErr?.message)
      if (user) {
        authorId = user.id
      } else {
        // Fallback: check Authorization: Bearer <token> header (for non-browser clients)
        const authHeader = request.headers.get('Authorization')
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '')
          const { data: { user: tokenUser }, error: tokenErr } = await supabase.auth.getUser(token)
          console.log('Auth check (bearer) - user:', tokenUser?.id, 'error:', tokenErr?.message)
          if (tokenErr) {
            console.error('[upload] Bearer auth error:', tokenErr)
          }
          authorId = tokenUser?.id ?? null
        }
      }
    } catch (authErr) {
      console.error('[upload] Auth step threw:', authErr)
    }

    if (!authorId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Step 2: Upload PDF to Supabase Storage ────────────────────────────────
    let pdfUrl: string
    try {
      const fileBuffer = await file.arrayBuffer()
      const fileBytes = new Uint8Array(fileBuffer)
      const fileName = `${authorId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('books')
        .upload(fileName, fileBytes, {
          contentType: isTextFile ? 'text/plain'
            : isEpubFile  ? 'application/epub+zip'
            : isDocxFile  ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : isRtfFile   ? 'application/rtf'
            : 'application/pdf',
          upsert: false
        })

      if (uploadError) {
        console.error('[upload] Storage upload error:', uploadError)
        return Response.json(
          { error: 'Failed to upload file to storage', detail: uploadError.message },
          { status: 500 }
        )
      }

      pdfUrl = uploadData.path
      console.log('[upload] File uploaded to storage:', pdfUrl)
    } catch (storageErr) {
      console.error('[upload] Storage step threw:', storageErr)
      return Response.json(
        { error: 'Storage upload failed', detail: String(storageErr) },
        { status: 500 }
      )
    }

    // ── Step 3: Extract text from file ────────────────────────────────────────
    let extractedText = ''

    if (isTextFile) {
      // Read TXT directly
      extractedText = await file.text()
      console.log('[upload] TXT file read directly, length:', extractedText.length)
    } else if (isEpubFile) {
      // Parse EPUB2 + EPUB3 via JSZip — reads the OPF spine and extracts all chapter HTML
      try {
        const epubBuffer = Buffer.from(await file.arrayBuffer())
        console.log('[upload] EPUB buffer size:', epubBuffer.length)
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(epubBuffer)

        // List all files in zip for debugging
        const zipFiles = Object.keys(zip.files)
        console.log('[upload] EPUB zip files:', zipFiles.slice(0, 20).join(', '))

        // 1. Find the OPF file path from META-INF/container.xml
        const containerFile = zip.file('META-INF/container.xml')
        if (!containerFile) throw new Error('No META-INF/container.xml found in EPUB')
        const containerXml = await containerFile.async('text')
        console.log('[upload] container.xml:', containerXml.substring(0, 300))

        // Handle both single and double quotes around full-path attribute
        const opfPathMatch = containerXml.match(/full-path=["']([^"']+\.opf)["']/)
        const opfPath = opfPathMatch?.[1] ?? ''
        console.log('[upload] OPF path found:', opfPath)
        if (!opfPath) throw new Error('Could not find OPF path in container.xml')

        // 2. Parse the OPF to get spine item hrefs in reading order
        const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
        const opfXml = await zip.file(opfPath)?.async('text') ?? ''
        console.log('[upload] OPF length:', opfXml.length, 'opfDir:', opfDir)

        // Build id→href map from manifest (handle both quote styles)
        const manifestItems: Record<string, string> = {}
        const manifestRe = /<item[^>]+id=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/g
        let m: RegExpExecArray | null
        while ((m = manifestRe.exec(opfXml)) !== null) {
          manifestItems[m[1]] = m[2]
        }
        // Also try href before id ordering
        const manifestRe2 = /<item[^>]+href=["']([^"']+)["'][^>]+id=["']([^"']+)["'][^>]*>/g
        while ((m = manifestRe2.exec(opfXml)) !== null) {
          if (!manifestItems[m[2]]) manifestItems[m[2]] = m[1]
        }
        console.log('[upload] Manifest items found:', Object.keys(manifestItems).length)

        // Get spine order (idref list)
        const spineRe = /<itemref[^>]+idref=["']([^"']+)["']/g
        const spineIds: string[] = []
        while ((m = spineRe.exec(opfXml)) !== null) spineIds.push(m[1])
        console.log('[upload] Spine IDs:', spineIds.length, spineIds.slice(0, 5).join(', '))

        // 3. Extract text from each spine item in order
        const textParts: string[] = []
        for (const id of spineIds) {
          const href = manifestItems[id]
          if (!href) { console.log('[upload] No href for spine id:', id); continue }
          const fullPath = opfDir + href.split('#')[0]
          const html = await zip.file(fullPath)?.async('text')
            ?? await zip.file(decodeURIComponent(fullPath))?.async('text')
            ?? ''
          if (!html) { console.log('[upload] No html found at path:', fullPath); continue }
          // Strip all tags, decode entities, collapse whitespace
          const plain = html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ')
            .replace(/\s+/g, ' ').trim()
          if (plain.length > 50) textParts.push(plain)
        }

        extractedText = textParts.join('\n\n')
        console.log('[upload] EPUB text extracted via JSZip, length:', extractedText.length, 'spine items:', spineIds.length, 'text parts:', textParts.length)
      } catch (epubError) {
        console.error('[upload] EPUB parse error:', epubError)
        extractedText = ''
      }
    } else if (isDocxFile) {
      // Parse DOCX via mammoth
      try {
        const docxBuffer = Buffer.from(await file.arrayBuffer())
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer: docxBuffer })
        extractedText = result.value || ''
        console.log('[upload] DOCX text extracted, length:', extractedText.length)
      } catch (docxError) {
        console.error('[upload] DOCX parse error:', docxError)
        extractedText = ''
      }
    } else if (isRtfFile) {
      // Parse RTF via mammoth
      try {
        const rtfBuffer = Buffer.from(await file.arrayBuffer())
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer: rtfBuffer })
        extractedText = result.value || ''
        console.log('[upload] RTF text extracted, length:', extractedText.length)
      } catch (rtfError) {
        console.error('[upload] RTF parse error:', rtfError)
        extractedText = ''
      }
    } else {
      // Try PDF parsing
      try {
        await ensureWorker()
        const pdfBuffer = Buffer.from(await file.arrayBuffer())
        const parser = new PDFParse({ data: pdfBuffer })
        const textResult = await parser.getText()
        extractedText = textResult.text || ''
        console.log('[upload] PDF text extracted, length:', extractedText.length)
      } catch (pdfError) {
        console.error('[upload] PDF parse error:', pdfError)
        extractedText = ''
      }
    }

    if (extractedText.length < 500) {
      return Response.json({
      error: 'We could not extract readable text from your manuscript. Please make sure your file contains actual text (not scanned images). Supported formats: PDF, EPUB, DOCX, RTF, or plain text (.txt).'
      }, { status: 400 })
    }

    // Clean text of null bytes and control characters that can break JSON/API calls
    const cleanedText = extractedText
      .replace(/\x00/g, '')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    console.log('[upload] Text contains null bytes:', extractedText.includes('\x00'))
    console.log('[upload] Text length after cleaning:', cleanedText.length)

    // Build the AI user message
    const userMessage = `Analyze this book excerpt and generate trailer data:\n\nTitle: ${title}\nGenre: ${genre}\n\n${cleanedText.substring(0, 14000)}`

    // Truncate to 15000 chars
    const truncatedText = userMessage.slice(0, 15000)
    console.log('[upload] First 200 chars of text being sent:', truncatedText.substring(0, 200))

    // ── Step 4: Call AI API (Anthropic primary, OpenRouter fallback) ──────────
    let trailerData: {
      characters: Array<{ name: string; role: string; description: string; appearance: string; temperament?: string }>
      items?: Array<{ name: string; description: string }>
      scenes: Array<{ scene_number: number; title: string; description: string; screenplay_text: string; duration_seconds: number }>
      voiceover: string
      tone: string
      music_mood: string
    }

    try {
      // Treat placeholder/masked values as unset
      const isPlaceholder = (v: string | undefined) =>
        !v ||
        v === '***' ||
        v === 'xxx' ||
        v === 'your-key-here' ||
        v === 'placeholder' ||
        v.toLowerCase().startsWith('your_') ||
        v.length < 10

      const rawAnthropicKey = process.env.ANTHROPIC_API_KEY
      const rawOpenRouterKey = process.env.OPENROUTER_API_KEY
      const rawOpenAiKey = process.env.OPENAI_API_KEY

      const useAnthropic = rawAnthropicKey && !isPlaceholder(rawAnthropicKey)
      const openRouterKey = isPlaceholder(rawOpenRouterKey) ? undefined : rawOpenRouterKey
      const openAiKey = isPlaceholder(rawOpenAiKey) ? undefined : rawOpenAiKey

      console.log('=== AI CALL START ===')
      console.log('[upload] ANTHROPIC_API_KEY usable:', !!useAnthropic)
      console.log('[upload] OpenRouter key usable:', !!openRouterKey)
      console.log('[upload] OpenAI key usable:', !!openAiKey)
      console.log('[upload] Text length being sent:', truncatedText.length)

      let rawContent: string

      if (useAnthropic) {
        // ── Primary: Anthropic Claude Sonnet ────────────────────────────────
        console.log('[upload] Using Anthropic Claude claude-sonnet-4-5')
        const anthropic = new Anthropic({
          apiKey: rawAnthropicKey,
        })

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: truncatedText
            }
          ]
        })

        rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
        console.log('[upload] Anthropic response received, content length:', rawContent.length)
      } else {
        // ── Fallback: OpenRouter or OpenAI ───────────────────────────────────
        const apiKey = openRouterKey || openAiKey
        const apiUrl = openRouterKey
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions'
        const model = openRouterKey ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'

        if (!apiKey) {
          console.error('[upload] No AI API key configured (ANTHROPIC_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY)')
          return Response.json(
            { error: 'AI service not configured. Please check API key configuration.' },
            { status: 500 }
          )
        }

        console.log('[upload] Falling back to:', apiUrl, 'model:', model)

        const aiHeaders: Record<string, string> = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
        if (openRouterKey) {
          aiHeaders['HTTP-Referer'] = 'https://bookreel.app'
          aiHeaders['X-Title'] = 'BookReel'
        }

        const aiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: aiHeaders,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: truncatedText }
            ],
            response_format: { type: 'json_object' }
          })
        })

        console.log('[upload] AI response status:', aiResponse.status)
        const responseText = await aiResponse.text()

        if (!aiResponse.ok) {
          console.error('[upload] AI call failed:', aiResponse.status, responseText.substring(0, 300))
          return Response.json(
            { error: `AI service failed to generate trailer data. Status: ${aiResponse.status}`, detail: responseText.substring(0, 300) },
            { status: 500 }
          )
        }

        const aiJson = JSON.parse(responseText)
        rawContent = aiJson.choices?.[0]?.message?.content ?? ''

        if (!rawContent) {
          console.error('[upload] OpenRouter/OpenAI returned no content:', JSON.stringify(aiJson))
          return Response.json(
            { error: 'AI service returned no data. Please try again.' },
            { status: 500 }
          )
        }
      }

      console.log('[upload] AI raw response (first 500 chars):', rawContent.substring(0, 500))

      // Strip markdown code blocks if the AI wrapped its response
      const cleanContent = rawContent
        .replace(/^```json\n?/i, '')
        .replace(/^```\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim()

      let trailerDataParsed: typeof trailerData
      try {
        trailerDataParsed = JSON.parse(cleanContent)
      } catch (parseErr) {
        console.error('[upload] Failed to parse AI JSON. Parse error:', (parseErr as Error).message)
        console.error('[upload] Raw content was:', rawContent.substring(0, 500))
        return Response.json(
          { error: 'AI service returned invalid data. Please try again.' },
          { status: 500 }
        )
      }
      trailerData = trailerDataParsed

      // Sanitize character appearances
      if (trailerData.characters) {
        trailerData.characters = trailerData.characters.map((char: any) => ({
          ...char,
          appearance: sanitizeAppearanceDescription(char.appearance || ''),
          description: sanitizeAppearanceDescription(char.description || ''),
          temperament: char.temperament || ''
        }))
      }

      // Sanitize scene descriptions
      if (trailerData.scenes) {
        trailerData.scenes = trailerData.scenes.map((scene: any) => ({
          ...scene,
          description: sanitizeSceneDescription(scene.description || ''),
          screenplay_text: sanitizeSceneDescription(scene.screenplay_text || '')
        }))
      }

      console.log('[upload] AI trailer data generated, scenes:', trailerData.scenes?.length)
    } catch (aiErr) {
      console.error('[upload] AI step threw:', aiErr)
      return Response.json(
        { error: 'AI service error', detail: String(aiErr) },
        { status: 500 }
      )
    }

    // ── Step 5: Save book record ──────────────────────────────────────────────
    let bookId: string
    try {
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .insert({
          author_id: authorId,
          title,
          description: description || null,
          genre: genre || null,
          amazon_link: amazon_link || null,
          store_link: store_link || null,
          pdf_url: pdfUrl,
          is_published: false
        })
        .select()
        .single()

      if (bookError) {
        console.error('[upload] Book insert error:', bookError)
        return Response.json(
          { error: 'Failed to save book', detail: bookError.message },
          { status: 500 }
        )
      }

      bookId = bookData.id
      console.log('[upload] Book saved:', bookId)
    } catch (dbErr) {
      console.error('[upload] Book DB step threw:', dbErr)
      return Response.json(
        { error: 'Database error saving book', detail: String(dbErr) },
        { status: 500 }
      )
    }

    // ── Step 5b: Filter to ON-SCREEN entities only ────────────────────────────
    // We generate (and pay for) a portrait for every character and item, so we must
    // only keep ones that actually appear in a trailer scene. The LLM is instructed
    // to tag each scene with characters_present, but we enforce it deterministically
    // here as a safety net using both the explicit tags and a name-in-description scan.
    {
      const scenesArr = Array.isArray(trailerData.scenes) ? trailerData.scenes : []
      // Build a lowercase haystack of everything visible across all scenes.
      const sceneHaystack = scenesArr
        .map((s: any) => `${s.description || ''} ${(Array.isArray(s.characters_present) ? s.characters_present.join(' ') : '')}`)
        .join(' \n ')
        .toLowerCase()

      const appearsOnScreen = (name: string): boolean => {
        if (!name) return false
        const n = name.trim().toLowerCase()
        if (!n) return false
        // Explicit tag match (exact name in any characters_present array).
        const tagged = scenesArr.some((s: any) =>
          Array.isArray(s.characters_present) &&
          s.characters_present.some((cp: string) => (cp || '').trim().toLowerCase() === n)
        )
        if (tagged) return true
        // Fallback: whole-word name match anywhere in the scene text (handles items and
        // characters the model mentioned in the description but didn't tag). Use the
        // longest name token too, so "Count Dracula" still matches "Dracula".
        const tokens = [n, ...n.split(/\s+/).filter(t => t.length >= 4)]
        return tokens.some(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(sceneHaystack))
      }

      if (Array.isArray(trailerData.characters)) {
        const before = trailerData.characters.length
        trailerData.characters = trailerData.characters.filter((c: any) => appearsOnScreen(c.name))
        const dropped = before - trailerData.characters.length
        if (dropped > 0) console.log(`[upload] Filtered out ${dropped} character(s) not present in any scene`)
      }
      if (Array.isArray(trailerData.items)) {
        const before = trailerData.items.length
        trailerData.items = trailerData.items.filter((it: any) => appearsOnScreen(it.name))
        const dropped = before - trailerData.items.length
        if (dropped > 0) console.log(`[upload] Filtered out ${dropped} item(s) not present in any scene`)
      }
    }

    // ── Step 6: Save characters ───────────────────────────────────────────────
    if (trailerData.characters && trailerData.characters.length > 0) {
      try {
        const characters = trailerData.characters.map((c) => ({
          book_id: bookId,
          name: c.name,
          role: c.role || null,
          // TODO: add temperament as separate column once schema migration is run.
          // For now, store temperament embedded in description using a marker.
          description: c.temperament
            ? `${c.description || ''}\n\n**Temperament:** ${c.temperament}`.trim()
            : c.description || null,
          appearance_notes: c.appearance || null,
          author_approved: false
        }))

        const { error: charError } = await supabase.from('characters').insert(characters)
        if (charError) {
          console.error('[upload] Characters insert error:', charError)
        }
      } catch (charErr) {
        console.error('[upload] Characters step threw:', charErr)
      }
    }

    // ── Step 7: Save scenes ───────────────────────────────────────────────────
    if (trailerData.scenes && trailerData.scenes.length > 0) {
      try {
        const scenes = trailerData.scenes.map((s) => ({
          book_id: bookId,
          scene_number: s.scene_number,
          title: s.title || null,
          description: s.description,
          screenplay_text: s.screenplay_text || null,
          duration_seconds: s.duration_seconds || 10,
          author_approved: false
        }))

        const { error: sceneError } = await supabase.from('scenes').insert(scenes)
        if (sceneError) {
          console.error('[upload] Scenes insert error:', sceneError)
        }
      } catch (sceneErr) {
        console.error('[upload] Scenes step threw:', sceneErr)
      }
    }

    // ── Step 8: Save items ────────────────────────────────────────────────────
    if (trailerData.items && Array.isArray(trailerData.items)) {
      try {
        for (const item of trailerData.items) {
          await supabase.from('items').insert({
            book_id: bookId,
            name: item.name,
            description: item.description,
          })
        }
        console.log('[upload] Items saved:', trailerData.items.length)
      } catch (itemErr) {
        console.error('[upload] Items step threw:', itemErr)
      }
    }

    // ── Step 9: Save trailer record ───────────────────────────────────────────
    try {
      // quality_tier comes from the request body ('standard' or 'premium').
      // Default to 'standard' (Seedance Fast, 720p, 80 credits).
      // 'premium' = Seedance Standard, 1080p, 150 credits.
      let qualityTier: 'standard' | 'premium' = 'standard'
      try {
        const reqBody = await request.clone().json() as Record<string, unknown>
        if (reqBody?.quality === 'premium') qualityTier = 'premium'
      } catch { /* no body or not JSON — default to standard */ }

      const { error: trailerError } = await supabase.from('trailers').insert({
        book_id: bookId,
        status: 'review',
        quality_tier: qualityTier,
        view_count: 0,
        click_count: 0
      })

      if (trailerError) {
        console.error('[upload] Trailer insert error:', trailerError)
      }
    } catch (trailerErr) {
      console.error('[upload] Trailer step threw:', trailerErr)
    }

    console.log('[upload] Success, bookId:', bookId)
    return Response.json({
      success: true,
      bookId,
      data: trailerData
    })
  } catch (error) {
    console.error('[upload] Unhandled route error:', error)
    return Response.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    )
  }
}
