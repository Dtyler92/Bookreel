import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/credits/buy
// Creates a one-time Stripe Checkout session for trailer credits.
// Uniform pricing across all tiers (credits are transferable):
//   pack '1'  →  1 credit  for $11.99
//   pack '3'  →  3 credits for $24.99 (saves ~$11)

// Credit packs — single source of truth. Prices in cents.
const CREDIT_PACKS: Record<string, { credits: number; amount: number; label: string }> = {
  '1': { credits: 1, amount: 1199, label: '1 Trailer Credit' },
  '3': { credits: 3, amount: 2499, label: '3 Trailer Credits' },
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    // Which pack? Default to single credit.
    let pack = '1'
    try {
      const body = await request.json() as { pack?: string }
      if (body?.pack && CREDIT_PACKS[body.pack]) pack = body.pack
    } catch {
      // no body / invalid JSON — fall back to single credit
    }
    const selected = CREDIT_PACKS[pack]

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getServiceClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier ?? 'free'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: selected.label,
            description: 'Trailer credits — usable on any book, any tier.',
          },
          unit_amount: selected.amount,
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/dashboard?credit_added=true`,
      cancel_url: `${appUrl}/dashboard`,
      metadata: {
        userId: user.id,
        type: 'trailer_credit',
        tier,
        credits: String(selected.credits),
      },
    }
    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[credits/buy] error:', error)
    return Response.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
