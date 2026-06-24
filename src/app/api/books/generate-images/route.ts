import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { fal } from '@fal-ai/client'
import { IMAGE_NEGATIVE_PROMPT, sanitizeAppearanceDescription } from '@/lib/contentPolicy'
import { NextResponse } from 'next/server'
import { PlanName } from '@/lib/stripe'

export const runtime = 'nodejs'
export const maxDuration = 120

fal.config({ credentials: process.env.FAL_API_KEY || process.env.FAL_KEY || '' })

// Extract temperament from the combined description field
function extractTemperament(description: string | null): string {
  if (!description) return ''
  const parts = description.split('**Temperament:**')
  return parts[1]?.trim() || ''
}

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
    // Auth check — derive userId from session only (never from request body)
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = user.id

    const body = await request.json() as { bookId: string; tier?: string }
    const { bookId, tier = 'standard' } = body

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // --- Tier gate: free users cannot generate images ---
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[generate-images] Profile fetch error:', profileError)
      return Response.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    const userTier = (profile?.subscription_tier || 'free') as PlanName

    if (userTier === 'free') {
      return NextResponse.json({
        error: 'Image generation requires an Author or Pro subscription. Upgrade your plan to generate images.',
        upgradeRequired: true
      }, { status: 403 })
    }

    // Fetch book and verify ownership
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, genre, author_id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.author_id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const genre = book.genre ?? 'general fiction'
    // Use flux-pro/v1.1-ultra for characters (best photorealism / faces)
    // Use flux-pro/v1.1 for standard items, ultra for pro
    const falCharacterModel = 'fal-ai/flux-pro/v1.1-ultra'
    const falItemModel = tier === 'pro' ? 'fal-ai/flux-pro/v1.1-ultra' : 'fal-ai/flux-pro/v1.1'

    // Fetch characters
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name, description, appearance_notes, image_url, image_url_front, image_url_back, image_url_left')
      .eq('book_id', bookId)

    if (charError) {
      console.error('[generate-images] Characters fetch error:', charError)
      return Response.json({ error: 'Failed to fetch characters' }, { status: 500 })
    }

    // Fetch items
    const { data: items, error: itemError } = await supabase
      .from('items')
      .select('id, name, description, image_url')
      .eq('book_id', bookId)

    if (itemError) {
      console.error('[generate-images] Items fetch error:', itemError)
      return Response.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    const updatedCharacters: Array<{ id: string; image_url: string }> = []
    const updatedItems: Array<{ id: string; image_url: string }> = []

    // Generate images for characters that don't have one yet
    for (const character of characters ?? []) {
      // Skip if all 3 angles already exist
      const char = character as any
      if (char.image_url_front && char.image_url_back && char.image_url_left) {
        updatedCharacters.push({ id: character.id, image_url: char.image_url_front })
        continue
      }

      const appearance = sanitizeAppearanceDescription(char.appearance_notes ?? character.description ?? character.name)
      const baseDesc = `${appearance}, ultra-realistic photorealistic, clean studio lighting, neutral grey background, no text, no watermarks`

      try {
        console.log('[generate-images] Generating 3-angle character sheet for:', character.name)

        // Step 1 — Face close-up (no reference)
        const faceResult = await fal.subscribe(falCharacterModel, {
          input: {
            prompt: `${baseDesc}, straight-on headshot portrait, face looking directly into camera, eye level, shoulders visible, neutral expression, sharp facial features, studio portrait lighting`.substring(0, 500),
            negative_prompt: IMAGE_NEGATIVE_PROMPT,
            aspect_ratio: '1:1',
            num_images: 1,
            output_format: 'jpeg',
            raw: true,
            safety_tolerance: '6',
          } as any,
        }) as { data: FalImageResult; requestId: string }
        const faceUrl = faceResult.data.images[0]?.url

        // Step 2 — Front full body, using face as reference
        const frontResult = await fal.subscribe(falCharacterModel, {
          input: {
            prompt: `${baseDesc}, same person as reference image, full body front view, facing camera directly, symmetrical pose, arms relaxed at sides, head to toe, same face and outfit`.substring(0, 500),
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

        // Step 3 — Back full body, using face as reference
        const backResult = await fal.subscribe(falCharacterModel, {
          input: {
            prompt: `${baseDesc}, same person as reference image, full body back view, seen from behind, same outfit and hair, head to toe`.substring(0, 500),
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

        const updatePayload: Record<string, unknown> = {}
        if (faceUrl) updatePayload.image_url_left = faceUrl
        if (frontUrl) {
          updatePayload.image_url_front = frontUrl
          updatePayload.image_url = frontUrl
          updatePayload.reference_image_url = frontUrl
        }
        if (backUrl) updatePayload.image_url_back = backUrl

        await supabase.from('characters').update(updatePayload).eq('id', character.id)
        updatedCharacters.push({ id: character.id, image_url: frontUrl ?? faceUrl ?? '' })
      } catch (err) {
        console.error(`[generate-images] 3-angle generation failed for ${character.name}:`, err)
        updatedCharacters.push({ id: character.id, image_url: '' })
      }
    }

    // Generate images for items that don't have one yet
    for (const item of items ?? []) {
      if (item.image_url) {
        updatedItems.push({ id: item.id, image_url: item.image_url })
        continue
      }

      const itemPrompt = `${item.description ?? item.name}, ${item.name}, detailed, cinematic, dramatic lighting, ${genre} genre aesthetic, isolated subject, no text, no words`
      const imagePrompt = itemPrompt.substring(0, 500)

      try {
        console.log('[generate-images] Generating image for item:', item.name)
        const result = await fal.subscribe(falItemModel, {
          input: {
            prompt: imagePrompt,
            negative_prompt: IMAGE_NEGATIVE_PROMPT + ', text, words, letters, watermark, caption',
            image_size: 'square_hd',
            num_images: 1,
            safety_tolerance: '2',
          } as any,
        }) as { data: FalImageResult; requestId: string }

        const imageUrl = result.data.images[0]?.url
        if (imageUrl) {
          await supabase
            .from('items')
            .update({ image_url: imageUrl, image_prompt: imagePrompt })
            .eq('id', item.id)
          updatedItems.push({ id: item.id, image_url: imageUrl })
        }
      } catch (err) {
        console.error('[generate-images] Item image generation failed:', item.name, err)
        updatedItems.push({ id: item.id, image_url: '' })
      }
    }

    return Response.json({
      success: true,
      characters: updatedCharacters,
      items: updatedItems,
    })
  } catch (error) {
    console.error('[generate-images] Unhandled error:', error)
    return Response.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}
