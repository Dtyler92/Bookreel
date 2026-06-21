import Link from 'next/link'

export const metadata = {
  title: 'Content Policy & Terms of Use — BookReel',
  description: 'BookReel content policy and terms of use for authors.',
}

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAF7',
        padding: '64px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '13px',
              color: '#C8402F',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-block',
              marginBottom: '32px',
            }}
          >
            ← Back to BookReel
          </Link>

          {/* Diamond Rule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E8E2D5' }} />
            <span style={{ color: '#C8402F', fontSize: '10px' }}>◆</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E8E2D5' }} />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: '40px',
              fontWeight: 700,
              color: '#0D0D0B',
              lineHeight: 1.2,
              marginBottom: '16px',
            }}
          >
            Content Policy &amp; Terms of Use
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: '#8A8278',
            }}
          >
            Last updated: June 2025
          </p>
        </div>

        {/* Section divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #E8E2D5', marginBottom: '40px' }} />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '40px',
          }}
        >
          {/* Purpose */}
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: '24px',
                fontWeight: 700,
                color: '#0D0D0B',
                marginBottom: '16px',
              }}
            >
              What BookReel Is For
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '15px',
                color: '#3D3D35',
                lineHeight: 1.7,
              }}
            >
              BookReel is a platform for authors to create cinematic book trailers from their manuscripts.
              Our cinematic engine is designed exclusively for <strong>literary book trailer production</strong> —
              turning the characters, scenes, and atmosphere of published or in-progress novels into
              compelling visual and video content.
            </p>
          </section>

          {/* Content Policy */}
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: '24px',
                fontWeight: 700,
                color: '#0D0D0B',
                marginBottom: '16px',
              }}
            >
              Content Policy
            </h2>

            {/* Not Allowed */}
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                padding: '24px',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#991B1B',
                  marginBottom: '14px',
                }}
              >
                ✕ &nbsp;Not Permitted
              </h3>
              <ul
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '15px',
                  color: '#3D3D35',
                  lineHeight: 1.7,
                  paddingLeft: '20px',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: '8px',
                }}
              >
                <li>Pornographic or sexually explicit content of any kind</li>
                <li>Nudity or graphic depictions of sex acts</li>
                <li>Content uploaded with the intent to generate explicit sexual imagery</li>
                <li>Material that sexualizes minors in any form</li>
              </ul>
            </div>

            {/* Allowed */}
            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '24px',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#166534',
                  marginBottom: '14px',
                }}
              >
                ✓ &nbsp;Permitted
              </h3>
              <ul
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '15px',
                  color: '#3D3D35',
                  lineHeight: 1.7,
                  paddingLeft: '20px',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: '8px',
                }}
              >
                <li>Romance, attraction, and emotional intimacy between characters</li>
                <li>Scandalous, tension-filled, and suggestive scenes</li>
                <li>Leading or seductive content appropriate for book marketing</li>
                <li>Cinematic depictions of conflict and literary violence</li>
                <li>Mature themes handled with the craft expected of published fiction</li>
              </ul>
            </div>
          </section>

          {/* Enforcement */}
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: '24px',
                fontWeight: 700,
                color: '#0D0D0B',
                marginBottom: '16px',
              }}
            >
              Enforcement &amp; Responsibility
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                gap: '16px',
              }}
            >
              {[
                {
                  icon: '⚖️',
                  text: 'We reserve the right to remove content, suspend accounts, or refuse service to any author who violates these terms — at our sole discretion.',
                },
                {
                  icon: '📖',
                  text: 'Authors are solely responsible for the content they upload. By using BookReel, you represent that your manuscript and the materials you submit comply with this policy.',
                },
                {
                  icon: '🛡️',
                  text: 'BookReel employs automated content moderation on all AI-generated outputs. However, no automated system is perfect — we rely on authors to use the platform in good faith.',
                },
                {
                  icon: '✉️',
                  text: 'To report a violation or ask a question about our policy, contact us at support@bookreel.app.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    background: '#F4F1EB',
                    border: '1px solid #E8E2D5',
                    borderRadius: '10px',
                    padding: '18px 20px',
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '15px',
                      color: '#3D3D35',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Closing rule */}
          <hr style={{ border: 'none', borderTop: '1px solid #E8E2D5' }} />

          <p
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontStyle: 'italic',
              fontSize: '15px',
              color: '#8A8278',
              textAlign: 'center' as const,
            }}
          >
            BookReel exists to celebrate great stories — not to create harmful content.
          </p>
        </div>
      </div>
    </div>
  )
}
