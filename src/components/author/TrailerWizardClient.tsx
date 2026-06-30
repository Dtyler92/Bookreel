'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReviewClient from './ReviewClient'
import ReviewImagesClient from './ReviewImagesClient'

type WizardStep = 'tier' | 'screenplay' | 'scenes' | 'images'
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

const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const cream  = '#FAFAF7'
const border = '#E8E2D5'
const card   = '#FFFFFF'

// ─── Step indicator ───────────────────────────────────────────────────────────

const STANDARD_STEPS = [
  { key: 'tier',       label: 'Quality'     },
  { key: 'screenplay', label: 'Screenplay'  },
  { key: 'scenes',     label: 'Pick Scenes' },
  { key: 'images',     label: 'Characters'  },
]

const PREMIUM_STEPS = [
  { key: 'tier',       label: 'Quality'    },
  { key: 'screenplay', label: 'Screenplay' },
  { key: 'images',     label: 'Characters' },
]

function StepBar({ quality, step, isRegenerate }: { quality: Quality; step: WizardStep; isRegenerate: boolean }) {
  const steps = quality === 'standard' ? STANDARD_STEPS : PREMIUM_STEPS
  const stepIndex = steps.findIndex(s => s.key === step)
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
          {steps.map((s, i) => {
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
        'You pick 4 scenes to film',
        '1 character spoken line',
        'Cinematic narration + music bed',
        'Title & author card',
      ],
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
      </p>
    </div>
  )
}

// ─── Scene picker step (Standard only) ───────────────────────────────────────

function ScenePickerStep({
  scenes,
  selected,
  onToggle,
  onContinue,
  onBack,
}: {
  scenes: any[]
  selected: Set<string>
  onToggle: (id: string) => void
  onContinue: () => void
  onBack: () => void
}) {
  const MAX = 4
  const ready = selected.size === MAX

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: 28, fontWeight: 900, color: dark,
          margin: '0 0 10px', letterSpacing: '-0.02em',
        }}>
          Pick 4 scenes to film
        </h2>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14, color: muted, margin: 0, lineHeight: 1.6,
        }}>
          Standard trailers film exactly 4 clips. Choose the moments that best represent your story.
        </p>
      </div>

      {/* Counter pill */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 18px', borderRadius: 100,
          background: ready ? '#F0FDF4' : '#FEF3F2',
          border: `1.5px solid ${ready ? '#86EFAC' : '#F5C0B8'}`,
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 13, fontWeight: 700,
          color: ready ? '#15803D' : red,
        }}>
          {ready ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none"/>
            </svg>
          )}
          {selected.size} / {MAX} scenes selected
        </div>
      </div>

      {/* Scene cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {scenes.map((scene, idx) => {
          const isSelected = selected.has(scene.id)
          const isDisabled = !isSelected && selected.size >= MAX
          return (
            <button
              key={scene.id}
              onClick={() => !isDisabled && onToggle(scene.id)}
              disabled={isDisabled}
              style={{
                width: '100%', textAlign: 'left',
                background: isSelected ? '#FDECEA' : card,
                border: `2px solid ${isSelected ? '#F5C0B8' : border}`,
                borderRadius: 12, padding: '16px 18px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.45 : 1,
                transition: 'all 150ms ease',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: isSelected ? red : '#F4F1EB',
                border: `2px solid ${isSelected ? red : border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms ease',
              }}>
                {isSelected && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 11, fontWeight: 700, color: muted,
                    background: '#F4F1EB', padding: '1px 7px', borderRadius: 100,
                    border: `1px solid ${border}`, flexShrink: 0,
                  }}>
                    Scene {idx + 1}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: 15, fontWeight: 700, color: dark,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {scene.title || `Scene ${scene.scene_number}`}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 13, color: muted, margin: 0, lineHeight: 1.55,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {scene.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Continue button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button
          onClick={onContinue}
          disabled={!ready}
          style={{
            width: '100%', maxWidth: 420,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '15px 32px', borderRadius: 10,
            background: ready ? red : '#D4C5C3',
            color: '#FFFFFF', border: 'none',
            cursor: ready ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 15, fontWeight: 600, letterSpacing: '0.01em',
            boxShadow: ready ? '0 4px 16px rgba(200,64,47,0.3)' : 'none',
            transition: 'background 150ms ease',
            opacity: ready ? 1 : 0.6,
          }}
        >
          Continue to Characters →
        </button>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13, color: muted, padding: '8px 0',
          }}
        >
          ← Back to Screenplay
        </button>
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
  isRegenerate = false,
}: Props) {
  const router = useRouter()

  const [approvedSceneIds,     setApprovedSceneIds]     = useState<Set<string>>(() => new Set(initialScenes.filter((s: any) => s.author_approved).map((s: any) => s.id)))
  const [approvedCharacterIds, setApprovedCharacterIds] = useState<Set<string>>(() => new Set(initialCharacters.filter((c: any) => c.author_approved).map((c: any) => c.id)))
  const [selectedSceneIds,     setSelectedSceneIds]     = useState<Set<string>>(new Set())

  const allScenesApproved     = initialScenes.length > 0     && approvedSceneIds.size     === initialScenes.length
  const allCharactersApproved = initialCharacters.length > 0 && approvedCharacterIds.size === initialCharacters.length

  const getInitialStep = (): WizardStep => {
    // Always start at tier — let the user pick quality and go through the full flow
    return 'tier'
  }

  const [step,       setStep]       = useState<WizardStep>(getInitialStep)
  const [quality,    setQuality]    = useState<Quality>('standard')
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const creditCost = quality === 'premium' ? 150 : 55

  const handleSelectTier = (q: Quality) => {
    setQuality(q)
    setStep('screenplay')
  }

  const handleToggleScene = (id: string) => {
    setSelectedSceneIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else if (next.size < 4) { next.add(id) }
      return next
    })
  }

  const handleGenerate = async (charIds?: Set<string>) => {
    setGenerating(true)
    setError(null)
    try {
      await fetch('/api/books/mark-images-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      })
      const body: any = { bookId: book.id, quality }
      if (quality === 'standard' && selectedSceneIds.size === 4) {
        body.selectedSceneIds = Array.from(selectedSceneIds)
      }
      const res = await fetch('/api/books/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  // Generating overlay — shown while queuing
  if (generating) {
    return (
      <div style={{
        minHeight: '100vh', background: cream,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: 40,
      }}>
        <svg style={{ animation: 'spin 1s linear infinite' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 16, color: dark, margin: 0, fontWeight: 500,
        }}>
          Queuing your trailer…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: cream, paddingTop: 116 }}>

      <StepBar quality={quality} step={step} isRegenerate={isRegenerate} />

      {/* Tier picker */}
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
              {quality === 'premium' ? 'Premium trailer · 1080p · ~60s · 150 credits' : 'Standard trailer · 720p · ~24s · 55 credits — you\'ll pick 4 scenes next'}
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
              // Standard → pick scenes; Premium → go straight to characters
              setStep(quality === 'standard' ? 'scenes' : 'images')
            }}
          />
        </div>
      )}

      {/* Scene picker (Standard only) */}
      {step === 'scenes' && (
        <ScenePickerStep
          scenes={initialScenes}
          selected={selectedSceneIds}
          onToggle={handleToggleScene}
          onContinue={() => setStep('images')}
          onBack={() => setStep('screenplay')}
        />
      )}

      {/* Characters / images step */}
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
                {quality === 'standard'
                  ? `Screenplay approved · ${selectedSceneIds.size} scenes selected — approve character images to generate`
                  : 'Screenplay approved — approve character images to generate'}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '12px 24px 0' }}>
              <div style={{
                padding: '12px 16px', borderRadius: 8,
                background: '#FEF2F2', border: '1px solid #FECACA',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, color: '#DC2626',
              }}>
                {error}
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
            quality={quality}
            selectedSceneIds={Array.from(selectedSceneIds)}
            onWizardComplete={() => handleGenerate()}
          />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
