'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BrandLogo } from '@/components/shared/BrandLogo'
import type { Character, Item } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  bookId: string
  bookTitle?: string
  bookGenre?: string | null
  initialCharacters: Character[]
  initialItems: Item[]
  userId?: string
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ role }: { role: string | null }) {
  const r = (role ?? '').toLowerCase()
  const styles =
    r === 'protagonist'
      ? 'bg-blue-100 text-blue-700'
      : r === 'antagonist'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles}`}>
      {role ?? 'Supporting'}
    </span>
  )
}

// ─── Rotating status messages ─────────────────────────────────────────────────

const STATUS_MESSAGES = [
  'Composing character details…',
  'Rendering portrait…',
  'Applying finishing touches…',
]

function RotatingMessage() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % STATUS_MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span
      style={{
        fontFamily: 'var(--font-playfair), serif',
        fontStyle: 'italic',
        fontSize: 12,
        color: '#8A8278',
        transition: 'opacity 400ms ease, transform 400ms ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        display: 'inline-block',
      }}
    >
      {STATUS_MESSAGES[idx]}
    </span>
  )
}

// ─── Generation Progress Banner ───────────────────────────────────────────────
// Shown at the top of the page (inline, not full-screen) while images generate.

function GenerationProgressBanner({
  current,
  total,
  bookTitle,
}: {
  current: number
  total: number
  bookTitle?: string
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 14,
        background: '#F4F1EB',
        border: '1px solid #E8E2D5',
        padding: '28px 32px',
        marginBottom: 32,
        position: 'relative',
      }}
    >
      {/* Top row: eyebrow + count badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          {/* Eyebrow */}
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1.4px',
            color: '#C8402F',
            margin: '0 0 6px',
          }}>
            Portrait Generation
          </p>
          {/* Title */}
          <h2 style={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            fontSize: 22,
            color: '#0D0D0B',
            margin: 0,
          }}>
            Generating portraits for{' '}
            {bookTitle && (
              <em style={{ color: '#C8402F', fontStyle: 'italic' }}>{bookTitle}</em>
            )}
          </h2>
        </div>
        {/* Count badge */}
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
          <div style={{
            fontFamily: 'var(--font-playfair), serif',
            fontSize: 26,
            fontWeight: 700,
            color: '#0D0D0B',
            lineHeight: 1,
          }}>
            {current}/{total}
          </div>
          <div style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 10,
            color: '#8A8278',
            marginTop: 3,
          }}>
            Images complete
          </div>
        </div>
      </div>

      {/* Progress track */}
      <div style={{
        width: '100%',
        height: 6,
        backgroundColor: '#E8E2D5',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: 'linear-gradient(90deg, #9E2F20, #C8402F)',
          borderRadius: 3,
          transition: 'width 600ms ease',
        }} />
      </div>

      {/* Tick marks */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < current ? 'rgba(200,64,47,0.5)' : '#E8E2D5',
              transition: 'background 400ms ease',
            }}
          />
        ))}
      </div>

      {/* Status dot + rotating message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#C8402F',
          flexShrink: 0,
          animation: 'dotPulse 1.6s ease-in-out infinite',
        }} />
        <RotatingMessage />
      </div>
    </div>
  )
}

// ─── Shimmer Loading Card (per-card, no image yet) ───────────────────────────

function GeneratingPlaceholder({ name }: { name?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Image shimmer area */}
      <div style={{
        width: '100%',
        aspectRatio: '2/3',
        background: 'linear-gradient(135deg, #EAE6DE, #E0DDD4, #EAE6DE)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Shimmer sweep */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          animation: 'shimmer 1.8s ease-in-out infinite',
          transform: 'translateX(-100%)',
        }} />
        {/* BookReel watermark */}
        <span style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: 13,
          fontWeight: 700,
          color: '#0D0D0B',
          opacity: 0.08,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          userSelect: 'none',
          pointerEvents: 'none',
          position: 'relative',
          zIndex: 1,
          animation: 'watermarkPulse 2.4s ease-in-out infinite',
        }}>
          BookReel
        </span>
      </div>
      {/* Footer */}
      {name && (
        <div style={{ padding: '10px 12px 8px' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: '#8A8278', margin: '0 0 2px' }}>
            {name}
          </p>
          <p style={{ fontFamily: 'var(--font-playfair), serif', fontStyle: 'italic', fontSize: 12, color: '#8A8278', margin: 0 }}>
            Generating portrait…
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Regeneration Overlay (per-card, while re-generating with feedback) ────────

function RegenerationOverlay({
  visible,
  done,
}: {
  visible: boolean
  done: boolean
}) {
  const [fading, setFading] = useState(false)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible) {
      setFading(false)
      return
    }
  }, [visible])

  useEffect(() => {
    if (done && visible) {
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
      const t = setTimeout(() => setFading(true), 400)
      animTimerRef.current = t
      return () => clearTimeout(t)
    }
  }, [done, visible])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(13,13,11,0.58)',
        backdropFilter: 'blur(2px)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'inherit',
        opacity: fading ? 0 : 1,
        transition: 'opacity 500ms ease',
        gap: 10,
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 28, lineHeight: 1 }}>🎬</span>
      {/* Label */}
      <p style={{
        fontFamily: 'var(--font-playfair), serif',
        fontStyle: 'italic',
        fontSize: 14,
        color: '#FFFFFF',
        margin: 0,
      }}>
        Regenerating…
      </p>
      {/* Indeterminate progress bar */}
      <div style={{
        width: 120,
        height: 3,
        background: '#4D3028',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          background: '#C8402F',
          borderRadius: 2,
          animation: 'indeterminate 1.4s ease-in-out infinite',
          transformOrigin: 'left center',
        }} />
      </div>
    </div>
  )
}

// ─── Character Card ───────────────────────────────────────────────────────────

function CharacterCard({
  character,
  onApprove,
  onImageUpdate,
}: {
  character: Character
  onApprove: (id: string, approved: boolean) => void
  onImageUpdate: (id: string, imageUrl: string) => void
}) {
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenDone, setRegenDone] = useState(false)
  const [approved, setApproved] = useState(character.author_approved)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/books/approve-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'character', id: character.id, approved: true }),
      })
      if (res.ok) {
        setApproved(true)
        onApprove(character.id, true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!feedback.trim()) return
    setLoading(true)
    setRegenerating(true)
    setRegenDone(false)
    try {
      const res = await fetch('/api/books/approve-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'character',
          id: character.id,
          approved: false,
          feedback: feedback.trim(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.newImageUrl) {
          setRegenDone(true)
          // Wait for fade-out animation (500ms) before updating image
          setTimeout(() => {
            onImageUpdate(character.id, data.newImageUrl)
            setFeedback('')
            setRegenerating(false)
            setRegenDone(false)
          }, 600)
          return
        }
      }
    } finally {
      if (!regenDone) {
        setLoading(false)
        setRegenerating(false)
      }
    }
  }

  return (
    <div className={`rounded-xl border bg-white overflow-hidden shadow-sm transition-all ${approved ? 'border-green-400' : 'border-[#E8E2D5]'}`}>
      {/* 4-angle character sheet */}
      {(character.image_url_front || character.image_url) ? (
        <div className="relative">
          {/* 2×2 grid of angles */}
          <div className="grid grid-cols-2 gap-0.5 bg-gray-200">
            {[
              { key: 'image_url_front', label: 'Front' },
              { key: 'image_url_back',  label: 'Back'  },
              { key: 'image_url_left',  label: 'Left'  },
              { key: 'image_url_right', label: 'Right' },
            ].map(({ key, label }) => {
              const src = character[key as keyof Character] as string | null
                ?? (key === 'image_url_front' ? character.image_url : null)
              return (
                <div key={key} className="relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                  {src ? (
                    <>
                      <Image src={src} alt={`${character.name} — ${label}`} fill className="object-cover" unoptimized />
                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        {label}
                      </span>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">{label}</div>
                  )}
                </div>
              )
            })}
          </div>
          {approved && (
            <div className="absolute inset-0 bg-green-500/20 flex items-end justify-center pb-3 pointer-events-none">
              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Approved ✓</span>
            </div>
          )}
          <RegenerationOverlay visible={regenerating} done={regenDone} />
        </div>
      ) : (
        <div style={{ aspectRatio: '3/4' }}>
          <GeneratingPlaceholder name={character.name} />
        </div>
      )}

      {/* Card body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-['Playfair_Display'] font-bold text-[18px] text-[#2B2B2B]">
            {character.name}
          </h3>
          <StatusBadge role={character.role} />
        </div>

        {character.appearance_notes && (
          <div>
            <p className="text-xs text-[#9C9286] font-semibold mb-1">As described in your book:</p>
            <p className="text-sm text-[#2B2B2B] italic leading-relaxed">
              &ldquo;{character.appearance_notes}&rdquo;
            </p>
          </div>
        )}

        {!approved && (
          <div className="space-y-2 pt-1">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe any changes needed..."
              rows={2}
              className="w-full rounded-lg border border-[#E8E2D5] bg-white px-3 py-2 text-sm font-['Inter'] text-[#2B2B2B] placeholder-[#C4BAB0] focus:outline-none focus:ring-2 focus:ring-[#C8412C]/30 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={loading || !character.image_url}
                className="flex-1 rounded-lg bg-[#C8412C] hover:bg-[#A8351F] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                {loading && !regenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Working…
                  </span>
                ) : (
                  '✓ Approve'
                )}
              </button>
              {feedback.trim() && (
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-[#E8E2D5] hover:border-[#2B2B2B] disabled:opacity-50 px-4 py-2 text-sm font-semibold text-[#2B2B2B] transition-colors"
                >
                  ↺ Regenerate with changes
                </button>
              )}
            </div>
          </div>
        )}

        {approved && (
          <button
            onClick={() => { setApproved(false); onApprove(character.id, false) }}
            className="text-xs text-[#9C9286] hover:text-[#C8412C] underline transition-colors"
          >
            Undo approval
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onApprove,
  onImageUpdate,
}: {
  item: Item
  onApprove: (id: string, approved: boolean) => void
  onImageUpdate: (id: string, imageUrl: string) => void
}) {
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenDone, setRegenDone] = useState(false)
  const [approved, setApproved] = useState(item.author_approved)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/books/approve-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'item', id: item.id, approved: true }),
      })
      if (res.ok) {
        setApproved(true)
        onApprove(item.id, true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!feedback.trim()) return
    setLoading(true)
    setRegenerating(true)
    setRegenDone(false)
    try {
      const res = await fetch('/api/books/approve-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          id: item.id,
          approved: false,
          feedback: feedback.trim(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.newImageUrl) {
          setRegenDone(true)
          setTimeout(() => {
            onImageUpdate(item.id, data.newImageUrl)
            setFeedback('')
            setRegenerating(false)
            setRegenDone(false)
          }, 600)
          return
        }
      }
    } finally {
      if (!regenDone) {
        setLoading(false)
        setRegenerating(false)
      }
    }
  }

  return (
    <div className={`rounded-xl border bg-white overflow-hidden shadow-sm transition-all ${approved ? 'border-green-400' : 'border-[#E8E2D5]'}`}>
      {/* Image area */}
      <div className="relative" style={{ aspectRatio: '3/4' }}>
        {item.image_url ? (
          <>
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              unoptimized
            />
            {approved && (
              <div className="absolute inset-0 bg-green-500/20 flex items-end justify-center pb-3">
                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Approved ✓
                </span>
              </div>
            )}
            {/* Per-image regeneration overlay */}
            <RegenerationOverlay visible={regenerating} done={regenDone} />
          </>
        ) : (
          <GeneratingPlaceholder name={item.name} />
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        <h3 className="font-['Playfair_Display'] font-bold text-[18px] text-[#2B2B2B]">
          {item.name}
        </h3>

        {item.description && (
          <div>
            <p className="text-xs text-[#9C9286] font-semibold mb-1">As described in your book:</p>
            <p className="text-sm text-[#2B2B2B] italic leading-relaxed">
              &ldquo;{item.description}&rdquo;
            </p>
          </div>
        )}

        {!approved && (
          <div className="space-y-2 pt-1">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe any changes needed..."
              rows={2}
              className="w-full rounded-lg border border-[#E8E2D5] bg-white px-3 py-2 text-sm font-['Inter'] text-[#2B2B2B] placeholder-[#C4BAB0] focus:outline-none focus:ring-2 focus:ring-[#C8412C]/30 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={loading || !item.image_url}
                className="flex-1 rounded-lg bg-[#C8412C] hover:bg-[#A8351F] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                {loading && !regenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Working…
                  </span>
                ) : (
                  '✓ Approve'
                )}
              </button>
              {feedback.trim() && (
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-[#E8E2D5] hover:border-[#2B2B2B] disabled:opacity-50 px-4 py-2 text-sm font-semibold text-[#2B2B2B] transition-colors"
                >
                  ↺ Regenerate with changes
                </button>
              )}
            </div>
          </div>
        )}

        {approved && (
          <button
            onClick={() => { setApproved(false); onApprove(item.id, false) }}
            className="text-xs text-[#9C9286] hover:text-[#C8412C] underline transition-colors"
          >
            Undo approval
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main ReviewImagesClient ──────────────────────────────────────────────────

export default function ReviewImagesClient({ bookId, bookTitle, bookGenre, initialCharacters, initialItems, userId }: Props) {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>(initialCharacters)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [generating, setGenerating] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [continueError, setContinueError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Check if any images still need generation
  const needsGeneration =
    characters.some((c) => !c.image_url) || items.some((i) => !i.image_url)

  // Approved counts
  const approvedCharacters = characters.filter((c) => c.author_approved).length
  const approvedItems = items.filter((i) => i.author_approved).length
  const totalApproved = approvedCharacters + approvedItems

  const totalItems = characters.length + items.length
  const allApproved = totalItems > 0 && totalApproved === totalItems

  // Count how many images have been generated so far (for the banner progress bar)
  const generatedCount =
    characters.filter((c) => !!c.image_url).length +
    items.filter((i) => !!i.image_url).length

  // Show inline banner while we're actively generating (trigger in-flight OR images still missing)
  const showGeneratingBanner = generating || needsGeneration

  // Trigger image generation
  const triggerGeneration = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/books/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, ...(userId ? { userId } : {}) }),
      })
      if (res.status === 403) {
        const data = await res.json().catch(() => ({})) as { upgradeRequired?: boolean }
        if (data.upgradeRequired) {
          setShowUpgradeModal(true)
          return
        }
      }
    } catch (err) {
      console.error('Image generation trigger failed:', err)
    } finally {
      setGenerating(false)
    }
  }, [bookId, userId])

  // Poll for updated images
  const pollImages = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/poll-images?bookId=${bookId}`)
      if (res.ok) {
        const data = await res.json() as {
          characters: Character[]
          items: Item[]
        }
        if (data.characters) setCharacters(data.characters)
        if (data.items) setItems(data.items)
      }
    } catch {
      // silently ignore poll errors
    }
  }, [bookId])

  // On mount: if images are needed, trigger generation then poll
  useEffect(() => {
    if (needsGeneration) {
      triggerGeneration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll every 5 seconds while images are still generating
  useEffect(() => {
    if (!needsGeneration) return
    const interval = setInterval(pollImages, 5000)
    return () => clearInterval(interval)
  }, [needsGeneration, pollImages])

  const handleCharacterApprove = (id: string, approved: boolean) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, author_approved: approved } : c)))
  }

  const handleCharacterImageUpdate = (id: string, imageUrl: string) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, image_url: imageUrl } : c)))
  }

  const handleItemApprove = (id: string, approved: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, author_approved: approved } : i)))
  }

  const handleItemImageUpdate = (id: string, imageUrl: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, image_url: imageUrl } : i)))
  }

  const handleContinue = async () => {
    setContinuing(true)
    setContinueError(null)
    try {
      // First: mark images as approved on the trailer record
      await fetch(`/api/books/mark-images-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      })

      // Then: kick off video generation
      const res = await fetch('/api/books/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, ...(userId ? { userId } : {}) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; upgradeRequired?: boolean }
        if (res.status === 403 && data.upgradeRequired) {
          setShowUpgradeModal(true)
          setContinuing(false)
          return
        }
        throw new Error(data?.error ?? `Generation failed (${res.status})`)
      }
      router.push('/dashboard?generated=1')
    } catch (err) {
      setContinueError(err instanceof Error ? err.message : 'Failed to start generation.')
      setContinuing(false)
    }
  }

  const progressPct = totalItems > 0 ? (totalApproved / totalItems) * 100 : 0

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAF7',
        paddingTop: '64px',
      }}
    >
      {/* ── Sticky page header (matches screenplay review) ───────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: '64px',
          zIndex: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E2D5',
        }}
      >
        <div
          style={{
            maxWidth: '1300px',
            margin: '0 auto',
            padding: '24px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Link
              href="/dashboard"
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                color: '#8A8278',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ← Back to Dashboard
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  fontSize: '28px',
                  color: '#0D0D0B',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {bookTitle}
              </h1>
              {bookGenre && (
                <span
                  style={{
                    backgroundColor: '#EDE9E0',
                    color: '#8A8278',
                    borderRadius: '100px',
                    padding: '4px 12px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {bookGenre}
                </span>
              )}
            </div>
          </div>

          {/* Right: progress */}
          <span
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: '#8A8278',
              whiteSpace: 'nowrap',
            }}
          >
            {totalApproved} of {totalItems} approved
          </span>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-10 pt-8 space-y-12 pb-36">
      {/* ── Upgrade Required Modal ─────────────────────────────────────── */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(13,13,11,0.55)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgradeModal(false) }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '40px 36px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 60px rgba(13,13,11,0.18)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#0D0D0B',
              margin: '0 0 12px',
            }}>
              Upgrade to Create Trailers
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              color: '#8A8278',
              margin: '0 0 28px',
              lineHeight: 1.6,
            }}>
              Trailer generation requires an Author or Pro plan. Upgrade your plan to bring your book to life with a cinematic trailer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  background: 'none',
                  border: '1.5px solid #E8E2D5',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '14px',
                  color: '#8A8278',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <a
                href="/pricing"
                style={{
                  background: '#C8402F',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Upgrade Now →
              </a>
            </div>
          </div>
        </div>
      )}
      {showGeneratingBanner && (
        <GenerationProgressBanner current={generatedCount} total={totalItems} bookTitle={bookTitle} />
      )}

      {/* ── Characters section ────────────────────────────────────── */}
      <section>
        <p className="text-xs font-['Inter'] font-semibold uppercase tracking-widest text-[#9C9286] mb-4">
          Your Characters
        </p>
        {characters.length === 0 ? (
          <p className="text-sm text-[#9C9286] italic">No characters found.</p>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                onApprove={handleCharacterApprove}
                onImageUpdate={handleCharacterImageUpdate}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Items section ─────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-['Inter'] font-semibold uppercase tracking-widest text-[#9C9286] mb-4">
          Key Items &amp; Locations
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-[#9C9286] italic">No key items found.</p>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <ItemCard
                key={i.id}
                item={i}
                onApprove={handleItemApprove}
                onImageUpdate={handleItemImageUpdate}
              />
            ))}
          </div>
        )}
      </section>
      </div>
      {/* ── end main content ─────────────────────────────────────────────────── */}

      {/* ── Sticky bottom bar ─────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 border-t border-[#E8E2D5] bg-white shadow-lg z-10">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-10 py-4 flex items-center gap-6">
          {/* Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#9C9286] font-['Inter']">
                {totalApproved} of {totalItems} approved
              </span>
              {allApproved && (
                <span className="text-xs text-green-600 font-semibold">All approved! 🎉</span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#E8E2D5] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#C8412C] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Continue button */}
          <div className="shrink-0 text-right">
            {continueError && (
              <p className="text-xs text-red-500 mb-1">{continueError}</p>
            )}
            <button
              onClick={handleContinue}
              disabled={!allApproved || continuing}
              className="rounded-lg bg-[#C8412C] hover:bg-[#A8351F] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8412C]/50 focus:ring-offset-2"
            >
              {continuing ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting…
                </span>
              ) : (
                'Continue to Trailer Generation →'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
