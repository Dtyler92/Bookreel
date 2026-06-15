import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { userId?: string }
    const { userId } = body

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Look up Stripe customer ID for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      return Response.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard`,
    })

    return Response.json({ url: portalSession.url })
  } catch (error) {
    console.error('Portal session error:', error)
    return Response.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
