// tierGate.ts — credit costs and quality configuration for BookReel
// As of Jun 2026: credit-based model. Quality is chosen per-render, not per-subscription.
//
// Credit costs:
//   Standard trailer: 80 credits (Seedance Fast, 720p, 4 clips × 10s = 40s)
//   Premium trailer:  150 credits (Seedance Standard, 1080p, 7 clips × 10s = 70s)
//
// Monthly subscription allotments (see credits.ts for authoritative source):
//   Hobbyist:  50 credits/mo
//   Author:    150 credits/mo
//   Publisher: 450 credits/mo

export type QualityTier = 'standard' | 'premium'
export type PlanName = 'free' | 'hobbyist' | 'author' | 'publisher' | 'pro' | 'basic' // legacy names kept

// Credit cost per render quality
export const CREDIT_COSTS: Record<QualityTier, number> = {
  standard: 80,
  premium:  150,
}

// Video config per quality tier
export function getVideoConfig(quality: QualityTier) {
  if (quality === 'premium') {
    return {
      clips: 7,
      clipDuration: 10,           // seconds
      totalSeconds: 70,
      resolution: '1080p' as const,
      seedanceTier: 'standard' as const,  // Seedance Standard endpoint
      characterLines: 2,
    }
  }
  // standard quality
  return {
    clips: 4,
    clipDuration: 10,
    totalSeconds: 40,
    resolution: '720p' as const,
    seedanceTier: 'fast' as const,       // Seedance Fast endpoint
    characterLines: 1,
  }
}

// Can the user afford a render? (credit check)
export function canAffordRender(credits: number, quality: QualityTier): boolean {
  return credits >= CREDIT_COSTS[quality]
}

// Legacy: map old plan-based tier names to new quality defaults
export function defaultQualityForPlan(plan: PlanName): QualityTier {
  if (plan === 'pro' || plan === 'publisher') return 'premium'
  return 'standard'
}

// Social cuts / quote graphics (unchanged from old model, kept for UI display)
export function getSocialCutsLimit(plan: PlanName): number {
  if (plan === 'free') return 0
  return Infinity // all paid plans get unlimited social cuts
}

export function getQuoteGraphicsLimit(plan: PlanName): number {
  if (plan === 'free') return 0
  return Infinity // all paid plans
}
