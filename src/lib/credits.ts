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
  tier: 'free' | 'basic' | 'pro'
}

// Monthly allotment per tier
export function monthlyAllotment(tier: string): number {
  if (tier === 'pro') return 2
  if (tier === 'basic') return 1
  return 1 // free still gets 1 to try
}

// Reads the profile, auto-grants the monthly allotment if the reset date has passed.
export async function getCreditState(userId: string): Promise<CreditState | null> {
  const supabase = serviceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('trailer_credits, credits_reset_at, subscription_tier')
    .eq('id', userId)
    .single()

  if (!profile) return null

  let credits = profile.trailer_credits ?? 0
  let resetAt = profile.credits_reset_at
  const tier = (profile.subscription_tier ?? 'free') as 'free' | 'basic' | 'pro'

  // Auto-grant a fresh month's allotment if due
  if (resetAt && new Date(resetAt) <= new Date()) {
    const grant = monthlyAllotment(tier)
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

  return { credits, resetAt, tier }
}

// Atomically consume one credit. Returns false if insufficient balance.
export async function consumeCredit(userId: string, bookId: string | null): Promise<boolean> {
  const supabase = serviceClient()
  const state = await getCreditState(userId)
  if (!state || state.credits < 1) return false

  const newBalance = state.credits - 1
  const { error } = await supabase
    .from('profiles')
    .update({ trailer_credits: newBalance })
    .eq('id', userId)

  if (error) return false
  await logLedger(userId, -1, 'trailer_generated', bookId, newBalance)
  return true
}

// Grant credits (purchase or admin). Returns the new balance.
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<number | null> {
  const supabase = serviceClient()
  const state = await getCreditState(userId)
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
