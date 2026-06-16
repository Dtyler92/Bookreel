import { fal } from '@fal-ai/client'

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
      prompt: `Portrait of ${characterName}, ${appearance}, cinematic lighting, book cover style, highly detailed, dramatic`,
      image_size: 'portrait_4_3',
      num_images: 1,
    }
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
      prompt: `${sceneDescription}, ${tone} mood, cinematic composition, dramatic lighting, film still, highly detailed`,
      image_size: 'landscape_16_9',
      num_images: 1,
    }
  }) as { data: FalImageResult; requestId: string }

  return data.images[0].url
}
