import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch book + audiobook
    const { data: book } = await supabase
      .from('books')
      .select('id, title, author_id')
      .eq('id', bookId)
      .single()

    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })

    // Authors get free access — redirect to listen page
    if (book.author_id === user.id) {
      return Response.json({ alreadyOwned: true, url: `/listen/${bookId}` })
    }

    const { data: audiobook } = await supabase
      .from('audiobooks')
      .select('id, status, for_sale, price_cents')
      .eq('book_id', bookId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!audiobook || !audiobook.for_sale) {
      return Response.json({ error: 'This audiobook is not available for purchase' }, { status: 404 })
    }

    // Check if already purchased
    const { data: existing } = await supabase
      .from('audiobook_purchases')
      .select('id')
      .eq('book_id', bookId)
      .eq('buyer_user_id', user.id)
      .maybeSingle()

    if (existing) {
      return Response.json({ alreadyPurchased: true, url: `/store/${bookId}?purchased=true` })
    }

    // Look up Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const priceCents = audiobook.price_cents ?? 999

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: priceCents,
          product_data: {
            name: `${book.title} — Audiobook`,
            description: 'Full-cast AI audiobook. Download M4B + MP3. Keep forever.',
          },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/store/${bookId}?purchased=true`,
      cancel_url: `${appUrl}/store/${bookId}`,
      metadata: {
        type: 'audiobook_purchase',
        userId: user.id,
        bookId,
        audiobookId: audiobook.id,
      },
    }

    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[audiobook/purchase] Error:', err)
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
