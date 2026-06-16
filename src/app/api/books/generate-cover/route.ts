import { fal } from '@fal-ai/client'
import { IMAGE_NEGATIVE_PROMPT } from '@/lib/contentPolicy'

export const runtime = 'nodejs'
export const maxDuration = 60

fal.config({ credentials: process.env.FAL_API_KEY })

interface FalImageResult {
  images: Array<{ url: string }>
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string; genre?: string; description?: string }
    const { title = 'Untitled', genre = 'Fiction', description = '' } = body

    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }

    const prompt = `Professional book cover for '${title}', ${genre} genre, ${description}, dramatic lighting, typographic, publish-ready, vertical portrait format`

    console.log('[generate-cover] Generating cover for:', title, '- prompt:', prompt.substring(0, 100))

    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        negative_prompt: IMAGE_NEGATIVE_PROMPT,
        image_size: 'portrait_4_3',
        num_images: 1,
        safety_tolerance: '2',
      } as any,
    }) as { data: FalImageResult; requestId: string }

    const imageUrl = result.data.images[0]?.url
    if (!imageUrl) {
      return Response.json({ error: 'No image generated' }, { status: 500 })
    }

    console.log('[generate-cover] Generated cover URL:', imageUrl)
    return Response.json({ imageUrl })
  } catch (err) {
    console.error('[generate-cover] Error:', err)
    return Response.json({ error: 'Failed to generate cover', detail: String(err) }, { status: 500 })
  }
}
