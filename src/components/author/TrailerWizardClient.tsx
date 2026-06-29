'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReviewClient from './ReviewClient'
import ReviewImagesClient from './ReviewImagesClient'

type WizardStep = 'tier' | 'screenplay' | 'images' | 'confirm'
type Quality = 'standard' | 'premium'

interface Props {
  book: any
  trailer: any
  initialCharacters: any[]
  initialItems: any[]
  initialScenes: any[]
  userId: string
  isRegenerate?: boolean
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const red   = '#C8402F'
const dark  = '#0D0D0B'
const muted = '#8A8278'
const cream = '#FAFAF7'
const border = '#E8E2D5'
const card   = '#FFFFFF'

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 'tier',       label: 'Quality'    },
  { key: 'screenplay', label: 'Screenplay' },
  { key: 'images',     label: 'Characters' },
  { key: 'confirm',    label: 'Generate'   },
]

function StepBar({ stepIndex, isRegenerate }: { stepIndex: number; isRegenerate: boolean }) {
  return (
    <div style={{
      position: 'fixed', top: 64, left: 0, right: 0, zIndex: 40,
      background: 'rgba(253,252,249,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${border}`,
      padding: '0 24px',
    }}>
      <style>{`
        @media (max-width: 640px) {
          .br-wizard-label { display: none; }
          .br-step-connector { width: 16px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', alignItems: 'center', height: 52, flexWrap: 'wrap', gap: 8 }}>
        <span className="br-wizard-label" style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: muted,
          marginRight: 24,
        }}>
          {isRegenerate ? 'Review & Generate' : 'Trailer Wizard'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((s, i) => {
            const isDone    = i < stepIndex
            const isCurrent = i === stepIndex
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div className="br-step-connector" style={{
                    width: 32, height: 1,
                    background: isDone ? '#16A34A' : border,
                    transition: 'background 300ms ease',
                  }} />
                )}
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
                                     : border}`,
                  color: isDone    ? '#15803D'
                       : isCurrent ? red
                       : muted,
                }}>
                  {isDone ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: isCurrent ? red : border,
                      color: isCurrent ? '#fff' : muted,
                      fontSize: 11, fontWeight: 700,
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

// ─── Tier picker step ─────────────────────────────────────────────────────────

function TierStep({ onSelect }: { onSelect: (q: Quality) => void }) {
  const [hovered, setHovered] = useState<Quality | null>(null)

  const tiers: Array<{
    key: Quality
    name: string
    credits: number
    runtime: string
    clips: string
    resolution: string
    badge: string | null
    features: string[]
    color: string
    borderColor: string
  }> = [
    {
      key:         'standard',
      name:        'Standard',
      credits:     55,
      runtime:     '~24 seconds',
      clips:       '4 clips × 5s',
      resolution:  '720p',
      badge:       null,
      features:    [
        '720p cinematic quality',
        '4 fast-cut scenes',
        '1 character spoken line',
        'Cinematic narration + music bed',
        'Title & author card',
      ],
      color:       '#F4F1EB',
      borderColor: border,
    },
    {
      key:         'premium',
      name:        'Premium',
      credits:     150,
      runtime:     '~60 seconds',
      clips:       'Up to 12 clips · 5s or 10s each',
      resolution:  '1080p Full HD',
      badge:       'Recommended',
      features:    [
        '1080p Full HD cinematic quality',
        'Up to 12 scenes — AI picks 5s or 10s per clip',
        '2 character spoken lines with lip-sync',
        'Cinematic narration + music bed',
        'Title & author card',
      ],
      color:       '#FEF3F2',
      borderColor: '#F5C0B8',
    },
  ]

  return (
    <div style={{
      maxWidth: 680, margin: '0 auto',
      padding: '48px 20px 80px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: 30, fontWeight: 900, color: dark,
          margin: '0 0 10px', letterSpacing: '-0.02em',
        }}>
          Choose your trailer quality
        </h2>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14, color: muted, margin: 0, lineHeight: 1.6,
        }}>
          This shapes how your screenplay is written — choose before we review it.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tiers.map(t => (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            onMouseEnter={() => setHovered(t.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: '100%', textAlign: 'left',
              background: hovered === t.key ? (t.key === 'premium' ? '#FEF3F2' : '#F0EDE7') : card,
              border: `2px solid ${hovered === t.key || t.key === 'premium' ? t.borderColor : border}`,
              borderRadius: 14, padding: '22px 24px',
              cursor: 'pointer',
              transition: 'all 180ms ease',
              boxShadow: t.key === 'premium' ? '0 2px 16px rgba(200,64,47,0.08)' : 'none',
              position: 'relative',
            }}
          >
            {/* Badge */}
            {t.badge && (
              <div style={{
                position: 'absolute', top: -11, left: 24,
                background: red, color: '#fff',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', padding: '3px 10px', borderRadius: 100,
              }}>
                {t.badge}
              </div>
            )}

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: 20, fontWeight: 900, color: dark,
                  }}>
                    {t.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    background: t.key === 'premium' ? '#FEF3F2' : '#F4F1EB',
                    color: t.key === 'premium' ? red : muted,
                    border: `1px solid ${t.key === 'premium' ? '#F5C0B8' : border}`,
                    padding: '2px 8px', borderRadius: 100,
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}>
                    {t.resolution}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 13, color: muted,
                }}>
                  {t.runtime} · {t.clips}
                </div>
              </div>

              {/* Credits badge */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontSize: 24, fontWeight: 900,
                  color: t.key === 'premium' ? red : dark,
                  lineHeight: 1,
                }}>
                  {t.credits}
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 11, color: muted, marginTop: 2,
                }}>
                  credits
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {t.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke={t.key === 'premium' ? red : '#16A34A'}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 13, color: dark, fontWeight: 400,
                  }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>

            {/* Select arrow */}
            <div style={{
              marginTop: 18, display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13, fontWeight: 600,
              color: t.key === 'premium' ? red : dark,
            }}>
              Select {t.name}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <p style={{
        textAlign: 'center', marginTop: 20,
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 12, color: muted, lineHeight: 1.6,
      }}>
        Credits are deducted when generation starts — not when you pick a tier.
        <br />You can change your mind during the screenplay review.
      </p>
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
  isRegenerate = false,
}: Props) {
  const router = useRouter()

  const [approvedSceneIds,     setApprovedSceneIds]     = useState<Set<string>>(() => new Set(initialScenes.filter((s: any) => s.author_approved).map((s: any) => s.id)))
  const [approvedCharacterIds, setApprovedCharacterIds] = useState<Set<string>>(() => new Set(initialCharacters.filter((c: any) => c.author_approved).map((c: any) => c.id)))

  const allScenesApproved    = initialScenes.length > 0     && approvedSceneIds.size     === initialScenes.length
  const allCharactersApproved = initialCharacters.length > 0 && approvedCharacterIds.size === initialCharacters.length
  const allImagesApproved    = allCharactersApproved

  const getInitialStep = (): WizardStep => {
    if (isRegenerate) return 'tier'
    if (allScenesApproved && allImagesApproved) return 'confirm'
    if (allScenesApproved) return 'images'
    return 'tier'
  }

  const [step, setStep]             = useState<WizardStep>(getInitialStep)
  const [quality, setQuality]       = useState<Quality>('standard')
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const stepIndex = STEPS.findIndex(s => s.key === step)

  const creditCost = quality === 'premium' ? 150 : 55

  const handleSelectTier = (q: Quality) => {
    setQuality(q)
    setStep('screenplay')
  }

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
        body: JSON.stringify({ bookId: book.id, quality }),
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
    <div style={{ minHeight: '100vh', background: cream, paddingTop: 116 }}>

      <StepBar stepIndex={stepIndex} isRegenerate={isRegenerate} />

      {/* Tier picker step */}
      {step === 'tier' && (
        <TierStep onSelect={handleSelectTier} />
      )}

      {/* Screenplay step */}
      {step === 'screenplay' && (
        <div>
          {/* Quality reminder banner */}
          <div style={{ maxWidth: 880, margin: '0 auto', padding: '16px 24px 0' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: quality === 'premium' ? '#FEF3F2' : '#F4F1EB',
              border: `1px solid ${quality === 'premium' ? '#F5C0B8' : border}`,
              borderRadius: 8, padding: '8px 14px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 12, fontWeight: 600,
              color: quality === 'premium' ? red : muted,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none"/>
              </svg>
              {quality === 'premium' ? 'Premium trailer · 1080p · ~60s · 150 credits' : 'Standard trailer · 720p · ~24s · 55 credits'}
              <button
                onClick={() => setStep('tier')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 11, color: muted, textDecoration: 'underline',
                  padding: 0, marginLeft: 4,
                }}
              >
                change
              </button>
            </div>
          </div>
          <ReviewClient
            bookId={book.id}
            bookTitle={book.title}
            initialScenes={initialScenes}
            initialCharacters={initialCharacters}
            wizardMode
            onWizardComplete={(sceneIds, charIds) => {
              setApprovedSceneIds(new Set(sceneIds))
              setApprovedCharacterIds(new Set(charIds))
              setStep('images')
            }}
          />
        </div>
      )}

      {/* Images step */}
      {step === 'images' && (
        <div>
          {allScenesApproved && (
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '16px 24px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
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
          padding: '40px 20px 72px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
        }}>

          {/* Book title pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 100,
            background: '#F4F1EB', border: `1px solid ${border}`,
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 12, fontWeight: 500, color: muted,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M10 9l5 3-5 3V9z" fill={red} stroke="none"/>
            </svg>
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {book.title}
            </span>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              margin: '0 0 12px',
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 32, fontWeight: 700, color: dark,
              letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              {isRegenerate ? 'Ready to generate new trailer' : 'Ready to generate'}
            </h2>
            <p style={{
              margin: 0,
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15, lineHeight: 1.65, color: muted,
            }}>
              {isRegenerate
                ? 'Your screenplay and character images have been reviewed. A new cinematic trailer will be created — usually ready in 15–20 minutes.'
                : 'Your screenplay and character images are approved. Our cinematic engine will craft your trailer — usually ready in 15–20 minutes.'}
            </p>
          </div>

          {/* Quality summary card */}
          <div style={{
            width: '100%',
            background: quality === 'premium' ? '#FEF3F2' : '#F4F1EB',
            border: `1.5px solid ${quality === 'premium' ? '#F5C0B8' : border}`,
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontSize: 18, fontWeight: 900, color: dark,
                }}>
                  {quality === 'premium' ? 'Premium' : 'Standard'}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: quality === 'premium' ? 'rgba(200,64,47,0.1)' : '#E8E2D5',
                  color: quality === 'premium' ? red : muted,
                  padding: '2px 8px', borderRadius: 100,
                  fontFamily: 'var(--font-inter), sans-serif',
                }}>
                  {quality === 'premium' ? '1080p Full HD' : '720p'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontSize: 22, fontWeight: 900,
                  color: quality === 'premium' ? red : dark,
                }}>
                  {creditCost}
                </span>
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 12, color: muted, marginLeft: 4,
                }}>
                  credits
                </span>
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 12, color: muted, lineHeight: 1.5,
            }}>
              {quality === 'premium'
                ? 'Up to 12 scenes · AI-mixed 5s & 10s clips · 2 character lines · ~60s total'
                : '4 scenes · 5s clips · 1 character line · ~24s total'}
            </div>
            <button
              onClick={() => setStep('tier')}
              style={{
                marginTop: 10, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 12, color: muted, textDecoration: 'underline',
              }}
            >
              Change quality →
            </button>
          </div>

          {/* Approval checklist */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Screenplay approved', detail: `${approvedSceneIds.size} / ${initialScenes.length} scene${initialScenes.length !== 1 ? 's' : ''}`, done: allScenesApproved, link: 'screenplay' },
              { label: 'Character images approved', detail: `${approvedCharacterIds.size} / ${initialCharacters.length} character${initialCharacters.length !== 1 ? 's' : ''}`, done: allImagesApproved, link: 'images' },
            ].map(({ label, detail, done, link }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
                background: done ? card : '#FFFBEB',
                border: `1px solid ${done ? '#BBF7D0' : '#FCD34D'}`,
                borderRadius: 10, padding: '14px 18px',
                boxShadow: '0 1px 4px rgba(13,13,11,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: done ? '#F0FDF4' : '#FEF3C7',
                    border: `1.5px solid ${done ? '#86EFAC' : '#FCD34D'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {done ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, fontWeight: 500, color: dark }}>
                    {label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 12, fontWeight: 500, color: done ? muted : '#D97706',
                    background: done ? '#F4F1EB' : '#FEF3C7', padding: '2px 8px',
                    borderRadius: 100, border: `1px solid ${done ? border : '#FCD34D'}`,
                  }}>
                    {detail}
                  </span>
                  {!done && (
                    <button
                      onClick={() => setStep(link as WizardStep)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 12, fontWeight: 600, color: '#D97706', textDecoration: 'underline',
                      }}
                    >
                      Review →
                    </button>
                  )}
                </div>
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
          {(!allScenesApproved || !allImagesApproved) && (
            <div style={{
              width: '100%', padding: '12px 16px', borderRadius: 8,
              background: '#FFFBEB', border: '1px solid #FCD34D',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13, color: '#92400E', textAlign: 'center',
            }}>
              Please approve all scenes and character images before generating.
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating || !allScenesApproved || !allImagesApproved}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              padding: '16px 32px', borderRadius: 10,
              background: (generating || !allScenesApproved || !allImagesApproved) ? '#D4C5C3' : red,
              color: '#FFFFFF', border: 'none',
              cursor: (generating || !allScenesApproved || !allImagesApproved) ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15, fontWeight: 600, letterSpacing: '0.01em',
              transition: 'background 150ms ease',
              boxShadow: (generating || !allScenesApproved || !allImagesApproved) ? 'none' : '0 4px 16px rgba(200,64,47,0.3)',
              opacity: (!allScenesApproved || !allImagesApproved) ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!generating && allScenesApproved && allImagesApproved) (e.currentTarget as HTMLButtonElement).style.background = '#A8321F' }}
            onMouseLeave={e => { if (!generating && allScenesApproved && allImagesApproved) (e.currentTarget as HTMLButtonElement).style.background = red }}
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
                Generate {quality === 'premium' ? 'Premium' : 'Standard'} Trailer — {creditCost} credits
              </>
            )}
          </button>

          {/* Back link */}
          <button
            onClick={() => router.push(`/book/${book.id}`)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13, fontWeight: 500, color: muted,
              transition: 'color 150ms ease',
              padding: '12px 0',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = dark)}
            onMouseLeave={e => (e.currentTarget.style.color = muted)}
          >
            ← Back to Book Hub
          </button>

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
