import { PlanName } from './stripe'

export function canGenerateTrailer(tier: PlanName, trailersUsedThisMonth: number): boolean {
  if (tier === 'free') return false
  if (tier === 'author') return trailersUsedThisMonth < 1
  if (tier === 'pro') return trailersUsedThisMonth < 2
  return false
}

export function getVideoConfig(tier: PlanName) {
  if (tier === 'pro') {
    return {
      maxDurationSeconds: 90,    // 60-90 seconds
      scenesCount: 9,            // 9 clips × ~10 sec = 90 seconds max
      sceneLength: 10,           // 10 seconds per clip
      quality: 'cinematic' as const
    }
  }
  // author tier (standard) - max 30 seconds
  return {
    maxDurationSeconds: 30,
    scenesCount: 3,              // 3 clips × ~10 sec = 30 seconds
    sceneLength: 10,             // 10 seconds per clip
    quality: 'standard' as const
  }
}

export function getTrailerDuration(tier: 'standard' | 'cinematic') {
  return tier === 'cinematic'
    ? { maxScenes: 9, targetDuration: '60-90 seconds', clipsPerTrailer: 9 }
    : { maxScenes: 3, targetDuration: '~30 seconds', clipsPerTrailer: 3 }
}

export function getModelForTier(tier: PlanName) {
  if (tier === 'pro') {
    return {
      llm: 'openai/gpt-4o',
      imageModel: 'flux-pro',
      videoModel: 'runway-gen4-full',
      voiceModel: 'eleven_multilingual_v2'
    }
  }
  // author tier (standard)
  return {
    llm: 'openai/gpt-4o-mini',
    imageModel: 'flux-schnell',
    videoModel: 'runway-gen4-turbo',
    voiceModel: 'eleven_turbo_v2'
  }
}

export function getSocialCutsLimit(tier: PlanName): number {
  if (tier === 'free') return 0
  if (tier === 'author') return 3
  if (tier === 'pro') return Infinity
  return 0
}

export function getQuoteGraphicsLimit(tier: PlanName): number {
  if (tier === 'free') return 0
  if (tier === 'author') return 3
  if (tier === 'pro') return 5
  return 0
}
