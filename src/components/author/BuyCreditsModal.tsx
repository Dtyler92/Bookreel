'use client'

import { useState } from 'react'

interface CreditPack {
  pack: 'starter' | 'author' | 'pro'
  credits: number
  price: string
  perCredit: string
  badge?: string
  description: string
}

const PACKS: CreditPack[] = [
  {
    pack: 'starter',
    credits: 100,
    price: '$19',
    perCredit: '$0.19 / credit',
    description: '1 premium trailer or 1 standard + extras',
  },
  {
    pack: 'author',
    credits: 300,
    price: '$49',
    perCredit: '$0.16 / credit',
    badge: 'Most popular',
    description: '3–4 trailers — great for active authors',
  },
  {
    pack: 'pro',
    credits: 700,
    price: '$99',
    perCredit: '$0.14 / credit',
    badge: 'Best value',
    description: '8+ trailers — lowest rate per credit',
  },
]

// What each quality tier costs in credits
const QUALITY_COSTS = {
  standard: { credits: 80,  label: 'Standard',  resolution: '720p',  description: 'Great quality · 40s trailer · 4 cinematic clips' },
  premium:  { credits: 150, label: 'Premium',   resolution: '1080p', description: 'Full cinematic · 70s trailer · 7 clips · character voices' },
}

export function BuyCreditsModal({ onClose, currentCredits = 0 }: { onClose: () => void; currentCredits?: number }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBuy = async (pack: 'starter' | 'author' | 'pro') => {
    setLoading(pack)
    setError(null)
    try {
      const res = await fetch('/api/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data?.error ?? 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(13,13,11,0.60)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: '20px',
          padding: '36px', maxWidth: '520px', width: '100%',
          boxShadow: '0 24px 80px rgba(13,13,11,0.28)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
          fontSize: '26px', color: '#0D0D0B', margin: '0 0 6px',
        }}>
          Add credits
        </h2>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px',
          color: '#8A8278', margin: '0 0 24px', lineHeight: 1.5,
        }}>
          Credits never expire · Use on any book · Pick standard or premium per render
        </p>

        {/* Current balance */}
        {currentCredits > 0 && (
          <div style={{
            background: '#F7F4EF', borderRadius: '10px', padding: '10px 16px',
            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: '#5C5751',
          }}>
            <span>🎬</span>
            <span>You have <strong>{currentCredits} credits</strong> · enough for {Math.floor(currentCredits / 150)} premium or {Math.floor(currentCredits / 80)} standard trailer{Math.floor(currentCredits / 80) !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Quality cost reference */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px',
            color: '#8A8278', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Credit costs per render
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {Object.entries(QUALITY_COSTS).map(([key, q]) => (
              <div key={key} style={{
                flex: 1, background: '#FAFAF7', borderRadius: '10px',
                padding: '12px 14px', border: '1.5px solid #E8E2D5',
              }}>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700,
                  fontSize: '14px', color: '#0D0D0B',
                }}>
                  {q.label} <span style={{ color: '#8A8278', fontWeight: 400, fontSize: '12px' }}>· {q.resolution}</span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px',
                  color: '#8A8278', marginTop: '3px',
                }}>
                  {q.description}
                </div>
                <div style={{
                  fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                  fontSize: '18px', color: '#C8402F', marginTop: '6px',
                }}>
                  {q.credits} credits
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(200,64,47,0.06)', border: '1px solid rgba(200,64,47,0.25)',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: '#C8402F',
          }}>
            {error}
          </div>
        )}

        {/* Packs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PACKS.map((p) => (
            <button
              key={p.pack}
              onClick={() => handleBuy(p.pack)}
              disabled={loading !== null}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left',
                background: p.badge === 'Best value' ? 'rgba(200,64,47,0.04)' : '#FAFAF7',
                border: `1.5px solid ${p.badge ? '#C8402F' : '#E8E2D5'}`,
                borderRadius: '12px', padding: '16px 20px',
                cursor: loading !== null ? 'wait' : 'pointer',
                opacity: loading !== null && loading !== p.pack ? 0.5 : 1,
                transition: 'all 150ms ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700,
                    fontSize: '16px', color: '#0D0D0B',
                  }}>
                    {p.credits} Credits
                  </span>
                  {p.badge && (
                    <span style={{
                      background: '#C8402F', color: '#fff',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '10px', fontWeight: 700,
                      padding: '2px 7px', borderRadius: '20px',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {p.badge}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px',
                  color: '#8A8278', marginTop: '2px',
                }}>
                  {p.description} · {p.perCredit}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                fontSize: '24px', color: '#C8402F', minWidth: '48px', textAlign: 'right',
              }}>
                {loading === p.pack ? '…' : p.price}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          disabled={loading !== null}
          style={{
            display: 'block', width: '100%', marginTop: '20px',
            background: 'transparent', border: 'none',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px',
            color: '#8A8278', cursor: 'pointer', padding: '8px',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
