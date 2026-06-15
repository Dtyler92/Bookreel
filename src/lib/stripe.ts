import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true
})

export const PLANS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    betaPrice: 0,
    trailersPerMonth: 0,
    quality: 'none',
    features: [
      'Book listing page',
      'Amazon & store links',
      'Basic reader discovery',
    ]
  },
  author: {
    name: 'Author',
    monthlyPrice: 2900, // in cents
    yearlyPrice: 1900, // per month in cents
    betaPrice: 900,
    trailersPerMonth: 1,
    quality: 'standard',
    features: [
      '1 trailer per month',
      'Standard quality trailer',
      '3 social media cuts/mo',
      '3 quote graphics/mo',
      'Weekly performance report',
      'Monthly newsletter blurb',
      'Basic press kit',
    ]
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 5900,
    yearlyPrice: 4900,
    betaPrice: 2900,
    trailersPerMonth: 2,
    quality: 'cinematic',
    features: [
      '2 trailers per month',
      'Cinematic quality trailer',
      'Unlimited social media cuts',
      '5 quote graphics/mo',
      'Full analytics dashboard',
      'Priority feed placement',
      'Quarterly genre newsletter feature',
      'New release boost (1/quarter)',
      'Amazon rank tracker',
      'A/B trailer testing',
      'Full press kit',
    ]
  }
}

export type PlanName = keyof typeof PLANS
