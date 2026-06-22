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
        // Generate full 3-angle character sheet: face first, then body shots using face as reference
        try {
          const appearance = sanitizeAppearanceDescription(record.appearance_notes ?? record.description ?? record.name)
          const adjust = feedback ? `. Adjust: ${sanitizeAppearanceDescription(feedback)}` : ''
          const baseDesc = `${appearance}, ultra-realistic photorealistic, clean studio lighting, neutral grey background, no text, no watermarks`

          console.log('[approve-image] Regenerating 3-angle character sheet for', id)

          // Step 1 — Face close-up (no reference)
          const faceResult = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
            input: {
              prompt: `${baseDesc}, straight-on headshot portrait, face looking directly into camera, eye level, shoulders visible, neutral expression, sharp facial features, studio portrait lighting${adjust}`.substring(0, 500),
              negative_prompt: IMAGE_NEGATIVE_PROMPT,
              aspect_ratio: '1:1',
              num_images: 1,
              output_format: 'jpeg',
              raw: true,
              safety_tolerance: '6',
            } as any,
          }) as { data: FalImageResult; requestId: string }
          const faceUrl = faceResult.data.images[0]?.url
          if (faceUrl) updatePayload.image_url_left = faceUrl

          // Step 2 — Front full body, using face as reference
          const frontResult = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
            input: {
              prompt: `${baseDesc}, same person as reference image, full body front view, facing camera directly, symmetrical pose, arms relaxed at sides, head to toe, same face and outfit${adjust}`.substring(0, 500),
              negative_prompt: IMAGE_NEGATIVE_PROMPT,
              aspect_ratio: '3:4',
              num_images: 1,
              output_format: 'jpeg',
              raw: true,
              safety_tolerance: '6',
              ...(faceUrl ? { image_urls: [faceUrl] } : {}),
            } as any,
          }) as { data: FalImageResult; requestId: string }
          const frontUrl = frontResult.data.images[0]?.url
          if (frontUrl) {
            updatePayload.image_url_front = frontUrl
            newImageUrl = frontUrl
            updatePayload.image_url = frontUrl
            updatePayload.reference_image_url = frontUrl
          }

          // Step 3 — Back full body, using face as reference
          const backResult = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
            input: {
              prompt: `${baseDesc}, same person as reference image, full body back view, seen from behind, same outfit and hair, head to toe${adjust}`.substring(0, 500),
              negative_prompt: IMAGE_NEGATIVE_PROMPT,
              aspect_ratio: '3:4',
              num_images: 1,
              output_format: 'jpeg',
              raw: true,
              safety_tolerance: '6',
              ...(faceUrl ? { image_urls: [faceUrl] } : {}),
            } as any,
          }) as { data: FalImageResult; requestId: string }
          const backUrl = backResult.data.images[0]?.url
          if (backUrl) updatePayload.image_url_back = backUrl

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
