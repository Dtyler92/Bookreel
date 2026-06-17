import { fal } from '@fal-ai/client'
import { IMAGE_NEGATIVE_PROMPT, sanitizeAppearanceDescription } from '@/lib/contentPolicy'

// Explicitly configure with our env var name
fal.config({
  credentials: process.env.FAL_API_KEY || process.env.FAL_KEY || ''
})

interface FalImageResult {
  images: Array<{ url: string }>
}

export async function generateCharacterImage(
  characterName: string,
  appearance: string,
  tier: 'standard' | 'cinematic'
): Promise<string> {
  // flux-pro/v1.1-ultra: best photorealism, handles faces naturally
  const model = 'fal-ai/flux-pro/v1.1-ultra'

  const { data } = await fal.subscribe(model, {
    input: {
      prompt: sanitizeAppearanceDescription(`${appearance}, natural skin texture, photorealistic portrait, editorial photography, ${characterName}, soft cinematic lighting, sharp focus on face, book cover style`),
      negative_prompt: IMAGE_NEGATIVE_PROMPT + ', artificial, plastic skin, overly smooth, CGI, digital art, illustration',
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
  // flux-pro/v1.1 for scenes — cinematic quality without text artifacts
  const model = tier === 'cinematic'
    ? 'fal-ai/flux-pro/v1.1-ultra'
    : 'fal-ai/flux-pro/v1.1'

  const { data } = await fal.subscribe(model, {
    input: {
      prompt: sanitizeAppearanceDescription(`${sceneDescription}, ${tone} mood, cinematic wide shot, dramatic lighting, anamorphic lens, film still, no text, no words, no letters`),
      negative_prompt: IMAGE_NEGATIVE_PROMPT + ', text, words, letters, watermark, caption, title, logo',
      image_size: 'landscape_16_9',
      num_images: 1,
      safety_tolerance: '2',
    } as any
  }) as { data: FalImageResult; requestId: string }

  return data.images[0].url
}
