import { createClient } from '@supabase/supabase-js'

// Service-role client for credit mutations (bypasses RLS — only call server-side)
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface CreditState {
  credits: number
  resetAt: string
  tier: string
}

// ── Credit costs per render type ──────────────────────────────────────────────
// Standard: Seedance Fast (720p, 4 clips × 10s = 40s trailer)  — cheaper tier
// Premium:  Seedance Standard (1080p, 7 clips × 10s = 70s trailer) — full quality
export const CREDIT_COSTS = {
  standard_trailer: 80,   // Seedance Fast 720p — ~$9 COGS at $0.19/cr
  premium_trailer:  150,  // Seedance Standard 1080p — ~$21 COGS at $0.19/cr
} as const

export type QualityTier = 'standard' | 'premium'

export function creditCostForQuality(quality: QualityTier): number {
  return quality === 'premium' ? CREDIT_COSTS.premium_trailer : CREDIT_COSTS.standard_trailer
}

// ── Monthly allotment per subscription plan ───────────────────────────────────
// Plans: free | hobbyist | author | publisher
export function monthlyAllotment(tier: string): number {
  if (tier === 'publisher') return 450
  if (tier === 'author')    return 150
  if (tier === 'hobbyist')  return 50
  // free & legacy tiers
  return 0
}

// ── Read credit state, auto-granting monthly allotment if due ─────────────────
export async function getCreditState(userId: string): Promise<CreditState | null> {
  const supabase = serviceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('trailer_credits, credits_reset_at, subscription_tier')
    .eq('id', userId)
    .single()

  if (!profile) return null

  let credits = profile.trailer_credits ?? 0
  let resetAt  = profile.credits_reset_at
  const tier   = profile.subscription_tier ?? 'free'

  // Auto-grant a fresh month's allotment if due
  if (resetAt && new Date(resetAt) <= new Date()) {
    const grant = monthlyAllotment(tier)
    if (grant > 0) {
      credits = credits + grant
      const nextReset = new Date()
      nextReset.setMonth(nextReset.getMonth() + 1)
      resetAt = nextReset.toISOString()

      await supabase
        .from('profiles')
        .update({ trailer_credits: credits, credits_reset_at: resetAt })
        .eq('id', userId)

      await logLedger(userId, grant, 'monthly_grant', null, credits)
    }
  }

  return { credits, resetAt, tier }
}

// ── Consume credits for a render. Returns false if insufficient balance. ──────
export async function consumeCredits(
  userId: string,
  bookId: string | null,
  quality: QualityTier = 'standard'
): Promise<boolean> {
  const supabase = serviceClient()
  const state    = await getCreditState(userId)
  const cost     = creditCostForQuality(quality)

  if (!state || state.credits < cost) return false

  const newBalance = state.credits - cost
  const { error }  = await supabase
    .from('profiles')
    .update({ trailer_credits: newBalance })
    .eq('id', userId)

  if (error) return false
  await logLedger(userId, -cost, `trailer_generated_${quality}`, bookId, newBalance)
  return true
}

// Legacy single-credit consume — kept for backward compatibility
export async function consumeCredit(userId: string, bookId: string | null): Promise<boolean> {
  return consumeCredits(userId, bookId, 'standard')
}

// ── Grant credits (purchase or admin). Returns the new balance. ───────────────
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<number | null> {
  const supabase   = serviceClient()
  const state      = await getCreditState(userId)
  if (!state) return null

  const newBalance = state.credits + amount
  const updates: Record<string, unknown> = { trailer_credits: newBalance }

  if (reason === 'purchase') {
    const { data: p } = await supabase
      .from('profiles')
      .select('purchased_credits_total')
      .eq('id', userId)
      .single()
    updates.purchased_credits_total = (p?.purchased_credits_total ?? 0) + amount
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) return null

  await logLedger(userId, amount, reason, null, newBalance)
  return newBalance
}

async function logLedger(
  userId: string,
  delta: number,
  reason: string,
  bookId: string | null,
  balanceAfter: number
) {
  const supabase = serviceClient()
  await supabase.from('credit_ledger').insert({
    user_id: userId,
    delta,
    reason,
    book_id: bookId,
    balance_after: balanceAfter,
  })
}
