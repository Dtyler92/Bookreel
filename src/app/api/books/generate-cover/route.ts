import { fal } from '@fal-ai/client'
import { createClient } from '@supabase/supabase-js'
import { IMAGE_NEGATIVE_PROMPT } from '@/lib/contentPolicy'

export const runtime = 'nodejs'
export const maxDuration = 60

fal.config({ credentials: process.env.FAL_API_KEY || process.env.FAL_KEY || '' })

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface FalImageResult {
  images: Array<{ url: string }>
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      bookId?: string
      title?: string
      genre?: string
      description?: string
    }
    const { bookId, title: bodyTitle, genre: bodyGenre, description: bodyDescription } = body

    let title = bodyTitle ?? 'Untitled'
    let genre = bodyGenre ?? 'Fiction'
    let description = bodyDescription ?? ''

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

    const prompt = `Book cover for '${title}', ${genre} genre, professional book cover design, dramatic lighting, ${description}, no text on cover, cinematic quality`

    console.log('[generate-cover] Generating cover for:', title, '- prompt:', prompt.substring(0, 120))

    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        negative_prompt: IMAGE_NEGATIVE_PROMPT,
        image_size: 'portrait_4_3',
        num_images: 1,
        safety_tolerance: '2',
      } as any,
    }) as { data: FalImageResult; requestId: string }

    const falImageUrl = result.data.images[0]?.url
    if (!falImageUrl) {
      return Response.json({ error: 'No image generated' }, { status: 500 })
    }

    // Download from fal.ai and re-upload to Supabase so the cover URL doesn't expire.
    // (fal.ai URLs are temporary; uploaded/generated covers must persist permanently.)
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
      // Non-fatal: fall back to the temporary fal.ai URL so the user still sees a cover
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
        // Non-fatal — still return the image URL
      } else {
        console.log('[generate-cover] Cover saved to book:', bookId)
      }
    }

    console.log('[generate-cover] Generated cover URL:', imageUrl)
    return Response.json({ imageUrl, coverUrl: imageUrl })
  } catch (err) {
    console.error('[generate-cover] Error:', err)
    return Response.json({ error: 'Failed to generate cover', detail: String(err) }, { status: 500 })
  }
}
