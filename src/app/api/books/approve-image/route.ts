import { createClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'

export const runtime = 'nodejs'
export const maxDuration = 60

fal.config({ credentials: process.env.FAL_API_KEY })

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface FalImageResult {
  images: Array<{ url: string }>
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      type: 'character' | 'item'
      id: string
      approved: boolean
      feedback?: string
    }

    const { type, id, approved, feedback } = body

    if (!type || !id || approved === undefined) {
      return Response.json({ error: 'type, id, and approved are required' }, { status: 400 })
    }

    if (type !== 'character' && type !== 'item') {
      return Response.json({ error: 'type must be "character" or "item"' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const table = type === 'character' ? 'characters' : 'items'

    let newImageUrl: string | undefined

    // If feedback is provided and not approved, regenerate the image
    if (feedback && !approved) {
      // Fetch current record to build updated prompt
      const { data: record, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !record) {
        return Response.json({ error: 'Record not found' }, { status: 404 })
      }

      // Fetch book for genre
      const { data: book } = await supabase
        .from('books')
        .select('genre')
        .eq('id', record.book_id)
        .single()

      const genre = book?.genre ?? 'general fiction'

      let basePrompt: string
      if (type === 'character') {
        const appearance = record.appearance_notes ?? record.description ?? record.name
        basePrompt = `${appearance}, ${record.description ?? ''}, portrait, realistic, cinematic lighting, book cover style, detailed face, ${genre} genre aesthetic`
      } else {
        basePrompt = `${record.description ?? record.name}, ${record.name}, detailed, cinematic, dramatic lighting, ${genre} genre aesthetic, isolated subject`
      }

      const updatedPrompt = `${basePrompt}. Adjust: ${feedback}`.substring(0, 500)

      try {
        const falModel = 'fal-ai/flux/schnell'
        const imageSize = type === 'character' ? 'portrait_4_3' : 'square_hd'

        console.log('[approve-image] Regenerating image for', type, id)
        const result = await fal.subscribe(falModel, {
          input: {
            prompt: updatedPrompt,
            image_size: imageSize,
            num_images: 1,
          },
        }) as { data: FalImageResult; requestId: string }

        newImageUrl = result.data.images[0]?.url
      } catch (falErr) {
        console.error('[approve-image] Image regeneration failed:', falErr)
        // Don't fail the whole request — just save feedback without new image
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      author_approved: approved,
      author_feedback: feedback ?? null,
    }
    if (newImageUrl) {
      updatePayload.image_url = newImageUrl
    }

    const { error: updateError } = await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      console.error('[approve-image] Update error:', updateError)
      return Response.json({ error: 'Failed to update record', detail: updateError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      newImageUrl,
    })
  } catch (error) {
    console.error('[approve-image] Unhandled error:', error)
    return Response.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}
