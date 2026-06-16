'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { BrandLogo } from '@/components/shared/BrandLogo'
import type { Character, Item } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  bookId: string
  initialCharacters: Character[]
  initialItems: Item[]
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

// ─── Generation Progress Bar ──────────────────────────────────────────────────

const GENERATION_LABELS = [
  'Generating character portraits…',
  'Creating scene visuals…',
  'Bringing your story to life…',
  'Almost there…',
]

function GenerationProgressBar({
  current,
  total,
  currentLabel,
}: {
  current: number
  total: number
  currentLabel: string
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div style={{
      width: '100%',
      maxWidth: 480,
      margin: '0 auto',
      textAlign: 'center',
    }}>
      {/* Current action label */}
      <p style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 18,
        color: '#8A8278',
        marginBottom: 20,
        minHeight: 28,
      }}>
        {currentLabel}
      </p>

      {/* Progress bar track */}
      <div style={{
        width: '100%',
        height: 6,
        backgroundColor: '#E8E2D5',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        {/* Fill */}
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: 'linear-gradient(90deg, #C8402F, #E8602F)',
          borderRadius: 3,
          transition: 'width 600ms ease',
        }} />
      </div>

      {/* Percentage + count */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 13,
        color: '#8A8278',
      }}>
        <span>{percentage}% complete</span>
        <span>{current} of {total} images</span>
      </div>
    </div>
  )
}

// ─── Generation Overlay ───────────────────────────────────────────────────────

function GenerationOverlay({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const [labelIndex, setLabelIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((i) => (i + 1) % GENERATION_LABELS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(250,248,245,0.96)',
      backdropFilter: 'blur(4px)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      padding: '0 24px',
    }}>
      <BrandLogo size={32} />
      <GenerationProgressBar
        current={current}
        total={total}
        currentLabel={GENERATION_LABELS[labelIndex]}
      />
    </div>
  )
}

// ─── Generating Placeholder (per-card) ───────────────────────────────────────

function GeneratingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-[#FDF2F0] rounded-lg border-2 border-dashed border-[#C8412C]/30">
      {/* Animated shimmer bar */}
      <div style={{
        width: '60%',
        height: 4,
        backgroundColor: '#E8E2D5',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #C8402F, #E8602F)',
          borderRadius: 2,
          animation: 'shimmerBar 1.8s ease-in-out infinite',
        }} />
      </div>
      <span className="text-[#C8412C] text-xs font-medium">Generating…</span>
      <style>{`
        @keyframes shimmerBar {
          0%   { width: 0%; }
          50%  { width: 80%; }
          100% { width: 0%; }
        }
      `}</style>
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
          onImageUpdate(character.id, data.newImageUrl)
          setFeedback('')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-xl border bg-white overflow-hidden shadow-sm transition-all ${approved ? 'border-green-400' : 'border-[#E8E2D5]'}`}>
      {/* Image area */}
      <div className="relative" style={{ aspectRatio: '3/4' }}>
        {character.image_url ? (
          <>
            <Image
              src={character.image_url}
              alt={character.name}
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
          </>
        ) : (
          <GeneratingPlaceholder />
        )}
      </div>

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
                {loading ? (
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
          onImageUpdate(item.id, data.newImageUrl)
          setFeedback('')
        }
      }
    } finally {
      setLoading(false)
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
          </>
        ) : (
          <GeneratingPlaceholder />
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
                {loading ? (
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

export default function ReviewImagesClient({ bookId, initialCharacters, initialItems }: Props) {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>(initialCharacters)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [generating, setGenerating] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [continueError, setContinueError] = useState<string | null>(null)

  // Check if any images still need generation
  const needsGeneration =
    characters.some((c) => !c.image_url) || items.some((i) => !i.image_url)

  // Approved counts
  const approvedCharacters = characters.filter((c) => c.author_approved).length
  const approvedItems = items.filter((i) => i.author_approved).length
  const totalApproved = approvedCharacters + approvedItems
  const totalItems = characters.length + items.length
  const allApproved = totalItems > 0 && totalApproved === totalItems

  // Trigger image generation
  const triggerGeneration = useCallback(async () => {
    setGenerating(true)
    try {
      await fetch('/api/books/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      })
    } catch (err) {
      console.error('Image generation trigger failed:', err)
    } finally {
      setGenerating(false)
    }
  }, [bookId])

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
        body: JSON.stringify({ bookId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data?.error ?? `Generation failed (${res.status})`)
      }
      router.push('/dashboard?generated=1')
    } catch (err) {
      setContinueError(err instanceof Error ? err.message : 'Failed to start generation.')
      setContinuing(false)
    }
  }

  const progressPct = totalItems > 0 ? (totalApproved / totalItems) * 100 : 0

  // Count how many images have been generated so far (for the overlay progress bar)
  const generatedCount =
    characters.filter((c) => !!c.image_url).length +
    items.filter((i) => !!i.image_url).length

  // Show overlay while we're actively generating (trigger in-flight OR images still missing)
  const showGeneratingOverlay = generating || needsGeneration

  return (
    <div className="space-y-12 pb-36">
      {/* Generation overlay (replaces old spinner banner) */}
      {showGeneratingOverlay && (
        <GenerationOverlay current={generatedCount} total={totalItems} />
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

      {/* ── Sticky bottom bar ─────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 border-t border-[#E8E2D5] bg-white shadow-lg z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-6">
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
