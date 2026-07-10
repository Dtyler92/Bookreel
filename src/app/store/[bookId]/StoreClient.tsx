'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Chapter {
  index: number
  title: string
  startSeconds: number
}

export interface StoreClientProps {
  bookId: string
  title: string
  genre?: string
  description?: string
  coverUrl?: string
  authorName: string
  durationSeconds?: number
  chapters: Chapter[]
  priceCents: number
  hasPurchased: boolean
  previewAudioUrl?: string
  isLoggedIn: boolean
  m4bUrl?: string
  mp3Url?: string
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ── Accordion item ────────────────────────────────────────────────────────────
function AccordionItem({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        borderBottom: '1px solid #E8E2D5',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.875rem 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#0D0D0B',
          textAlign: 'left',
        }}
        aria-expanded={open}
      >
        {title}
        <span
          style={{
            fontSize: '1rem',
            color: '#8A8278',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            display: 'inline-block',
            marginLeft: 8,
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            paddingBottom: '1rem',
            color: '#0D0D0B',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '0.875rem',
            lineHeight: 1.7,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StoreClient({
  bookId,
  title,
  genre,
  description,
  coverUrl,
  authorName,
  durationSeconds,
  chapters,
  priceCents,
  hasPurchased,
  previewAudioUrl,
  isLoggedIn,
  m4bUrl,
  mp3Url,
}: StoreClientProps) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [howToOpen, setHowToOpen] = useState(false)

  const priceDisplay = formatPrice(priceCents)

  // 60-second preview enforcement
  function handleTimeUpdate() {
    const audio = audioRef.current
    if (audio && audio.currentTime >= 60) {
      audio.pause()
      audio.currentTime = 60
    }
  }

  async function handlePurchase() {
    setPurchasing(true)
    setPurchaseError(null)
    try {
      const res = await fetch(`/api/audiobook/${bookId}/purchase`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Purchase failed. Please try again.')
      }
      const { url } = await res.json()
      if (url) {
        window.location.href = url
      }
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#FAFAF7',
        fontFamily: 'var(--font-inter), sans-serif',
        color: '#0D0D0B',
        padding: '0 0 4rem',
      }}
    >
      {/* ── Top nav bar ── */}
      <nav
        style={{
          borderBottom: '1px solid #E8E2D5',
          background: '#FFFFFF',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 900,
            fontSize: '1.15rem',
            color: '#C8402F',
            letterSpacing: '-0.01em',
          }}
        >
          BookReel
        </span>
      </nav>

      {/* ── Content container ── */}
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '1.5rem 1.25rem 0',
        }}
      >
        {/* ── 1. Book hero ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: 12,
            padding: '1.25rem',
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'flex-start',
            marginBottom: '1rem',
          }}
        >
          {/* Cover */}
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${title} cover`}
              width={120}
              height={180}
              style={{
                borderRadius: 8,
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 180,
                borderRadius: 8,
                background: '#E8E2D5',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8A8278',
                fontSize: '2rem',
              }}
            >
              📖
            </div>
          )}

          {/* Meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {genre && (
              <span
                style={{
                  display: 'inline-block',
                  background: '#FFF3F1',
                  color: '#C8402F',
                  border: '1px solid #F5C6BF',
                  borderRadius: 20,
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {genre}
              </span>
            )}

            <h1
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: 'clamp(1.25rem, 5vw, 1.75rem)',
                fontWeight: 700,
                color: '#0D0D0B',
                margin: '0 0 0.35rem',
                lineHeight: 1.25,
              }}
            >
              {title}
            </h1>

            <p
              style={{
                color: '#8A8278',
                fontSize: '0.875rem',
                margin: '0 0 0.75rem',
              }}
            >
              by {authorName}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              {durationSeconds && (
                <span
                  style={{
                    color: '#8A8278',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  🕐 {formatDuration(durationSeconds)}
                </span>
              )}
              {chapters.length > 0 && (
                <span
                  style={{
                    color: '#8A8278',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  📑 {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        {description && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8E2D5',
              borderRadius: 12,
              padding: '1.25rem',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0D0D0B',
                margin: '0 0 0.6rem',
              }}
            >
              About this book
            </h2>
            <p
              style={{
                color: '#0D0D0B',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {description}
            </p>
          </div>
        )}

        {/* ── 2. Price display ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: 12,
            padding: '1.25rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
              marginBottom: '0.4rem',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: '2.25rem',
                fontWeight: 700,
                color: '#0D0D0B',
                lineHeight: 1,
              }}
            >
              {priceDisplay}
            </span>
          </div>
          <p
            style={{
              color: '#8A8278',
              fontSize: '0.8rem',
              margin: '0 0 1.25rem',
            }}
          >
            One-time purchase · Download M4B + MP3 · Keep forever
          </p>

          {/* ── 3. What's included ── */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {[
              'M4B for Apple Books / iPhone — full chapter navigation',
              'MP3 for any device',
              'Full chapter navigation',
              'AI-narrated full cast',
            ].map((item, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#0D0D0B',
                }}
              >
                <span style={{ color: '#2E7D32', fontWeight: 700, flexShrink: 0 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── 4. Free preview player ── */}
        {previewAudioUrl && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8E2D5',
              borderRadius: 12,
              padding: '1.25rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              <span
                style={{
                  background: '#FFF3F1',
                  color: '#C8402F',
                  border: '1px solid #F5C6BF',
                  borderRadius: 20,
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                FREE PREVIEW
              </span>
              <span style={{ color: '#8A8278', fontSize: '0.8rem' }}>First 60 seconds</span>
            </div>
            <audio
              ref={audioRef}
              src={previewAudioUrl}
              controls
              onTimeUpdate={handleTimeUpdate}
              style={{
                width: '100%',
                borderRadius: 8,
                outline: 'none',
              }}
              preload="metadata"
            />
          </div>
        )}

        {/* ── 5. Purchase / download section ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: 12,
            padding: '1.25rem',
            marginBottom: '1rem',
          }}
        >
          {hasPurchased ? (
            /* ── Already purchased ── */
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>🎉</span>
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#0D0D0B',
                      margin: 0,
                    }}
                  >
                    Download Your Copy
                  </p>
                  <p style={{ color: '#8A8278', fontSize: '0.8rem', margin: 0 }}>
                    You own this audiobook
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {m4bUrl && (
                  <a
                    href={m4bUrl}
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1.25rem',
                      background: '#2E7D32',
                      color: '#FFFFFF',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    ⬇ Download M4B
                  </a>
                )}
                {mp3Url && (
                  <a
                    href={mp3Url}
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1.25rem',
                      background: '#FFFFFF',
                      color: '#2E7D32',
                      border: '2px solid #2E7D32',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    ⬇ Download MP3
                  </a>
                )}
              </div>
            </div>
          ) : !isLoggedIn ? (
            /* ── Not logged in ── */
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  color: '#8A8278',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                Create a free account to purchase this audiobook.
              </p>
              <a
                href={`/login?redirect=/store/${bookId}`}
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 2rem',
                  background: '#C8402F',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                Sign in to purchase
              </a>
            </div>
          ) : (
            /* ── Logged in, not yet purchased ── */
            <div>
              {purchaseError && (
                <div
                  style={{
                    background: '#FFF3F1',
                    border: '1px solid #F5C6BF',
                    borderRadius: 8,
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    color: '#C8402F',
                    fontSize: '0.875rem',
                  }}
                >
                  {purchaseError}
                </div>
              )}
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.5rem',
                  background: purchasing ? '#E88A7F' : '#C8402F',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: purchasing ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {purchasing ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTop: '2px solid #FFFFFF',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Processing…
                  </>
                ) : (
                  `Buy for ${priceDisplay}`
                )}
              </button>
              <p
                style={{
                  textAlign: 'center',
                  color: '#8A8278',
                  fontSize: '0.75rem',
                  marginTop: '0.6rem',
                  marginBottom: 0,
                }}
              >
                Secure checkout via Stripe · Instant download after payment
              </p>
            </div>
          )}
        </div>

        {/* ── 6. How to listen accordion ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: 12,
            padding: '0.25rem 1.25rem',
            marginBottom: '1rem',
          }}
        >
          {/* Outer toggle */}
          <button
            onClick={() => setHowToOpen((o) => !o)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0D0D0B',
              textAlign: 'left',
            }}
            aria-expanded={howToOpen}
          >
            🎧 How to listen
            <span
              style={{
                fontSize: '1rem',
                color: '#8A8278',
                transition: 'transform 0.2s',
                transform: howToOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block',
              }}
            >
              ▾
            </span>
          </button>

          {howToOpen && (
            <div style={{ paddingBottom: '0.5rem' }}>
              <AccordionItem title="📱 iPhone / iPad">
                <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  <li>Download the <strong>M4B</strong> file.</li>
                  <li>Tap the Share icon and choose <strong>"Copy to Books"</strong>.</li>
                  <li>The audiobook opens in Apple Books — complete with chapters.</li>
                </ol>
              </AccordionItem>

              <AccordionItem title="💻 Mac">
                <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  <li>Download the <strong>M4B</strong> file.</li>
                  <li>Double-click it — it opens directly in <strong>Apple Books</strong>.</li>
                </ol>
              </AccordionItem>

              <AccordionItem title="🤖 Android">
                <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  <li>Download the <strong>MP3</strong> file.</li>
                  <li>
                    Open it with <strong>Smart AudioBook Player</strong> (free on Google Play) or
                    any podcast/audio app.
                  </li>
                </ol>
              </AccordionItem>

              <AccordionItem title="🪟 Windows">
                <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  <li>Download the <strong>MP3</strong> or <strong>M4B</strong>.</li>
                  <li>
                    Drag the file into <strong>iTunes</strong> → it syncs to your iPhone
                    automatically.
                  </li>
                </ol>
              </AccordionItem>

              <AccordionItem title="🌐 Any device">
                <p style={{ margin: 0 }}>
                  The <strong>MP3</strong> works in any music app, podcast player, or media player
                  — Spotify, VLC, Apple Music, you name it.
                </p>
              </AccordionItem>
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: '#8A8278',
            fontSize: '0.75rem',
            marginTop: '2rem',
          }}
        >
          Powered by{' '}
          <span style={{ color: '#C8402F', fontWeight: 600 }}>BookReel</span> · Questions?{' '}
          <a href="mailto:support@bookreel.co" style={{ color: '#8A8278' }}>
            support@bookreel.co
          </a>
        </p>
      </div>

      {/* Spinner keyframes injected globally */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
