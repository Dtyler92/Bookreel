import { createClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { sanitizeAppearanceDescription, IMAGE_NEGATIVE_PROMPT } from '@/lib/contentPolicy'

export const runtime = 'nodejs'
export const maxDuration = 300

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

    // Build update payload — declared early so image generation can populate it
    const updatePayload: Record<string, unknown> = {
      author_approved: approved,
      author_feedback: feedback ?? null,
    }

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

      const updatedPrompt = `${basePrompt}. Adjust: ${sanitizeAppearanceDescription(feedback)}`.substring(0, 500)

      if (type === 'character') {
        // Generate full 3-angle character sheet
        try {
          const appearance = sanitizeAppearanceDescription(record.appearance_notes ?? record.description ?? record.name)
          const baseDesc = `${appearance}, same outfit and face across all views, ultra-realistic photorealistic, clean studio lighting, neutral grey background, no text, no watermarks`

          const angles = [
            { key: 'front', col: 'image_url_front', aspect: '3:4', prompt: `${baseDesc}, full body front view, facing camera directly, symmetrical pose, arms relaxed at sides, head to toe, face clearly visible. Adjust: ${sanitizeAppearanceDescription(feedback)}` },
            { key: 'back',  col: 'image_url_back',  aspect: '3:4', prompt: `${baseDesc}, full body back view, seen from behind, same outfit, head to toe. Adjust: ${sanitizeAppearanceDescription(feedback)}` },
            { key: 'face',  col: 'image_url_left',  aspect: '1:1', prompt: `${baseDesc}, straight-on headshot portrait, face looking directly into camera, eye level, shoulders visible, neutral expression, sharp facial features, studio portrait lighting. Adjust: ${sanitizeAppearanceDescription(feedback)}` },
          ]

          console.log('[approve-image] Regenerating 3-angle character sheet for', id)
          for (const angle of angles) {
            const result = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
              input: {
                prompt: angle.prompt.substring(0, 500),
                negative_prompt: IMAGE_NEGATIVE_PROMPT,
                aspect_ratio: angle.aspect,
                num_images: 1,
                output_format: 'jpeg',
                raw: true,
                safety_tolerance: '6',
              } as any,
            }) as { data: FalImageResult; requestId: string }

            const url = result.data.images[0]?.url
            if (url) {
              updatePayload[angle.col] = url
              if (angle.key === 'front') {
                newImageUrl = url
                updatePayload.image_url = url
                updatePayload.reference_image_url = url
              }
            }
          }
        } catch (falErr) {
          console.error('[approve-image] 3-angle regeneration failed:', falErr)
        }
      } else {
        // Items: single image regeneration
        try {
          console.log('[approve-image] Regenerating item image for', id)
          const result = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
            input: {
              prompt: updatedPrompt.substring(0, 500),
              negative_prompt: IMAGE_NEGATIVE_PROMPT,
              aspect_ratio: '1:1',
              num_images: 1,
              output_format: 'jpeg',
              safety_tolerance: '6',
            } as any,
          }) as { data: FalImageResult; requestId: string }

          newImageUrl = result.data.images[0]?.url
          if (newImageUrl) updatePayload.image_url = newImageUrl
        } catch (falErr) {
          console.error('[approve-image] Item image regeneration failed:', falErr)
        }
      }
    }

    // Save everything to Supabase
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
