'use client';

import { useState } from 'react';
import Link from 'next/link';

type BillingPeriod = 'monthly' | 'yearly' | 'beta';

const faqData = [
  {
    q: 'Can I really lock in Beta pricing forever?',
    a: "Yes — that's our promise to our founding members. If you subscribe during Beta, your rate never changes, even when we raise prices for new users. Consider it our thank-you for believing in us early.",
  },
  {
    q: 'What happens when Beta ends?',
    a: "Your plan stays exactly as-is. Founding Members get grandfathered pricing permanently. You'll have access to all features at your locked-in rate — we'll simply open up to new users at higher pricing.",
  },
  {
    q: 'How does the book trailer actually get made?',
    a: "You upload your manuscript and tell us about your book — genre, tone, key characters. BookReel reads your story and builds a cinematic trailer from your actual content — your characters, your scenes, your words. Pro members get priority turnaround.",
  },
  {
    q: 'Can I upgrade or downgrade between plans?',
    a: "Absolutely. You can move between Free, Author, and Pro at any time. If you upgrade mid-cycle, we'll prorate the difference. If you downgrade, the change takes effect at the end of your current billing period.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const authorPrice = billing === 'monthly' ? '$29' : billing === 'yearly' ? '$19' : '$9';
  const proPrice = billing === 'monthly' ? '$59' : billing === 'yearly' ? '$49' : '$29';

  const authorNote =
    billing === 'yearly'
      ? 'Billed $228/yr. That\'s two months free.'
      : billing === 'beta'
      ? 'Founding Member rate. Yours forever.'
      : null;

  const proNote =
    billing === 'yearly'
      ? 'Billed $588/yr. Save $120 a year.'
      : billing === 'beta'
      ? 'Billed $348/yr. Founding Member rate — yours forever.'
      : null;

  return (
    <div
      style={{
        fontFamily: 'var(--font-inter), sans-serif',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-body)',
        minHeight: '100vh',
      }}
    >
      {/* ── 1. Beta Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2C1810 0%, #3D2318 50%, #1A0F08 100%)',
          color: '#F4E4C1',
          padding: '14px 24px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.01em',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            backgroundColor: '#E8C97A',
            color: '#1A0F08',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            padding: '2px 8px',
            borderRadius: '2px',
            marginRight: '10px',
            verticalAlign: 'middle',
          }}
        >
          🎬 FOUNDING MEMBER
        </span>
        BookReel is in Beta — Founding Member pricing available for the first 100 authors. Lock in
        your rate forever. ✦{' '}
        <span style={{ color: '#E8C97A', fontWeight: 700 }}>73 spots remaining</span>
      </div>

      {/* ── Nav ── */}
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 text-2xl select-none no-underline">
          <span
            style={{
              color: 'var(--color-text-heading)',
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 900,
            }}
          >
            Book
          </span>
          <span
            style={{
              display: 'inline-block',
              width: '11px',
              height: '11px',
              border: '2px solid var(--color-accent)',
              outline: '1px solid var(--color-accent)',
              outlineOffset: '2px',
              backgroundColor: 'var(--color-bg-primary)',
            }}
          />
          <span
            style={{
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 900,
              fontStyle: 'italic',
            }}
          >
            Reel
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <a
            href="/#how-it-works"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-heading)' }}
          >
            How It Works
          </a>
          <Link
            href="/pricing"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--color-accent)', fontWeight: 700 }}
          >
            Pricing
          </Link>
          <Link
            href="/for-authors"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-heading)' }}
          >
            For Authors
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-heading)' }}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-inverse)',
              borderRadius: '4px',
            }}
          >
            Make My Trailer
          </Link>
        </nav>
      </header>

      <main>
        {/* ── 2. Page Header ── */}
        <section
          className="text-center px-6"
          style={{ paddingTop: '72px', paddingBottom: '48px', maxWidth: '720px', margin: '0 auto' }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 900,
              fontSize: 'clamp(36px, 5vw, 56px)',
              color: 'var(--color-text-heading)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '20px',
            }}
          >
            Your story deserves to be seen.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.7,
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            BookReel turns your book into a cinematic experience — trailers, social content, and
            marketing assets, all in one place. Pick the plan that fits where you are in your
            writing journey.
          </p>
        </section>

        {/* ── 3. Pricing Toggle ── */}
        <div className="flex justify-center" style={{ marginBottom: '16px' }}>
          <div
            className="flex items-center gap-1 p-1"
            style={{
              backgroundColor: '#F4F1EB',
              borderRadius: '40px',
              display: 'inline-flex',
            }}
          >
            {/* Monthly */}
            <button
              onClick={() => setBilling('monthly')}
              style={{
                padding: '8px 22px',
                borderRadius: '32px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: billing === 'monthly' ? 700 : 500,
                backgroundColor: billing === 'monthly' ? '#ffffff' : 'transparent',
                color: billing === 'monthly' ? 'var(--color-text-heading)' : 'var(--color-text-muted)',
                boxShadow: billing === 'monthly' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              Monthly
            </button>

            {/* Yearly */}
            <button
              onClick={() => setBilling('yearly')}
              style={{
                padding: '8px 22px',
                borderRadius: '32px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: billing === 'yearly' ? 700 : 500,
                backgroundColor: billing === 'yearly' ? '#ffffff' : 'transparent',
                color: billing === 'yearly' ? 'var(--color-text-heading)' : 'var(--color-text-muted)',
                boxShadow: billing === 'yearly' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-inter), sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Yearly
              <span
                style={{
                  backgroundColor: '#C0392B',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  padding: '2px 5px',
                  borderRadius: '2px',
                }}
              >
                SAVE 34%
              </span>
            </button>

            {/* Beta */}
            <button
              onClick={() => setBilling('beta')}
              style={{
                padding: '8px 22px',
                borderRadius: '32px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: billing === 'beta' ? 700 : 500,
                backgroundColor: billing === 'beta' ? '#2C1810' : 'transparent',
                color: billing === 'beta' ? '#E8C97A' : 'var(--color-text-muted)',
                boxShadow: billing === 'beta' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-inter), sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: billing === 'beta' ? '#E8C97A' : '#A89070',
                  display: 'inline-block',
                  animation: billing === 'beta' ? 'goldPulse 1.5s ease-in-out infinite' : 'none',
                }}
              />
              Beta
            </button>
          </div>
        </div>

        {/* ── 4. Yearly savings note ── */}
        {billing === 'yearly' && (
          <p
            className="text-center"
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
              marginBottom: '8px',
              padding: '0 16px',
            }}
          >
            Switch to yearly and keep two months in your pocket — more budget for coffee, edits,
            and that next book.
          </p>
        )}

        {/* ── 5. Pricing Cards ── */}
        <section
          className="px-6"
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            paddingTop: '32px',
            paddingBottom: '64px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* ── FREE CARD ── */}
            <div
              style={{
                backgroundColor: '#FAFAF7',
                border: '1px solid rgba(138,130,120,0.25)',
                borderRadius: '8px',
                padding: '36px 32px',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 900,
                  fontSize: '26px',
                  color: 'var(--color-text-heading)',
                  marginBottom: '4px',
                }}
              >
                Free
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: 'var(--color-text-muted)',
                  marginBottom: '24px',
                }}
              >
                Claim your shelf.
              </p>

              <div style={{ marginBottom: '6px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontWeight: 900,
                    fontSize: '48px',
                    color: 'var(--color-text-heading)',
                    lineHeight: 1,
                  }}
                >
                  $0
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  marginBottom: '28px',
                }}
              >
                Always free. No card needed.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                {[
                  'Public author profile',
                  'Book listing page',
                  'Genre discovery placement',
                  'Reader-facing press page',
                ].map((f) => (
                  <li
                    key={f}
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '14px',
                      color: 'var(--color-text-body)',
                      padding: '6px 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        color: '#C0392B',
                        fontWeight: 700,
                        lineHeight: '1.5',
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 24px',
                  border: '1.5px solid rgba(138,130,120,0.5)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-heading)',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                Start Free
              </Link>
            </div>

            {/* ── AUTHOR CARD ── */}
            <div
              style={{
                backgroundColor: '#F4F1EB',
                border: '1px solid rgba(138,130,120,0.3)',
                borderRadius: '8px',
                padding: '36px 32px',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 900,
                  fontSize: '26px',
                  color: 'var(--color-text-heading)',
                  marginBottom: '4px',
                }}
              >
                Author
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: 'var(--color-text-muted)',
                  marginBottom: '24px',
                }}
              >
                Write it. Show it. Sell it.
              </p>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '6px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontWeight: 900,
                    fontSize: '48px',
                    color: 'var(--color-text-heading)',
                    lineHeight: 1,
                  }}
                >
                  {authorPrice}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '14px',
                    color: 'var(--color-text-muted)',
                    marginBottom: '8px',
                  }}
                >
                  /mo
                </span>
              </div>

              <div style={{ minHeight: '44px', marginBottom: '20px' }}>
                {authorNote && (
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    {authorNote}
                  </p>
                )}
                {billing === 'beta' && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '6px',
                      backgroundColor: '#E8C97A',
                      color: '#1A0F08',
                      fontSize: '9px',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      padding: '3px 8px',
                      borderRadius: '2px',
                    }}
                  >
                    🔖 FOUNDING MEMBER
                  </span>
                )}
                {billing === 'monthly' && (
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Billed monthly.
                  </p>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                {[
                  '1 book trailer per month',
                  'Standard cinematic quality',
                  '3 short-form social cuts',
                  '3 custom quote graphics',
                  'Weekly performance report',
                  'Newsletter blurb, ready to paste',
                  'Digital press kit',
                ].map((f) => (
                  <li
                    key={f}
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '14px',
                      color: 'var(--color-text-body)',
                      padding: '6px 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <span style={{ color: '#C0392B', fontWeight: 700, lineHeight: '1.5', flexShrink: 0 }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup?plan=author"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 24px',
                  backgroundColor: 'var(--color-accent)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-inverse)',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                Start Writing
              </Link>
            </div>

            {/* ── PRO CARD ── */}
            <div style={{ position: 'relative' }}>
              {/* Most Popular badge */}
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '10px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.2em',
                    color: '#E8C97A',
                    background: 'linear-gradient(90deg, #E8C97A 0%, #F5E09A 50%, #E8C97A 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% auto',
                    animation: 'shimmer 2.5s linear infinite',
                  }}
                >
                  ✦ MOST POPULAR ✦
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#1A1208',
                  borderRadius: '8px',
                  padding: '40px 36px',
                  transform: 'translateY(-12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Decorative ✦ bottom right */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '24px',
                    fontSize: '48px',
                    color: '#E8C97A',
                    opacity: 0.2,
                    fontFamily: 'serif',
                    lineHeight: 1,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  ✦
                </span>

                <h2
                  style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontWeight: 900,
                    fontSize: '26px',
                    color: '#F4E4C1',
                    marginBottom: '4px',
                  }}
                >
                  Pro
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontStyle: 'italic',
                    fontSize: '14px',
                    color: 'rgba(232, 201, 122, 0.7)',
                    marginBottom: '24px',
                  }}
                >
                  For authors who mean business.
                </p>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-playfair), serif',
                      fontWeight: 900,
                      fontSize: '48px',
                      color: '#F4E4C1',
                      lineHeight: 1,
                    }}
                  >
                    {proPrice}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '14px',
                      color: 'rgba(244,228,193,0.6)',
                      marginBottom: '8px',
                    }}
                  >
                    /mo
                  </span>
                </div>

                <div style={{ minHeight: '44px', marginBottom: '20px' }}>
                  {proNote && (
                    <p
                      style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '12px',
                        color: 'rgba(244,228,193,0.7)',
                        lineHeight: 1.5,
                      }}
                    >
                      {proNote}
                    </p>
                  )}
                  {billing === 'beta' && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        backgroundColor: '#E8C97A',
                        color: '#1A0F08',
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        padding: '3px 8px',
                        borderRadius: '2px',
                      }}
                    >
                      🔖 FOUNDING MEMBER
                    </span>
                  )}
                  {billing === 'monthly' && (
                    <p
                      style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '12px',
                        color: 'rgba(244,228,193,0.6)',
                      }}
                    >
                      Billed monthly.
                    </p>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                  {[
                    '2 book trailers per month',
                    'Cinematic quality — director\'s cut',
                    'Unlimited short-form social cuts',
                    '5 custom quote graphics',
                    'Full analytics dashboard',
                    'Priority placement in genre feeds',
                    'Genre-targeted newsletter feature',
                    'New release boost (launch week)',
                    'Amazon ranking tracker',
                    'A/B testing for trailers & covers',
                  ].map((f) => (
                    <li
                      key={f}
                      style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '14px',
                        color: '#F4E4C1',
                        padding: '6px 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <span style={{ color: '#E8C97A', fontWeight: 700, lineHeight: '1.5', flexShrink: 0 }}>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup?plan=pro"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '12px 24px',
                    backgroundColor: 'var(--color-accent)',
                    border: '1.5px solid #E8C97A',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#ffffff',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  Go Cinematic
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Trust Line ── */}
        <p
          className="text-center px-6"
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            marginBottom: '72px',
          }}
        >
          🔒 No contracts · Cancel anytime · Secure billing via Stripe · Trusted by indie authors
        </p>

        {/* ── 7. FAQ Section ── */}
        <section
          className="px-6"
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            paddingBottom: '80px',
          }}
        >
          <h2
            className="text-center"
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 900,
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              color: 'var(--color-text-heading)',
              marginBottom: '40px',
            }}
          >
            Questions & Answers
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {faqData.map((item, idx) => (
              <div
                key={idx}
                style={{
                  borderTop: idx === 0 ? '1px solid var(--color-border)' : 'none',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '20px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--color-text-heading)',
                    }}
                  >
                    {item.q}
                  </span>
                  <span
                    style={{
                      color: 'var(--color-text-muted)',
                      fontSize: '18px',
                      fontWeight: 300,
                      lineHeight: 1,
                      flexShrink: 0,
                      transition: 'transform 0.2s',
                      transform: openFaq === idx ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                  >
                    +
                  </span>
                </button>

                {openFaq === idx && (
                  <div
                    style={{
                      paddingBottom: '20px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '14px',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.75,
                        margin: 0,
                      }}
                    >
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── 8. Footer tagline ── */}
      <footer
        className="text-center px-8 py-10"
        style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
      >
        <p
          style={{
            fontFamily: 'var(--font-playfair), serif',
            fontStyle: 'italic',
            fontSize: '18px',
            color: 'var(--color-text-muted)',
            marginBottom: '8px',
          }}
        >
          Every great story deserves an audience.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}
        >
          © {new Date().getFullYear()} BookReel. All rights reserved.
        </p>
      </footer>

      {/* Keyframe animations */}
      <style>{`
        @keyframes goldPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
