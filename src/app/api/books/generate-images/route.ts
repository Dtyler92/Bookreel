import { createClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { IMAGE_NEGATIVE_PROMPT, sanitizeAppearanceDescription } from '@/lib/contentPolicy'

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
    const body = await request.json() as { bookId: string; tier?: string }
    const { bookId, tier = 'standard' } = body

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Fetch book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, genre, author_id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    const genre = book.genre ?? 'general fiction'
    const falModel = tier === 'pro' ? 'fal-ai/flux-pro' : 'fal-ai/flux/schnell'

    // Fetch characters
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name, description, appearance_notes, image_url')
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
      if (character.image_url) {
        updatedCharacters.push({ id: character.id, image_url: character.image_url })
        continue
      }

      const appearance = character.appearance_notes ?? character.description ?? character.name
      const temperamentHint = extractTemperament(character.description)
      const characterPrompt = `${appearance}${temperamentHint ? `, ${temperamentHint}` : ''}, cinematic portrait, book cover style, dramatic lighting, detailed face, realistic, ${genre} genre aesthetic`
      const imagePrompt = sanitizeAppearanceDescription(characterPrompt.substring(0, 500))

      try {
        console.log('[generate-images] Generating image for character:', character.name)
        const result = await fal.subscribe(falModel, {
          input: {
            prompt: imagePrompt,
            negative_prompt: IMAGE_NEGATIVE_PROMPT,
            image_size: 'portrait_4_3',
            num_images: 1,
            safety_tolerance: '2',
          } as any,
        }) as { data: FalImageResult; requestId: string }

        const imageUrl = result.data.images[0]?.url
        if (imageUrl) {
          await supabase
            .from('characters')
            .update({ image_url: imageUrl, image_prompt: imagePrompt })
            .eq('id', character.id)
          updatedCharacters.push({ id: character.id, image_url: imageUrl })
        }
      } catch (err) {
        console.error('[generate-images] Character image generation failed:', character.name, err)
        updatedCharacters.push({ id: character.id, image_url: '' })
      }
    }

    // Generate images for items that don't have one yet
    for (const item of items ?? []) {
      if (item.image_url) {
        updatedItems.push({ id: item.id, image_url: item.image_url })
        continue
      }

      const itemPrompt = `${item.description ?? item.name}, ${item.name}, detailed, cinematic, dramatic lighting, ${genre} genre aesthetic, isolated subject`
      const imagePrompt = itemPrompt.substring(0, 500)

      try {
        console.log('[generate-images] Generating image for item:', item.name)
        const result = await fal.subscribe(falModel, {
          input: {
            prompt: imagePrompt,
            negative_prompt: IMAGE_NEGATIVE_PROMPT,
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
