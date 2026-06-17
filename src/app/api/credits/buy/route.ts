import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/credits/buy
// Creates a one-time Stripe Checkout session for a trailer redo credit.
// Price depends on the user's tier: Author $6, Pro $9.

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
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
    const priceId = tier === 'pro'
      ? process.env.STRIPE_PRO_CREDIT_PRICE_ID
      : process.env.STRIPE_AUTHOR_CREDIT_PRICE_ID

    if (!priceId || priceId === 'xxx') {
      return Response.json(
        { error: 'Credit purchases are not configured yet. Please contact support.' },
        { status: 503 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?credit_added=true`,
      cancel_url: `${appUrl}/dashboard`,
      metadata: {
        userId: user.id,
        type: 'trailer_credit',
        tier,
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
