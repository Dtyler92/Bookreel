import { fal } from '@fal-ai/client'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

fal.config({ credentials: process.env.FAL_API_KEY || process.env.FAL_KEY || '' })

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface IdeogramResult {
  images: Array<{ url: string }>
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      bookId?: string
      title?: string
      authorName?: string
      genre?: string
      description?: string
      coverPrompt?: string
      style?: string
      count?: number
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

    // ── Ideogram v3 via fal.ai ─────────────────────────────────────────────────
    // Best-in-class for text rendering on images — renders title + author legibly.
    // Prompt strategy: scene/mood first, then explicit typography placement.
    const titleText = title.toUpperCase()
    const authorText = authorName || null

    const typographyInstructions = authorText
      ? `Book title "${titleText}" in large bold embossed typography at the top of the cover. Author name "${authorText}" in elegant smaller text at the bottom of the cover.`
      : `Book title "${titleText}" in large bold embossed typography prominently at the top of the cover.`

    const coverPrompt = body.coverPrompt

    const baseDescription = coverPrompt?.trim()
      ? coverPrompt.trim()
      : description ? description.substring(0, 160) : ''

    const prompt = `Professional ${genre} book cover artwork. ${baseDescription ? baseDescription + '. ' : ''}${typographyInstructions} Text is perfectly spelled, sharp, clearly legible, beautifully integrated into the design. Cinematic dramatic composition, rich atmospheric lighting, publisher-quality artwork. No extra text or words beyond the title and author name.`

    const negativePrompt = 'blurry, low quality, amateur, watermark, misspelled text, garbled letters, distorted words, wrong words, missing text, nudity, gore'

    const numImages = Math.min(4, Math.max(1, body.count ?? 1))

    console.log('[generate-cover] Model: ideogram v3 | Title:', title, '| Author:', authorName, '| Count:', numImages)
    console.log('[generate-cover] Prompt:', prompt.substring(0, 200))

    // Use fal.subscribe for synchronous result (handles queue internally)
    const result = await fal.subscribe('fal-ai/ideogram/v3', {
      input: {
        prompt,
        negative_prompt: negativePrompt,
        image_size: 'portrait_4_3',   // standard book cover portrait
        style: (body.style as any) || 'DESIGN',
        expand_prompt: true,          // Ideogram's built-in prompt enhancer
        num_images: numImages,
      },
    }) as { data: IdeogramResult; requestId: string }

    const falImages = result.data?.images
    if (!falImages || falImages.length === 0) {
      console.error('[generate-cover] No image URL in result:', JSON.stringify(result).substring(0, 300))
      return Response.json({ error: 'No image generated' }, { status: 500 })
    }

    // Download all images from fal.ai and re-upload to Supabase so URLs don't expire
    const supabase = getServiceClient()
    const urls: string[] = []

    for (let i = 0; i < falImages.length; i++) {
      const falImageUrl = falImages[i].url
      let imageUrl = falImageUrl
      try {
        const imgRes = await fetch(falImageUrl)
        if (!imgRes.ok) throw new Error(`download failed ${imgRes.status}`)
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

        const storagePath = `covers/${bookId ?? 'preview'}-${Date.now()}-${i}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('media')
          .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: true })

        if (uploadErr) throw new Error(uploadErr.message)

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
        imageUrl = urlData.publicUrl
        console.log(`[generate-cover] Cover ${i} persisted to Supabase:`, imageUrl.substring(0, 80))
      } catch (persistErr) {
        console.error(`[generate-cover] Failed to persist cover ${i}, using temporary URL:`, persistErr)
      }
      urls.push(imageUrl)
    }

    // Save first cover URL to books table
    if (bookId) {
      const { error: updateError } = await supabase
        .from('books')
        .update({ cover_image_url: urls[0] })
        .eq('id', bookId)

      if (updateError) {
        console.error('[generate-cover] Failed to save cover URL:', updateError)
      } else {
        console.log('[generate-cover] Cover saved to book:', bookId)
      }
    }

    return Response.json({ imageUrl: urls[0], imageUrls: urls })
  } catch (error) {
    console.error('[generate-cover] Unhandled error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
