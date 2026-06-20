import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/credits/buy
// Creates a one-time Stripe Checkout session for credit packs.
//
// Credit pack pricing (single source of truth — prices in cents):
//   'starter'  →  100 credits  for $19  ($0.19/cr)
//   'author'   →  300 credits  for $49  ($0.163/cr)
//   'pro'      →  700 credits  for $99  ($0.141/cr)
//
// Credit costs per render:
//   Standard trailer (Seedance Fast, 720p)  → 80 credits  (~$15.20 value at $0.19/cr)
//   Premium trailer (Seedance 1080p)        → 150 credits (~$28.50 value at $0.19/cr)

const CREDIT_PACKS: Record<string, { credits: number; amount: number; label: string; description: string }> = {
  'starter': { credits: 100, amount: 2200, label: '100 Credits',  description: 'Good for 1 premium trailer or 1 standard trailer + extras.' },
  'author':  { credits: 300, amount: 6600, label: '300 Credits',  description: 'Good for 3–4 trailers. Great for active authors.' },
  'pro':     { credits: 700, amount: 15400, label: '700 Credits', description: 'Good for 8+ trailers. Best rate per credit.' },
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    let pack = 'starter'
    try {
      const body = await request.json() as { pack?: string }
      if (body?.pack && CREDIT_PACKS[body.pack]) pack = body.pack
    } catch {
      // no body / invalid JSON — fall back to starter pack
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
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `BookReel ${selected.label}`,
            description: selected.description,
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
        credits: String(selected.credits),
        pack,
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
