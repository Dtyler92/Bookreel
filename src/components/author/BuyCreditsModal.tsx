'use client'

import { useState } from 'react'

interface CreditPack {
  pack: '1' | '3'
  credits: number
  price: string
  perCredit: string
  badge?: string
}

const PACKS: CreditPack[] = [
  { pack: '1', credits: 1, price: '$9.99', perCredit: '$9.99 each' },
  { pack: '3', credits: 3, price: '$24.99', perCredit: '$8.33 each', badge: 'Best value · save $5' },
]

export function BuyCreditsModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBuy = async (pack: '1' | '3') => {
    setLoading(pack)
    setError(null)
    try {
      const res = await fetch('/api/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data?.error ?? 'Could not start checkout')
      }
      // Redirect to Stripe Checkout
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
        background: 'rgba(13,13,11,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: '16px',
          padding: '32px', maxWidth: '440px', width: '100%',
          boxShadow: '0 24px 64px rgba(13,13,11,0.28)',
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
          fontSize: '24px', color: '#0D0D0B', margin: '0 0 6px',
        }}>
          Add trailer credits
        </h2>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px',
          color: '#8A8278', margin: '0 0 24px', lineHeight: 1.5,
        }}>
          Credits work on any book and never expire. Use them to create or
          re-generate a trailer whenever inspiration strikes.
        </p>

        {error && (
          <div style={{
            background: 'rgba(200,64,47,0.06)', border: '1px solid rgba(200,64,47,0.25)',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: '#C8402F',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PACKS.map((p) => (
            <button
              key={p.pack}
              onClick={() => handleBuy(p.pack)}
              disabled={loading !== null}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left',
                background: p.badge ? 'rgba(200,64,47,0.04)' : '#FAFAF7',
                border: `1.5px solid ${p.badge ? '#C8402F' : '#E8E2D5'}`,
                borderRadius: '12px', padding: '18px 20px',
                cursor: loading !== null ? 'wait' : 'pointer',
                opacity: loading !== null && loading !== p.pack ? 0.5 : 1,
                transition: 'all 150ms ease',
              }}
            >
              <div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700,
                  fontSize: '16px', color: '#0D0D0B',
                }}>
                  {p.credits} {p.credits === 1 ? 'Credit' : 'Credits'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px',
                  color: '#8A8278', marginTop: '2px',
                }}>
                  {p.perCredit}{p.badge ? ` · ${p.badge.replace('Best value · ', '')}` : ''}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                fontSize: '22px', color: '#C8402F',
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
