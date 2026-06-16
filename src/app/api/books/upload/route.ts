import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a screenplay writer. Return ONLY a valid JSON object with no markdown, no code blocks, no explanation. Just raw JSON.

The JSON must match this exact structure:
{"characters":[{"name":"","role":"","description":"","appearance":""}],"scenes":[{"scene_number":1,"title":"","description":"","screenplay_text":"","duration_seconds":10}],"voiceover":"","tone":"","music_mood":""}

Guidelines:
- Extract 2-5 main characters with vivid descriptions
- Create 4-6 cinematic scenes that would work as a book trailer
- Each scene should be 8-15 seconds (duration_seconds between 8 and 15)
- Voiceover should be compelling and mysterious (2-3 sentences)
- Tone: one of dramatic, mysterious, romantic, thrilling, inspiring, dark
- Music mood: one of orchestral, ambient, upbeat, suspenseful, emotional, epic
- Return ONLY raw JSON. No markdown fences, no backticks, no explanation before or after.`

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
    if (!isTextFile && !isPdfFile) {
      return Response.json({ error: 'File must be a PDF or plain text (.txt) file' }, { status: 400 })
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
          contentType: isTextFile ? 'text/plain' : 'application/pdf',
          upsert: false
        })

      if (uploadError) {
        console.error('[upload] Storage upload error:', uploadError)
        return Response.json(
          { error: 'Failed to upload PDF to storage', detail: uploadError.message },
          { status: 500 }
        )
      }

      pdfUrl = uploadData.path
      console.log('[upload] PDF uploaded:', pdfUrl)
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
        error: 'We could not extract readable text from your manuscript. Please make sure your file contains actual text (not scanned images). Try exporting directly from Word, Google Docs, or Scrivener as a PDF or plain text (.txt) file.'
      }, { status: 400 })
    }

    // Build the AI user message
    const userMessage = `Analyze this book excerpt and generate trailer data:\n\nTitle: ${title}\nGenre: ${genre}\n\n${extractedText.substring(0, 15000)}`

    // Truncate to 15000 chars
    const truncatedText = userMessage.slice(0, 15000)

    // ── Step 4: Call OpenRouter API ───────────────────────────────────────────
    let trailerData: {
      characters: Array<{ name: string; role: string; description: string; appearance: string }>
      scenes: Array<{ scene_number: number; title: string; description: string; screenplay_text: string; duration_seconds: number }>
      voiceover: string
      tone: string
      music_mood: string
    }

    try {
      console.log('OpenRouter key present:', !!process.env.OPENROUTER_API_KEY)
      console.log('OpenRouter key prefix:', process.env.OPENROUTER_API_KEY?.substring(0, 10))

      // Treat placeholder/masked values as unset
      const isPlaceholder = (v: string | undefined) => !v || v === '***' || v === 'xxx'
      const rawOpenRouterKey = process.env.OPENROUTER_API_KEY
      const rawOpenAiKey = process.env.OPENAI_API_KEY
      const openRouterKey = isPlaceholder(rawOpenRouterKey) ? undefined : rawOpenRouterKey
      const openAiKey = isPlaceholder(rawOpenAiKey) ? undefined : rawOpenAiKey

      console.log('[upload] OpenRouter key available:', !!openRouterKey)
      console.log('[upload] OpenAI key available:', !!openAiKey)

      const apiKey = openRouterKey || openAiKey
      const apiUrl = openRouterKey
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions'
      const model = openRouterKey
        ? 'openai/gpt-4o-mini'
        : 'gpt-4o-mini'

      if (!apiKey) {
        console.error('[upload] Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is set (or both are placeholder values)')
        return Response.json(
          { error: 'AI service not configured. Please check API key configuration.' },
          { status: 500 }
        )
      }

      console.log('[upload] Using AI endpoint:', apiUrl, 'model:', model)

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

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('[upload] OpenRouter error:', aiResponse.status, errText)
        return Response.json(
          { error: 'AI service failed to generate trailer data. Please try again.', detail: errText },
          { status: 500 }
        )
      }

      const aiJson = await aiResponse.json()
      const rawContent = aiJson.choices?.[0]?.message?.content

      if (!rawContent) {
        console.error('[upload] OpenRouter returned no content:', JSON.stringify(aiJson))
        return Response.json(
          { error: 'AI service returned no data. Please try again.' },
          { status: 500 }
        )
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

      console.log('[upload] AI trailer data generated, scenes:', trailerData.scenes?.length)
    } catch (aiErr) {
      console.error('[upload] OpenRouter step threw:', aiErr)
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

    // ── Step 6: Save characters ───────────────────────────────────────────────
    if (trailerData.characters && trailerData.characters.length > 0) {
      try {
        const characters = trailerData.characters.map((c) => ({
          book_id: bookId,
          name: c.name,
          role: c.role || null,
          description: c.description || null,
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

    // ── Step 8: Save trailer record ───────────────────────────────────────────
    try {
      const { error: trailerError } = await supabase.from('trailers').insert({
        book_id: bookId,
        status: 'review',
        quality_tier: 'basic',
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
