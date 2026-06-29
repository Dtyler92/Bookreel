'use client'

import { useState } from 'react'
import Link from 'next/link'

type BillingPeriod = 'monthly' | 'yearly'

// ── Credit economy ─────────────────────────────────────────────────────────────
// Standard trailer  (720p,   4 clips × 5s = 20s + 4s title card)  = 55 credits
// Premium trailer   (1080p, 12 clips × 5s = 60s + 4s title card)  = 150 credits
// Audiobook add-on  (ElevenLabs full MS)                           = 50 credits  (coming soon)
// Social Pack       (vertical cuts + quote cards)                  = 20 credits  (coming soon)

const PLANS = [
  {
    id: 'hobbyist',
    name: 'Hobbyist',
    monthly: 12,
    yearly: 108,  // $9/mo billed annually — save 27% vs monthly
    creditsPerMonth: 55,
    description: 'For authors publishing occasionally.',
    features: [
      '55 credits / month',
      '1 standard trailer/mo or save up credits',
      'Access to all render types',
      'Credits roll over month to month',
      'Free TikTok vertical cut of every trailer',
      'Blurb generator (coming soon)',
    ],
    cta: 'Start Hobbyist',
    highlight: false,
  },
  {
    id: 'author',
    name: 'Author',
    monthly: 30,
    yearly: 288,  // $24/mo billed annually — save 27% vs monthly
    creditsPerMonth: 150,
    description: 'For actively publishing indie authors.',
    features: [
      '150 credits / month',
      '~1 premium trailer or 1–2 standard trailers/mo',
      'Access to all render types',
      'Credits roll over month to month',
      'Free TikTok vertical cut of every trailer',
      'Blurb generator (coming soon)',
      'SEO metadata generator (coming soon)',
    ],
    cta: 'Start Author Plan',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'publisher',
    name: 'Publisher',
    monthly: 88,
    yearly: 828,  // $69/mo billed annually — save 27% vs monthly
    creditsPerMonth: 425,
    description: 'For high-volume authors and small presses.',
    features: [
      '425 credits / month',
      '~2 premium or 7+ standard trailers/mo',
      'Access to all render types',
      'Credits roll over month to month',
      'Free TikTok vertical cut of every trailer',
      'Priority render queue',
      'All coming-soon tools included',
      'Priority support',
    ],
    cta: 'Start Publisher Plan',
    highlight: false,
  },
]

const CREDIT_PACKS = [
  { credits: 100,  price: 22,  perCredit: '0.22', label: 'Starter Pack',   badge: null,             trailers: '1 standard trailer + 1 extra clip' },
  { credits: 300,  price: 63,  perCredit: '0.21', label: 'Author Pack',    badge: 'Most Popular',   trailers: '2 premium or 5 standard trailers' },
  { credits: 700,  price: 140, perCredit: '0.20', label: 'Pro Pack',       badge: 'Best Value',     trailers: '4 premium or 12 standard trailers' },
  { credits: 1500, price: 300, perCredit: '0.20', label: 'Audiobook Pack', badge: 'Full-Cast Audio', trailers: '1 full-cast audiobook or 10 standard trailers' },
]

const QUALITY_TIERS = [
  {
    name: 'Standard',
    resolution: '720p',
    credits: 55,
    runtime: '~24 seconds',
    clips: '4 clips × 5s + 4s title card',
    features: ['Cinematic engine · 720p resolution', '1 character spoken line', 'Cinematic narration + music', 'Social-ready format'],
    badge: null,
  },
  {
    name: 'Premium',
    resolution: '1080p',
    credits: 150,
    runtime: '~64 seconds',
    clips: '12 clips × 5s + 4s title card',
    features: ['Full cinematic engine · 1080p full HD', '4 character spoken lines', 'Native lip-sync · characters brought to life', 'Cinematic narration + music', 'Social-ready format'],
    badge: 'Recommended',
  },
]

const FAQ = [
  {
    q: 'Do credits expire?',
    a: 'Never. Credits you buy or earn from a subscription roll over indefinitely — they\'re yours until you use them.',
  },
  {
    q: 'What\'s the difference between Standard and Premium quality?',
    a: 'Standard delivers a ~24 second 720p trailer (4 cinematic clips + title card) — sharp, punchy, and social-ready. Premium upgrades to a full ~64 second 1080p HD trailer (12 cinematic clips + title card) with 4 character spoken lines brought to life with native lip-sync. Same cinematic engine, same screenplay crafted from your manuscript — Premium just goes deeper into your story.',
  },
  {
    q: 'Can I mix standard and premium renders?',
    a: 'Yes — you choose per render. Have 300 credits? You could do 2 premium trailers (150 each), or 5 standard trailers (55 each), or mix and match however you like.',
  },
  {
    q: 'What happens to my subscription credits if I cancel?',
    a: 'Any credits already in your account remain yours after cancellation. You just won\'t receive new monthly credits — but everything you\'ve accumulated is still usable.',
  },
  {
    q: 'How does the book trailer actually get made?',
    a: 'Upload your manuscript. BookReel reads your story, builds a screenplay from your actual characters and scenes, generates cinematic images and video clips, adds character voices with lip-sync, layers in a music bed matched to your genre, and delivers a finished trailer — all automatically.',
  },
  {
    q: 'Can I buy credits without a subscription?',
    a: 'Absolutely. Credit packs are one-time purchases — no subscription required. Buy what you need, when you need it.',
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>('yearly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const red    = '#C8402F'
  const dark   = '#0D0D0B'
  const muted  = '#8A8278'
  const border = '#E8E2D5'
  const cream  = '#FAFAF7'

  return (
    <div style={{ background: '#FDFCF9', minHeight: '100vh', color: dark }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(253,252,249,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: '60px',
      }}>
        <Link href="/" style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '20px', color: dark, textDecoration: 'none' }}>
          BookReel
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/browse" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: muted, textDecoration: 'none' }}>Browse</Link>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: muted, textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/dashboard" style={{
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', fontWeight: 600,
            color: '#fff', background: red, padding: '8px 18px', borderRadius: '8px', textDecoration: 'none',
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '72px 0 48px' }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
            fontSize: 'clamp(36px, 5vw, 56px)', color: dark, margin: '0 0 16px', lineHeight: 1.15,
          }}>
            Pay for what you use.
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px',
            color: muted, maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.6,
          }}>
            Credits never expire. Subscribe for a monthly top-up, or buy a pack when inspiration strikes.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: 'inline-flex', background: '#EFECE6', borderRadius: '12px', padding: '4px', gap: '2px',
          }}>
            {(['monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setBilling(p)}
                style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', fontWeight: 600,
                  padding: '8px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  background: billing === p ? '#fff' : 'transparent',
                  color: billing === p ? dark : muted,
                  boxShadow: billing === p ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                  transition: 'all 150ms ease',
                }}
              >
                {p === 'monthly' ? 'Monthly' : 'Annual — save 27%'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Subscription Plans ── */}
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
          fontSize: '28px', color: dark, margin: '0 0 24px',
        }}>
          Monthly credit subscription
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '80px' }}>
          {PLANS.map((plan) => {
            const price = billing === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly
            const billed = billing === 'yearly' ? `$${plan.yearly}/yr · save 27%` : `$${plan.yearly}/yr if billed annually`
            return (
              <div key={plan.id} style={{
                background: plan.highlight ? dark : '#fff',
                border: `2px solid ${plan.highlight ? dark : border}`,
                borderRadius: '20px', padding: '32px',
                display: 'flex', flexDirection: 'column',
                position: 'relative', overflow: 'hidden',
              }}>
                {plan.badge && (
                  <span style={{
                    position: 'absolute', top: '20px', right: '20px',
                    background: red, color: '#fff',
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 700,
                    padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {plan.badge}
                  </span>
                )}

                <div style={{
                  fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                  fontSize: '22px', color: plan.highlight ? '#fff' : dark, marginBottom: '6px',
                }}>
                  {plan.name}
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
                  color: plan.highlight ? 'rgba(255,255,255,0.6)' : muted, marginBottom: '20px',
                }}>
                  {plan.description}
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <span style={{
                    fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                    fontSize: '44px', color: plan.highlight ? '#fff' : dark,
                  }}>
                    ${price}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px',
                    color: plan.highlight ? 'rgba(255,255,255,0.5)' : muted,
                  }}>
                    /mo
                  </span>
                </div>
                {billed && (
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px',
                    color: plan.highlight ? 'rgba(255,255,255,0.45)' : muted, marginBottom: '20px',
                  }}>
                    Billed {billed}
                  </div>
                )}

                <div style={{
                  background: plan.highlight ? 'rgba(255,255,255,0.08)' : '#F7F4EF',
                  borderRadius: '10px', padding: '12px 16px', marginBottom: '24px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700,
                    fontSize: '18px', color: plan.highlight ? '#fff' : dark,
                  }}>
                    {plan.creditsPerMonth} credits
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
                    color: plan.highlight ? 'rgba(255,255,255,0.5)' : muted,
                  }}>
                    {' '}/ month
                  </span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{
                      fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px',
                      color: plan.highlight ? 'rgba(255,255,255,0.75)' : '#4A4642',
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                    }}>
                      <span style={{ color: plan.highlight ? 'rgba(255,255,255,0.5)' : red, marginTop: '1px', flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/dashboard" style={{
                  display: 'block', textAlign: 'center', padding: '14px',
                  background: plan.highlight ? red : dark,
                  color: '#fff', borderRadius: '12px',
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', fontWeight: 700,
                  textDecoration: 'none', transition: 'opacity 150ms ease',
                }}>
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>

        {/* ── Quality Tiers ── */}
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
          fontSize: '28px', color: dark, margin: '0 0 12px',
        }}>
          Choose your quality per render
        </h2>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px',
          color: muted, margin: '0 0 28px',
        }}>
          Same cinematic engine, same screenplay crafted from your manuscript — you pick the resolution.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '80px' }}>
          {QUALITY_TIERS.map((qt) => (
            <div key={qt.name} style={{
              background: '#fff', border: `2px solid ${qt.badge ? red : border}`,
              borderRadius: '20px', padding: '28px', position: 'relative',
            }}>
              {qt.badge && (
                <span style={{
                  position: 'absolute', top: '20px', right: '20px',
                  background: red, color: '#fff',
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {qt.badge}
                </span>
              )}
              <div style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '22px', color: dark, marginBottom: '4px' }}>
                {qt.name}
              </div>
              <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: muted, marginBottom: '20px' }}>
                {qt.resolution} · {qt.runtime} · {qt.clips}
              </div>
              <div style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '36px', color: red, marginBottom: '20px' }}>
                {qt.credits} <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', fontWeight: 400, color: muted }}>credits</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {qt.features.map((f, i) => (
                  <li key={i} style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px',
                    color: '#4A4642', display: 'flex', alignItems: 'flex-start', gap: '10px',
                  }}>
                    <span style={{ color: red, flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Credit Packs ── */}
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
          fontSize: '28px', color: dark, margin: '0 0 12px',
        }}>
          One-time credit packs
        </h2>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px',
          color: muted, margin: '0 0 28px',
        }}>
          No subscription needed. Credits never expire.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '80px' }}>
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.credits} style={{
              background: pack.badge === 'Best Value' ? dark : '#fff',
              border: `2px solid ${pack.badge ? (pack.badge === 'Best Value' ? dark : red) : border}`,
              borderRadius: '18px', padding: '28px', position: 'relative',
            }}>
              {pack.badge && (
                <span style={{
                  position: 'absolute', top: '18px', right: '18px',
                  background: pack.badge === 'Best Value' ? red : red,
                  color: '#fff',
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', fontWeight: 700,
                  padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {pack.badge}
                </span>
              )}
              <div style={{
                fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                fontSize: '20px', color: pack.badge === 'Best Value' ? '#fff' : dark, marginBottom: '6px',
              }}>
                {pack.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
                color: pack.badge === 'Best Value' ? 'rgba(255,255,255,0.55)' : muted, marginBottom: '16px',
              }}>
                {pack.trailers}
              </div>
              <div style={{
                fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                fontSize: '40px', color: pack.badge === 'Best Value' ? '#fff' : dark,
              }}>
                ${pack.price}
              </div>
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
                color: pack.badge === 'Best Value' ? 'rgba(255,255,255,0.45)' : muted, marginBottom: '20px',
              }}>
                {pack.credits} credits · ${pack.perCredit}/credit
              </div>
              <Link href="/dashboard" style={{
                display: 'block', textAlign: 'center', padding: '12px',
                background: red, color: '#fff', borderRadius: '10px',
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', fontWeight: 700,
                textDecoration: 'none',
              }}>
                Buy {pack.credits} credits
              </Link>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div style={{ maxWidth: '680px', margin: '0 auto 80px' }}>
          <h2 style={{
            fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
            fontSize: '28px', color: dark, margin: '0 0 28px', textAlign: 'center',
          }}>
            Common questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{
                background: '#fff', border: `1.5px solid ${border}`,
                borderRadius: '14px', overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '20px 24px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: '15px', color: dark }}>
                    {item.q}
                  </span>
                  <span style={{ color: red, fontSize: '18px', flexShrink: 0 }}>
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px' }}>
                    <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: muted, lineHeight: 1.65, margin: 0 }}>
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust footer */}
        <div style={{ textAlign: 'center', paddingBottom: '60px' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: muted }}>
            🔒 Credits never expire · No contracts · Cancel anytime · Secure billing via Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
