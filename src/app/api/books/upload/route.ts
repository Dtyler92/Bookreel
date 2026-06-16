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

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const genre = formData.get('genre') as string | null
    const description = formData.get('description') as string | null
    const amazon_link = formData.get('amazon_link') as string | null
    const store_link = formData.get('store_link') as string | null

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

    const supabase = getServiceClient()

    // Get authenticated user
    const authHeader = request.headers.get('Authorization')
    let authorId: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      authorId = user?.id ?? null
    }

    if (!authorId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upload PDF to Supabase Storage
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
      console.error('Storage upload error:', uploadError)
      return Response.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    const pdfUrl = uploadData.path

    // Extract text from PDF
    let extractedText = ''
    try {
      const parser = new PDFParse({ data: fileBytes })
      const textResult = await parser.getText()
      extractedText = textResult.text
    } catch (pdfError) {
      console.error('PDF parse error:', pdfError)
      // Continue without text extraction - use title/description
      extractedText = `Title: ${title}\nDescription: ${description || 'No description provided'}`
    }

    // Truncate to 15000 chars
    const truncatedText = extractedText.slice(0, 15000)

    // Call OpenRouter API
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
      console.error('OpenRouter error:', errText)
      return Response.json({ error: 'Our system could not read your manuscript. Please try again.' }, { status: 500 })
    }

    const aiJson = await aiResponse.json()
    const aiContent = aiJson.choices?.[0]?.message?.content

    if (!aiContent) {
      return Response.json({ error: 'We could not process your manuscript. Please try again.' }, { status: 500 })
    }

    let trailerData: {
      characters: Array<{ name: string; role: string; description: string; appearance: string }>
      scenes: Array<{ scene_number: number; title: string; description: string; screenplay_text: string; duration_seconds: number }>
      voiceover: string
      tone: string
      music_mood: string
    }

    try {
      trailerData = JSON.parse(aiContent)
    } catch {
      console.error('Failed to parse AI JSON:', aiContent)
      return Response.json({ error: 'We had trouble reading your manuscript. Please try again.' }, { status: 500 })
    }

    // Save book record
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
      console.error('Book insert error:', bookError)
      return Response.json({ error: 'Failed to save book' }, { status: 500 })
    }

    const bookId = bookData.id

    // Save characters
    if (trailerData.characters && trailerData.characters.length > 0) {
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
        console.error('Characters insert error:', charError)
      }
    }

    // Save scenes
    if (trailerData.scenes && trailerData.scenes.length > 0) {
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
        console.error('Scenes insert error:', sceneError)
      }
    }

    // Save trailer record
    const { error: trailerError } = await supabase.from('trailers').insert({
      book_id: bookId,
      status: 'review',
      quality_tier: 'basic',
      view_count: 0,
      click_count: 0
    })

    if (trailerError) {
      console.error('Trailer insert error:', trailerError)
    }

    return Response.json({
      success: true,
      bookId,
      data: trailerData
    })
  } catch (error) {
    console.error('Upload route error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
