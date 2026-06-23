'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReviewClient from './ReviewClient'
import ReviewImagesClient from './ReviewImagesClient'

type WizardStep = 'screenplay' | 'images' | 'confirm'

interface Props {
  book: any
  trailer: any
  initialCharacters: any[]
  initialItems: any[]
  initialScenes: any[]
  userId: string
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 'screenplay', label: 'Screenplay' },
  { key: 'images',     label: 'Characters' },
  { key: 'confirm',    label: 'Generate'   },
]

function StepBar({ stepIndex }: { stepIndex: number }) {
  return (
    <div style={{
      position: 'sticky', top: 64, zIndex: 40,
      background: 'rgba(253,252,249,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #E8E2D5',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', alignItems: 'center', height: 52 }}>
        {/* Label */}
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#8A8278',
          marginRight: 24, whiteSpace: 'nowrap',
        }}>
          Trailer Wizard
        </span>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((s, i) => {
            const isDone    = i < stepIndex
            const isCurrent = i === stepIndex
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Connector */}
                {i > 0 && (
                  <div style={{
                    width: 32, height: 1,
                    background: isDone ? '#16A34A' : '#E8E2D5',
                    transition: 'background 300ms ease',
                  }} />
                )}
                {/* Pill */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 100,
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
                  transition: 'all 200ms ease',
                  background: isDone    ? '#F0FDF4'
                            : isCurrent ? '#FDECEA'
                            : 'transparent',
                  border: `1px solid ${isDone    ? '#BBF7D0'
                                     : isCurrent ? '#F5C0B8'
                                     : '#E8E2D5'}`,
                  color: isDone    ? '#15803D'
                       : isCurrent ? '#C8402F'
                       : '#8A8278',
                }}>
                  {isDone ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: isCurrent ? '#C8402F' : '#E8E2D5',
                      color: isCurrent ? '#fff' : '#8A8278',
                      fontSize: 9, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                  )}
                  {s.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrailerWizardClient({
  book,
  trailer,
  initialCharacters,
  initialItems,
  initialScenes,
  userId,
}: Props) {
  const router = useRouter()

  const allScenesApproved  = initialScenes.length > 0    && initialScenes.every((s: any)    => s.author_approved)
  const allImagesApproved  = initialCharacters.length > 0 && initialCharacters.every((c: any) => c.author_approved)

  const getInitialStep = (): WizardStep => {
    if (allScenesApproved && allImagesApproved) return 'confirm'
    if (allScenesApproved) return 'images'
    return 'screenplay'
  }

  const [step, setStep]           = useState<WizardStep>(getInitialStep)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const stepIndex = STEPS.findIndex(s => s.key === step)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      await fetch('/api/books/mark-images-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      })
      const res = await fetch('/api/books/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, ...(userId ? { userId } : {}) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data?.error ?? `Generation failed (${res.status})`)
      }
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.')
      setGenerating(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7' }}>

      <StepBar stepIndex={stepIndex} />

      {/* Screenplay step */}
      {step === 'screenplay' && (
        <ReviewClient
          bookId={book.id}
          bookTitle={book.title}
          initialScenes={initialScenes}
          initialCharacters={initialCharacters}
          wizardMode
          onWizardComplete={() => setStep('images')}
        />
      )}

      {/* Images step */}
      {step === 'images' && (
        <div>
          {allScenesApproved && (
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '16px 24px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#F0FDF4', border: '1px solid #BBF7D0',
                borderRadius: 8, padding: '10px 16px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, fontWeight: 500, color: '#15803D',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Screenplay approved — now review your character images before generating
              </div>
            </div>
          )}
          <ReviewImagesClient
            bookId={book.id}
            bookTitle={book.title}
            bookGenre={book.genre}
            initialCharacters={initialCharacters}
            initialItems={initialItems}
            userId={userId}
            wizardMode
            onWizardComplete={() => setStep('confirm')}
          />
        </div>
      )}

      {/* Confirm + generate step */}
      {step === 'confirm' && (
        <div style={{
          maxWidth: 520, margin: '0 auto',
          padding: '72px 24px 96px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
        }}>

          {/* Book title pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 100,
            background: '#F4F1EB', border: '1px solid #E8E2D5',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 12, fontWeight: 500, color: '#8A8278',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C8402F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M10 9l5 3-5 3V9z" fill="#C8402F" stroke="none"/>
            </svg>
            {book.title}
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              margin: '0 0 12px',
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 32, fontWeight: 700, color: '#0D0D0B',
              letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              Ready to generate
            </h2>
            <p style={{
              margin: 0,
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15, lineHeight: 1.65, color: '#8A8278',
            }}>
              Your screenplay and character images are approved. Our cinematic engine will craft your trailer — usually ready in 15–20 minutes.
            </p>
          </div>

          {/* Approval checklist */}
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {[
              { label: 'Screenplay approved', detail: `${initialScenes.length} scene${initialScenes.length !== 1 ? 's' : ''}` },
              { label: 'Character images approved', detail: `${initialCharacters.length} character${initialCharacters.length !== 1 ? 's' : ''}` },
            ].map(({ label, detail }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: '1px solid #BBF7D0',
                borderRadius: 10, padding: '14px 18px',
                boxShadow: '0 1px 4px rgba(13,13,11,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#F0FDF4', border: '1.5px solid #86EFAC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 14, fontWeight: 500, color: '#0D0D0B',
                  }}>
                    {label}
                  </span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 12, fontWeight: 500, color: '#8A8278',
                  background: '#F4F1EB', padding: '2px 8px',
                  borderRadius: 100, border: '1px solid #E8E2D5',
                }}>
                  {detail}
                </span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              width: '100%', padding: '12px 16px', borderRadius: 8,
              background: '#FEF2F2', border: '1px solid #FECACA',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13, color: '#DC2626',
            }}>
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              padding: '16px 32px', borderRadius: 10,
              background: generating ? '#D4736A' : '#C8402F',
              color: '#FFFFFF', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15, fontWeight: 600, letterSpacing: '0.01em',
              transition: 'background 150ms ease',
              boxShadow: generating ? 'none' : '0 4px 16px rgba(200,64,47,0.3)',
            }}
            onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLButtonElement).style.background = '#A8321F' }}
            onMouseLeave={e => { if (!generating) (e.currentTarget as HTMLButtonElement).style.background = '#C8402F' }}
          >
            {generating ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
                Queuing your trailer…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                Generate My Trailer
              </>
            )}
          </button>

          {/* Back link */}
          <button
            onClick={() => router.push(`/book/${book.id}`)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13, fontWeight: 500, color: '#8A8278',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0D0D0B')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8A8278')}
          >
            ← Back to Book Hub
          </button>

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
