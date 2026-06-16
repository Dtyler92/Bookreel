import { fal } from '@fal-ai/client'
import { IMAGE_NEGATIVE_PROMPT, sanitizeAppearanceDescription } from '@/lib/contentPolicy'

fal.config({
  credentials: process.env.FAL_API_KEY
})

interface FalImageResult {
  images: Array<{ url: string }>
}

export async function generateCharacterImage(
  characterName: string,
  appearance: string,
  tier: 'standard' | 'cinematic'
): Promise<string> {
  const model = tier === 'cinematic'
    ? 'fal-ai/flux-pro'
    : 'fal-ai/flux/schnell'

  const { data } = await fal.subscribe(model, {
    input: {
      prompt: sanitizeAppearanceDescription(`Portrait of ${characterName}, ${appearance}, cinematic lighting, book cover style, highly detailed, dramatic`),
      negative_prompt: IMAGE_NEGATIVE_PROMPT,
      image_size: 'portrait_4_3',
      num_images: 1,
      safety_tolerance: '2',
    } as any
  }) as { data: FalImageResult; requestId: string }

  return data.images[0].url
}

export async function generateSceneImage(
  sceneDescription: string,
  tone: string,
  tier: 'standard' | 'cinematic'
): Promise<string> {
  const model = tier === 'cinematic'
    ? 'fal-ai/flux-pro'
    : 'fal-ai/flux/schnell'

  const { data } = await fal.subscribe(model, {
    input: {
      prompt: sanitizeAppearanceDescription(`${sceneDescription}, ${tone} mood, cinematic composition, dramatic lighting, film still, highly detailed`),
      negative_prompt: IMAGE_NEGATIVE_PROMPT,
      image_size: 'landscape_16_9',
      num_images: 1,
      safety_tolerance: '2',
    } as any
  }) as { data: FalImageResult; requestId: string }

  return data.images[0].url
}
