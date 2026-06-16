import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const products = [
  {
    envKey: 'STRIPE_AUTHOR_MONTHLY_PRICE_ID',
    productName: 'BookReel Author - Monthly',
    amount: 2900,
    interval: 'month',
    description: '1 trailer/mo, standard quality, social cuts, quote graphics, weekly report'
  },
  {
    envKey: 'STRIPE_AUTHOR_YEARLY_PRICE_ID', 
    productName: 'BookReel Author - Yearly',
    amount: 22800,
    interval: 'year',
    description: '1 trailer/mo, standard quality — billed yearly ($19/mo equivalent)'
  },
  {
    envKey: 'STRIPE_AUTHOR_BETA_PRICE_ID',
    productName: 'BookReel Author - Beta (Founding Member)',
    amount: 10800,
    interval: 'year',
    description: 'Founding Member rate — $9/mo equivalent, locked in forever, billed yearly'
  },
  {
    envKey: 'STRIPE_PRO_MONTHLY_PRICE_ID',
    productName: 'BookReel Pro - Monthly',
    amount: 5900,
    interval: 'month',
    description: '2 trailers/mo, cinematic quality, full analytics, priority placement'
  },
  {
    envKey: 'STRIPE_PRO_YEARLY_PRICE_ID',
    productName: 'BookReel Pro - Yearly',
    amount: 58800,
    interval: 'year',
    description: '2 trailers/mo, cinematic quality — billed yearly ($49/mo equivalent)'
  },
  {
    envKey: 'STRIPE_PRO_BETA_PRICE_ID',
    productName: 'BookReel Pro - Beta (Founding Member)',
    amount: 34800,
    interval: 'year',
    description: 'Founding Member rate — $29/mo equivalent, locked in forever, billed yearly'
  }
]

const results = {}

for (const plan of products) {
  // Create product
  const product = await stripe.products.create({
    name: plan.productName,
    description: plan.description,
  })

  // Create price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'usd',
    recurring: { interval: plan.interval },
  })

  results[plan.envKey] = price.id
  console.log(`✅ ${plan.productName}: ${price.id}`)
}

console.log('\n--- PRICE IDs TO ADD TO VERCEL ---')
for (const [key, value] of Object.entries(results)) {
  console.log(`${key}=${value}`)
}
