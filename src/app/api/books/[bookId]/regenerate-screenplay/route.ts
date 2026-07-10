import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { PDFParse } from 'pdf-parse'
import {
  CONTENT_POLICY_SYSTEM_ADDENDUM,
  SCREENPLAY_MODERATION_GUIDANCE,
  sanitizeAppearanceDescription,
  sanitizeSceneDescription,
} from '@/lib/contentPolicy'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 120

// Re-uses the same SYSTEM_PROMPT as /api/books/upload so it's always in sync
const SYSTEM_PROMPT = `You are a cinematic book trailer writer for BookReel.

Your job is not to turn the novel into a full movie scene. Your job is to turn the novel into a cinematic, voiceover-driven book trailer that sells the emotion, genre, hook, and reading experience of the book.

Core goal: Make the viewer think, "That looks like the kind of book I want to read."

THE TRAILER APPROACH — HYBRID VOICEOVER-DRIVEN FORMAT
Voiceover narration carries the story. Cinematic visual shots support the mood, tension, character, genre, and stakes. The trailer should feel like a cinematic audiobook blurb with powerful visuals.

Do NOT write a dry plot summary.
Do NOT write a fake movie scene with long dialogue, complicated acting, or multi-step action.
Do NOT reveal the whole plot. Create curiosity. Leave the audience wanting more.

TRAILER STRUCTURE — follow this arc every time:
1. Opening hook — A strong, intriguing line. Never start with "This book is about..."
   Examples: "Nate Colt thought the past was buried. He was wrong." / "Some secrets do not stay dead." / "In a town built on silence, one truth could destroy everything."
2. Setup — Briefly introduce the main character, world, and situation. Simple and emotionally charged.
3. Conflict — Show what disrupts the character's life. Voiceover explains, visuals create atmosphere.
4. Escalation — Raise the stakes. Show danger, romance, mystery, betrayal, discovery, or fear.
5. Emotional question — End the main body with unresolved tension.
   Examples: "But some truths cost more than survival." / "The closer he gets to the truth, the less he knows who to trust."
6. Title card — Book title, author name, and a simple call to action: "Available now." / "Read it today."

VOICEOVER RULES
- Write like a trailer, not a book report.
- Keep sentences short and dramatic. Use rhythm. Create curiosity.
- Focus on: who the story follows, what changes, what danger or desire drives it, what the emotional stakes are.

GENRE AWARENESS — adjust language and visuals to match:
- Mystery/thriller: secrets, clues, suspicion, shadows, danger, betrayal, unanswered questions
- Romance: longing, distance, glances, almost-touch moments, emotional conflict, choice, heartbreak, hope
- Fantasy: wonder, ancient power, prophecy, forbidden magic, strange lands, destiny
- Horror: dread, isolation, unnatural movement, darkness, silence, things half-seen
- Adventure: movement, maps, ruins, trains, ships, storms, pursuit, discovery, courage
- Historical fiction: period clothing, letters, streets, parlors, trains, farms, battlefields
- Science fiction: technology, scale, isolation, futuristic environments, survival, discovery
- Drama: emotional realism, family tension, regret, memory, change, sacrifice

AI VIDEO SHOT RULES — every scene must be written for what AI video can realistically generate:

GOOD AI-VIDEO ACTIONS (use these):
- A character slowly turns toward a sound
- A woman looks through rain-covered glass
- A man studies an old letter
- A train pulls away at night
- A candle flickers in a dark room
- A shadow moves across a wall
- A character walks slowly through fog
- A hand touches an old map
- A close-up of worried eyes
- A door opens slightly
- Wind moves through trees
- Smoke, rain, firelight, dust, or mist adds motion

AVOID THESE (AI video cannot do them well):
- Complex fights or choreographed movement
- Long conversations or precise lip-sync
- Characters handing objects to each other
- Crowds doing specific actions
- Multiple characters interacting physically
- Multiple actions chained in one shot (entering, crossing room, picking something up, speaking — all in one)

If an action is complex, BREAK IT INTO SEPARATE SHOTS:
Instead of: "Nate hands Jackie the letter."
Use: Shot 1: Nate holds a sealed letter. / Shot 2: Close-up of the letter. / Shot 3: Jackie's face as she reads. / Shot 4: Her expression changes.

SCENE VISUAL REQUIREMENTS — for every shot include:
- Shot type: close-up, medium shot, wide shot, establishing shot, or detail shot
- Subject: who or what is on screen
- Action: ONE simple movement or moment only
- Setting: where it happens
- Lighting: candlelight, moonlight, sunset, storm light, neon, etc.
- Mood: suspenseful, romantic, ominous, adventurous, tragic, eerie, hopeful, etc.
- Camera movement: slow push-in, locked-off, slow tracking, handheld tension, aerial establishing, etc.

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
- 12-15 scenes (these become trailer clips — the Premium trailer uses up to 60s of content, Standard uses 4 clips × 5s = 20s; always produce at least 12 distinct, visually-varied scenes with clear dramatic progression; extras give slack if any are filtered for content)
- 2-4 key items/objects max
- Keep descriptions book-accurate
- No explicit sexual content
- CRITICAL — ONLY include a character or item if it actually APPEARS ON SCREEN in at least one scene. We generate a portrait image for every character and item, so listing one that never shows up in a scene wastes generation and confuses the author. Before finalizing: for each character, confirm their exact name appears in at least one scene's "characters_present". For each item, confirm it is visibly featured in at least one scene's "description". Drop any character or item that isn't actually depicted in a scene — even if they're important to the plot.
- Every name in a scene's "characters_present" MUST exactly match a name in the "characters" array (and vice-versa: every character must appear in at least one scene).

SCENE DURATION RULES — set duration_seconds to either 5 or 10 per scene:
- 5 seconds: fast-cut action, combat, chase, explosions, reveals, jump-cuts, shocking moments, quick emotional reactions, rapid-fire montage beats. Short because the energy is in the speed.
- 10 seconds: sweeping landscapes, atmospheric world-building, slow emotional beats, intimate character moments, awe-inspiring vistas, mystery/tension builds, scenes where the camera needs time to breathe and the audience needs time to absorb what they're seeing.
- A great trailer mixes both. Aim for roughly 60% at 5s and 40% at 10s — but always let the scene type decide, not the ratio.
- The Standard trailer only uses the first 4 scenes and ignores duration_seconds (always renders them at 5s). The Premium trailer reads your duration_seconds values and uses them as-is, summing toward a ~60s target.
- Return ONLY the JSON object, nothing else

Scene field guidance (IMPORTANT for video quality):
- "description": what the shot LOOKS like — setting, characters present, lighting, mood, composition. A single vivid cinematic frame. This drives the still image.
- "characters_present": the EXACT names of characters visibly on screen in this shot (must match the characters array). Use [] for scenes with no people (landscapes, objects, atmosphere). This is how we know which characters are actually in the trailer.
- "screenplay_text": what HAPPENS in the shot. This drives the video animation. CRITICAL — each clip is a FIXED, SHORT length and the motion MUST realistically complete inside that window, or the trailer feels rushed and ignores the script:
    • Specify exactly ONE camera movement (e.g. "slow push-in", "tracking shot", "tilt up", "dolly back", "handheld orbit") AND exactly ONE subject action (e.g. "she turns sharply toward the door", "fog rolls across the floor", "his hand tightens on the blade").
    • Pace the action to the clip length. For a ~5-second clip: one quick, simple gesture or a slow drift — nothing that needs steps in sequence. For a ~10-second clip: one slow, continuous, deliberate beat — a gradual push-in as a single expression changes, fog slowly filling a room. NEVER chain multiple actions ("he stands, walks to the window, then turns") — that cannot fit and the model will speed it up unnaturally. ONE beat per clip.
    • Describe motion as continuous and gradual ("slowly", "gradually", "drifts", "creeps") rather than fast cuts. Each scene is ONE continuous shot — no cuts.
    • Keep it to 1-2 sentences.

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

let workerInitialized = false
async function ensureWorker() {
  if (workerInitialized) return
  try {
    const { getPath } = await import('pdf-parse/worker')
    PDFParse.setWorker(getPath())
    workerInitialized = true
  } catch {
    // non-fatal — pdfjs-dist may fall back to inline worker
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    // Auth
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getServiceClient()

    // Fetch book + verify ownership
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, author_id, title, genre, pdf_url')
      .eq('id', bookId)
      .single()

    if (bookError || !book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })
    if (!book.pdf_url) return Response.json({ error: 'No manuscript file found for this book. Please re-upload to regenerate the screenplay.' }, { status: 400 })

    console.log(`[regen-screenplay] Starting for bookId=${bookId} title="${book.title}" pdf_url="${book.pdf_url}"`)

    // Download manuscript from Supabase storage using the stored path
    let extractedText = ''
    try {
      const storagePath = book.pdf_url
      const isEpub = storagePath.toLowerCase().endsWith('.epub')
      const isRtf  = storagePath.toLowerCase().endsWith('.rtf')
      const isTxt  = storagePath.toLowerCase().endsWith('.txt')

      // Try storage download first (path-based), fall back to direct URL fetch
      let fileBuffer: Buffer | null = null

      // If it looks like a storage path (no http), download via Supabase storage
      if (!storagePath.startsWith('http')) {
        // Determine bucket — upload-url route uses 'books', legacy used 'media'
        for (const bucket of ['books', 'media']) {
          const { data: fileData, error: dlErr } = await supabase.storage
            .from(bucket)
            .download(storagePath)
          if (!dlErr && fileData) {
            fileBuffer = Buffer.from(await fileData.arrayBuffer())
            console.log(`[regen-screenplay] Downloaded from bucket "${bucket}", size: ${fileBuffer.length}`)
            break
          }
        }
      } else {
        // Full URL — fetch directly
        const res = await fetch(storagePath)
        if (res.ok) fileBuffer = Buffer.from(await res.arrayBuffer())
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File download returned empty buffer')
      }

      if (isEpub) {
        // EPUB: extract text from XML content inside the zip
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(fileBuffer)
        const textParts: string[] = []
        const htmlFiles = Object.keys(zip.files).filter(f =>
          f.endsWith('.html') || f.endsWith('.xhtml') || f.endsWith('.htm') || f.endsWith('.xml')
        ).sort()
        for (const fname of htmlFiles) {
          const content = await zip.files[fname].async('string')
          // Strip HTML/XML tags
          textParts.push(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        }
        extractedText = textParts.join('\n\n')
        console.log(`[regen-screenplay] EPUB text extracted, length: ${extractedText.length}`)
      } else if (isTxt || isRtf) {
        extractedText = fileBuffer.toString('utf-8').replace(/[\\{}]/g, ' ')
        console.log(`[regen-screenplay] Text file extracted, length: ${extractedText.length}`)
      } else {
        // PDF
        await ensureWorker()
        const parser = new PDFParse({ data: fileBuffer })
        const textResult = await parser.getText()
        extractedText = textResult.text || ''
        console.log(`[regen-screenplay] PDF text extracted, length: ${extractedText.length}`)
      }
    } catch (pdfErr) {
      console.error('[regen-screenplay] File parse error:', pdfErr)
      return Response.json({ error: 'Failed to read manuscript file. The original file may have been deleted — please re-upload your book to regenerate the screenplay.' }, { status: 500 })
    }

    if (extractedText.length < 500) {
      return Response.json({ error: 'Could not extract enough text from the manuscript PDF.' }, { status: 400 })
    }

    const cleanedText = extractedText.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    const userMessage = `Analyze this book excerpt and generate trailer data:\n\nTitle: ${book.title}\nGenre: ${book.genre}\n\n${cleanedText.substring(0, 14000)}`
    const truncatedText = userMessage.slice(0, 15000)

    // Call Claude (same logic as upload route)
    const isPlaceholder = (v: string | undefined) =>
      !v || v === '***' || v === 'xxx' || v === 'your-key-here' || v === 'placeholder' ||
      v.toLowerCase().startsWith('your_') || v.length < 10

    const rawAnthropicKey = process.env.ANTHROPIC_API_KEY
    const rawOpenRouterKey = process.env.OPENROUTER_API_KEY
    const useAnthropic = rawAnthropicKey && !isPlaceholder(rawAnthropicKey)
    const openRouterKey = isPlaceholder(rawOpenRouterKey) ? undefined : rawOpenRouterKey

    let rawContent: string

    if (useAnthropic) {
      const anthropic = new Anthropic({ apiKey: rawAnthropicKey })
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: truncatedText }],
      })
      rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    } else {
      const apiKey = openRouterKey
      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
      if (!apiKey) return Response.json({ error: 'AI service not configured.' }, { status: 500 })

      const aiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bookreel.app',
          'X-Title': 'BookReel',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: truncatedText },
          ],
          response_format: { type: 'json_object' },
        }),
      })
      if (!aiRes.ok) return Response.json({ error: 'AI service failed.' }, { status: 500 })
      const aiJson = await aiRes.json()
      rawContent = aiJson.choices?.[0]?.message?.content ?? ''
    }

    // Parse JSON
    let trailerData: any
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      trailerData = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent)
    } catch {
      return Response.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 })
    }

    // Sanitize
    if (trailerData.characters) {
      trailerData.characters = trailerData.characters.map((c: any) => ({
        ...c,
        appearance: sanitizeAppearanceDescription(c.appearance || ''),
        description: sanitizeAppearanceDescription(c.description || ''),
        temperament: c.temperament || '',
      }))
    }
    if (trailerData.scenes) {
      trailerData.scenes = trailerData.scenes.map((s: any) => ({
        ...s,
        description: sanitizeSceneDescription(s.description || ''),
        screenplay_text: sanitizeSceneDescription(s.screenplay_text || ''),
      }))
    }

    // Filter characters/items to only on-screen entities
    const scenesArr: any[] = trailerData.scenes || []
    const sceneHaystack = scenesArr.map(s =>
      `${s.description || ''} ${(s.characters_present || []).join(' ')}`.toLowerCase()
    ).join(' ')

    if (trailerData.characters) {
      trailerData.characters = trailerData.characters.filter((c: any) => {
        const tagged = scenesArr.some((s: any) =>
          (s.characters_present || []).some((n: string) => n.toLowerCase() === c.name.toLowerCase())
        )
        const mentioned = sceneHaystack.includes(c.name.toLowerCase())
        return tagged || mentioned
      })
    }
    if (trailerData.items) {
      trailerData.items = trailerData.items.filter((item: any) =>
        sceneHaystack.includes(item.name.toLowerCase())
      )
    }

    // ── Delete old scenes, characters, items — then insert fresh ones ──────────
    await supabase.from('scenes').delete().eq('book_id', bookId)
    await supabase.from('characters').delete().eq('book_id', bookId)
    await supabase.from('items').delete().eq('book_id', bookId)

    // Reset trailer images_approved flag so author re-reviews new characters
    await supabase.from('trailers').update({ images_approved: false }).eq('book_id', bookId)

    // Insert new characters
    if (trailerData.characters?.length > 0) {
      const characters = trailerData.characters.map((c: any) => ({
        book_id: bookId,
        name: c.name,
        role: c.role || 'supporting',
        description: `${c.description || ''}\n\n**Temperament:** ${c.temperament || ''}`.trim(),
        appearance_notes: c.appearance || '',
        author_approved: false,
      }))
      await supabase.from('characters').insert(characters)
    }

    // Insert new items
    if (trailerData.items?.length > 0) {
      const items = trailerData.items.map((item: any) => ({
        book_id: bookId,
        name: item.name,
        description: item.description || '',
        author_approved: false,
      }))
      await supabase.from('items').insert(items)
    }

    // Insert new scenes
    if (trailerData.scenes?.length > 0) {
      const scenes = trailerData.scenes.map((s: any) => ({
        book_id: bookId,
        scene_number: s.scene_number,
        title: s.title || null,
        description: s.description,
        screenplay_text: s.screenplay_text || null,
        duration_seconds: s.duration_seconds || 5,
        author_approved: false,
      }))
      await supabase.from('scenes').insert(scenes)
    }

    // Update book metadata (tone, music_mood, voiceover)
    await supabase.from('books').update({
      tone: trailerData.tone || null,
      music_mood: trailerData.music_mood || null,
      voiceover: trailerData.voiceover || null,
    }).eq('id', bookId)

    console.log(`[regen-screenplay] Done — ${trailerData.scenes?.length} scenes, ${trailerData.characters?.length} characters`)

    return Response.json({
      success: true,
      scenes: trailerData.scenes?.length ?? 0,
      characters: trailerData.characters?.length ?? 0,
    })
  } catch (err) {
    console.error('[regen-screenplay] Unhandled error:', err)
    return Response.json({ error: 'Internal server error', detail: String(err) }, { status: 500 })
  }
}
