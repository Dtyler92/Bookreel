import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getPriceId(
  planId: 'author' | 'pro',
  interval: 'month' | 'year',
  isBeta: boolean
): string {
  if (isBeta) {
    if (planId === 'author') return process.env.STRIPE_AUTHOR_BETA_PRICE_ID!
    if (planId === 'pro') return process.env.STRIPE_PRO_BETA_PRICE_ID!
  }

  if (planId === 'author') {
    return interval === 'month'
      ? process.env.STRIPE_AUTHOR_MONTHLY_PRICE_ID!
      : process.env.STRIPE_AUTHOR_YEARLY_PRICE_ID!
  }

  // pro
  return interval === 'month'
    ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID!
    : process.env.STRIPE_PRO_YEARLY_PRICE_ID!
}

export async function POST(request: Request) {
  try {
    // Auth check — derive userId from session only (never from request body)
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = user.id

    const body = await request.json() as {
      planId: 'author' | 'pro'
      interval: 'month' | 'year'
      isBeta: boolean
    }

    const { planId, interval, isBeta } = body

    if (!planId || !interval) {
      return Response.json({ error: 'planId and interval are required' }, { status: 400 })
    }

    const priceId = getPriceId(planId, interval, isBeta)

    if (!priceId || priceId === 'xxx') {
      return Response.json({ error: 'Price not configured for this plan' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Look up existing Stripe customer using the authenticated userId
    let customerId: string | undefined
    const supabase = getServiceClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
    }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        userId,
        planId,
      },
    }

    if (customerId) {
      sessionParams.customer = customerId
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
