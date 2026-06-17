import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // One-time trailer credit purchase
        if (session.mode === 'payment' && session.metadata?.type === 'trailer_credit') {
          const userId = session.metadata.userId
          if (userId) {
            // Grant 1 credit + log to ledger
            const { data: profile } = await supabase
              .from('profiles')
              .select('trailer_credits, purchased_credits_total')
              .eq('id', userId)
              .single()

            const newBalance = (profile?.trailer_credits ?? 0) + 1
            await supabase
              .from('profiles')
              .update({
                trailer_credits: newBalance,
                purchased_credits_total: (profile?.purchased_credits_total ?? 0) + 1,
              })
              .eq('id', userId)

            await supabase.from('credit_ledger').insert({
              user_id: userId,
              delta: 1,
              reason: 'purchase',
              balance_after: newBalance,
            })
          }
          break
        }

        // Subscription checkout
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Retrieve subscription to get the plan details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id

        // Determine tier from price ID
        const tier = getTierFromPriceId(priceId)

        // Update profile by stripe_customer_id
        await supabase
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status

        await supabase
          .from('profiles')
          .update({ subscription_status: status })
          .eq('stripe_customer_id', customerId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

function getTierFromPriceId(priceId: string): string {
  const authorPriceIds = [
    process.env.STRIPE_AUTHOR_MONTHLY_PRICE_ID,
    process.env.STRIPE_AUTHOR_YEARLY_PRICE_ID,
    process.env.STRIPE_AUTHOR_BETA_PRICE_ID,
  ]
  const proPriceIds = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    process.env.STRIPE_PRO_BETA_PRICE_ID,
  ]

  if (authorPriceIds.includes(priceId)) return 'author'
  if (proPriceIds.includes(priceId)) return 'pro'
  return 'free'
}
