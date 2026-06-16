import { createClient } from '@supabase/supabase-js'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a creative trailer scriptwriter. Analyze the provided book excerpt and generate compelling trailer data in the following exact JSON format:
{
  "characters": [{"name": "", "role": "", "description": "", "appearance": ""}],
  "scenes": [{"scene_number": 1, "title": "", "description": "", "screenplay_text": "", "duration_seconds": 10}],
  "voiceover": "",
  "tone": "",
  "music_mood": ""
}

Guidelines:
- Extract 2-5 main characters with vivid descriptions
- Create 4-6 cinematic scenes that would work as a book trailer
- Each scene should be 8-15 seconds
- Voiceover should be compelling and mysterious (2-3 sentences)
- Tone: one of dramatic, mysterious, romantic, thrilling, inspiring, dark
- Music mood: one of orchestral, ambient, upbeat, suspenseful, emotional, epic
- Return ONLY valid JSON, no other text`

function getServiceClient() {
  return createClient(
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
      file = formData.get('file') as File | null
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

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return Response.json({ error: 'File must be a PDF' }, { status: 400 })
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
      const authHeader = request.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
        if (authErr) {
          console.error('[upload] Auth error:', authErr)
        }
        authorId = user?.id ?? null
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
          contentType: 'application/pdf',
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

    // ── Step 3: Extract text from PDF ─────────────────────────────────────────
    let extractedText = ''
    try {
      await ensureWorker()
      const fileBuffer2 = await file.arrayBuffer()
      const fileBytes2 = new Uint8Array(fileBuffer2)
      const parser = new PDFParse({ data: fileBytes2 })
      const textResult = await parser.getText()
      extractedText = textResult.text
      console.log('[upload] PDF text extracted, length:', extractedText.length)
    } catch (pdfError) {
      console.error('[upload] PDF parse error (non-fatal, using fallback):', pdfError)
      // Fallback to title/description so the rest of the flow continues
      extractedText = `Title: ${title}\nGenre: ${genre || 'Unknown'}\nDescription: ${description || 'No description provided'}`
    }

    // Truncate to 15000 chars
    const truncatedText = extractedText.slice(0, 15000)

    // ── Step 4: Call OpenRouter API ───────────────────────────────────────────
    let trailerData: {
      characters: Array<{ name: string; role: string; description: string; appearance: string }>
      scenes: Array<{ scene_number: number; title: string; description: string; screenplay_text: string; duration_seconds: number }>
      voiceover: string
      tone: string
      music_mood: string
    }

    try {
      const openRouterKey = process.env.OPENROUTER_API_KEY
      if (!openRouterKey) {
        console.error('[upload] OPENROUTER_API_KEY is not set')
        return Response.json(
          { error: 'AI service not configured' },
          { status: 500 }
        )
      }

      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bookreel.app',
          'X-Title': 'BookReel'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Analyze this book excerpt and generate trailer data:\n\n${truncatedText}` }
          ],
          response_format: { type: 'json_object' }
        })
      })

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('[upload] OpenRouter error:', aiResponse.status, errText)
        return Response.json(
          { error: 'Our system could not read your manuscript. Please try again.', detail: errText },
          { status: 500 }
        )
      }

      const aiJson = await aiResponse.json()
      const aiContent = aiJson.choices?.[0]?.message?.content

      if (!aiContent) {
        console.error('[upload] OpenRouter returned no content:', JSON.stringify(aiJson))
        return Response.json(
          { error: 'We could not process your manuscript. Please try again.' },
          { status: 500 }
        )
      }

      try {
        trailerData = JSON.parse(aiContent)
      } catch (parseErr) {
        console.error('[upload] Failed to parse AI JSON:', aiContent)
        return Response.json(
          { error: 'We had trouble reading your manuscript. Please try again.' },
          { status: 500 }
        )
      }

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
