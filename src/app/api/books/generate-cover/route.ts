import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      bookId?: string
      title?: string
      authorName?: string
      genre?: string
      description?: string
    }
    const { bookId, title: bodyTitle, authorName: bodyAuthorName, genre: bodyGenre, description: bodyDescription } = body

    let title = bodyTitle ?? 'Untitled'
    let genre = bodyGenre ?? 'Fiction'
    let description = bodyDescription ?? ''
    let authorName = bodyAuthorName ?? ''

    // If bookId is provided, fetch book details from Supabase
    if (bookId) {
      const supabase = getServiceClient()
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('title, genre, description')
        .eq('id', bookId)
        .single()

      if (!bookError && book) {
        title = book.title ?? title
        genre = book.genre ?? genre
        description = book.description ?? description
      }
    }

    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }

    // ── Ideogram v3 — best-in-class for text rendering on images ──────────────
    // Prompt strategy: describe the scene/mood first, then explicitly place text.
    // Ideogram natively renders "title" and "author name" as styled typography.
    const textInstructions = authorName
      ? `The book title "${title}" displayed prominently on the cover in elegant typography, and the author name "${authorName}" in smaller text near the bottom`
      : `The book title "${title}" displayed prominently on the cover in elegant typography`

    const prompt = `Professional book cover design. ${genre} genre. ${description ? description + '. ' : ''}${textInstructions}. Cinematic lighting, dramatic composition, high contrast, visually striking. Publisher-quality artwork.`

    const negativePrompt = 'blurry, low quality, amateur, watermark, misspelled text, garbled letters, distorted words, ugly typography, bad fonts'

    console.log('[generate-cover] Generating cover for:', title, 'author:', authorName, '- model: ideogram-v3')
    console.log('[generate-cover] Prompt:', prompt.substring(0, 200))

    const FAL_API_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY || ''

    // Ideogram v3 via fal.ai — superior text rendering vs Flux
    const res = await fetch('https://fal.run/fal-ai/ideogram/v3', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt,
        aspect_ratio: '2:3',   // standard book cover portrait ratio
        style: 'realistic',    // photorealistic / painterly blend — best for covers
        magic_prompt_option: 'AUTO', // Ideogram's built-in prompt enhancer
        num_images: 1,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[generate-cover] Ideogram error:', res.status, errText.substring(0, 300))
      return Response.json({ error: `Image generation failed: ${res.status}` }, { status: 500 })
    }

    const result = await res.json() as { images?: Array<{ url: string }> }
    const falImageUrl = result.images?.[0]?.url
    if (!falImageUrl) {
      return Response.json({ error: 'No image generated' }, { status: 500 })
    }

    // Download from fal.ai and re-upload to Supabase so the cover URL doesn't expire.
    let imageUrl = falImageUrl
    try {
      const supabase = getServiceClient()
      const imgRes = await fetch(falImageUrl)
      if (!imgRes.ok) throw new Error(`download failed ${imgRes.status}`)
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

      const storagePath = `covers/${bookId ?? 'preview'}-${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('media')
        .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: true })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
      imageUrl = urlData.publicUrl
      console.log('[generate-cover] Cover persisted to Supabase:', imageUrl.substring(0, 80))
    } catch (persistErr) {
      console.error('[generate-cover] Failed to persist cover, using temporary URL:', persistErr)
    }

    // If bookId is provided, save cover URL to books table
    if (bookId) {
      const supabase = getServiceClient()
      const { error: updateError } = await supabase
        .from('books')
        .update({ cover_image_url: imageUrl })
        .eq('id', bookId)

      if (updateError) {
        console.error('[generate-cover] Failed to save cover URL:', updateError)
      } else {
        console.log('[generate-cover] Cover saved to book:', bookId)
      }
    }

    return Response.json({ imageUrl })
  } catch (error) {
    console.error('[generate-cover] Unhandled error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
