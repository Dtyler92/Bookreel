'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Book {
  id: string
  title: string
  genre?: string | null
  description?: string | null
  cover_image_url?: string | null
}

interface Trailer {
  id: string
  status: string
  final_video_url?: string | null
  quality_tier?: string | null
  created_at?: string
}

interface Character {
  id: string
  name: string
  image_url?: string | null
  author_approved?: boolean | null
}

interface Scene {
  id: string
  scene_number: number
  description?: string | null
  screenplay_text?: string | null
}

interface Audiobook {
  id: string
  status: string
  audio_url?: string | null
}

interface Props {
  book: Book
  trailers: Trailer[]
  characters: Character[]
  scenes: Scene[]
  audiobook: Audiobook | null
  userName: string
}

// ─── Shimmer bar ──────────────────────────────────────────────────────────────

function ShimmerBar() {
  return (
    <div style={{ width: '100%', height: 3, background: '#EDE9E0', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, #C8402F 40%, #E8735F 60%, transparent 100%)',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }} />
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconTrailer({ color = '#C8402F' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 9l5 3-5 3V9z" fill={color} stroke="none" />
    </svg>
  )
}
function IconCharacters() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8402F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 21v-1a7 7 0 0 1 14 0v1" />
      <circle cx="18" cy="8" r="2.5" />
      <path d="M16 21v-.5a5 5 0 0 1 6 0V21" />
    </svg>
  )
}
function IconScreenplay() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8402F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  )
}
function IconAudiobook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8402F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}
function IconSocial() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4CDC1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 12h8M8 8h5M8 16h3" />
    </svg>
  )
}
function IconEmail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4CDC1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

// ─── Module card ─────────────────────────────────────────────────────────────

interface ModuleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  state: 'complete' | 'in-progress' | 'empty' | 'locked'
  meta?: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  cardHref?: string
}

function ModuleCard({ icon, title, description, state, meta, ctaLabel, ctaHref, onCtaClick, cardHref }: ModuleCardProps) {
  const [hovered, setHovered] = useState(false)
  const [ctaHov, setCtaHov] = useState(false)
  const locked = state === 'locked'

  const stateColors = {
    complete:      { dot: '#16A34A', badge: '#F0FDF4', badgeBorder: '#BBF7D0', badgeText: '#15803D', label: 'Complete' },
    'in-progress': { dot: '#D97706', badge: '#FDF3DC', badgeBorder: '#FDE68A', badgeText: '#A16207', label: 'In Progress' },
    empty:         { dot: '#D4CDC1', badge: '#F4F1EB', badgeBorder: '#E8E2D5', badgeText: '#8A8278', label: 'Not started' },
    locked:        { dot: '#D4CDC1', badge: '#F4F1EB', badgeBorder: '#E8E2D5', badgeText: '#8A8278', label: 'Coming soon' },
  }

  const c = stateColors[state]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered && !locked ? '#C8402F' : '#E8E2D5'}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        boxShadow: hovered && !locked ? '0 4px 20px rgba(13,13,11,0.08)' : 'none',
        opacity: locked ? 0.55 : 1,
        display: 'flex',
        flexDirection: 'column',
        cursor: cardHref ? 'pointer' : 'default',
      }}
      onClick={cardHref ? () => window.open(cardHref, '_blank') : undefined}
    >
      {/* Top accent strip */}
      <div style={{
        height: 3,
        background: state === 'complete' ? '#16A34A'
          : state === 'in-progress' ? '#D97706'
          : 'transparent',
      }} />

      <div style={{ padding: '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
            background: '#F4F1EB', border: '1px solid #E8E2D5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>

          {/* State badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 100,
            background: c.badge, border: `1px solid ${c.badgeBorder}`,
            flexShrink: 0,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0,
              animation: state === 'in-progress' ? 'dotPulse 1.4s ease-in-out infinite' : undefined,
            }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, color: c.badgeText, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {c.label}
            </span>
          </div>
        </div>

        {/* Title + meta */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-playfair), serif', fontSize: 17, fontWeight: 700, color: locked ? '#8A8278' : '#0D0D0B', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {title}
            </h3>
            {meta && !locked && (
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: '#EDE9E0', color: '#8A8278' }}>
                {meta}
              </span>
            )}
            {locked && (
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: '#EDE9E0', color: '#8A8278' }}>
                Soon
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.6, color: '#8A8278' }}>
            {description}
          </p>
        </div>

        {/* In-progress shimmer */}
        {state === 'in-progress' && <ShimmerBar />}

        {/* CTA */}
        {ctaLabel && !locked && (
          <div style={{ marginTop: 'auto', paddingTop: 4 }}>
            {ctaHref ? (
              <Link
                href={ctaHref}
                onMouseEnter={() => setCtaHov(true)}
                onMouseLeave={() => setCtaHov(false)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.01em',
                  textDecoration: 'none', transition: 'all 150ms ease',
                  background: ctaHov ? '#C8402F' : '#F7F4EF',
                  color: ctaHov ? '#FFFFFF' : '#0D0D0B',
                  border: `1.5px solid ${ctaHov ? '#C8402F' : '#E8E2D5'}`,
                }}
              >
                {ctaLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : onCtaClick ? (
              <button
                onClick={onCtaClick}
                onMouseEnter={() => setCtaHov(true)}
                onMouseLeave={() => setCtaHov(false)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.01em',
                  cursor: 'pointer', transition: 'all 150ms ease',
                  background: ctaHov ? '#C8402F' : '#F7F4EF',
                  color: ctaHov ? '#FFFFFF' : '#0D0D0B',
                  border: `1.5px solid ${ctaHov ? '#C8402F' : '#E8E2D5'}`,
                }}
              >
                {ctaLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trailer row (one per trailer) ───────────────────────────────────────────

function TrailerRow({ trailer, index, total }: { trailer: Trailer; index: number; total: number }) {
  const [hov, setHov] = useState(false)
  const isComplete = trailer.status === 'complete' || !!trailer.final_video_url
  const isInProgress = trailer.status === 'pending' || trailer.status === 'processing' || trailer.status === 'generating'
  const isFailed = trailer.status === 'failed'

  const label = isComplete ? 'Complete' : isInProgress ? 'In Progress' : isFailed ? 'Failed' : 'Queued'
  const dot = isComplete ? '#16A34A' : isInProgress ? '#D97706' : isFailed ? '#DC2626' : '#D4CDC1'
  const badge = isComplete ? '#F0FDF4' : isInProgress ? '#FDF3DC' : isFailed ? '#FEF2F2' : '#F4F1EB'
  const badgeBorder = isComplete ? '#BBF7D0' : isInProgress ? '#FDE68A' : isFailed ? '#FECACA' : '#E8E2D5'
  const badgeText = isComplete ? '#15803D' : isInProgress ? '#A16207' : isFailed ? '#B91C1C' : '#8A8278'

  const versionLabel = total === 1 ? 'Trailer' : index === 0 ? `Trailer v${total} (Latest)` : `Trailer v${total - index}`
  const dateLabel = trailer.created_at
    ? new Date(trailer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: '#FFFFFF',
      border: `1px solid ${isInProgress ? '#FDE68A' : '#E8E2D5'}`,
      borderRadius: 10,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Left accent */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: isComplete ? '#16A34A' : isInProgress ? '#D97706' : isFailed ? '#DC2626' : '#E8E2D5',
        borderRadius: '10px 0 0 10px',
      }} />

      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0, marginLeft: 8,
        background: '#F4F1EB', border: '1px solid #E8E2D5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconTrailer color={isComplete ? '#C8402F' : isInProgress ? '#D97706' : '#D4CDC1'} />
      </div>

      {/* Version + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 15, fontWeight: 700, color: '#0D0D0B', lineHeight: 1.2 }}>
          {versionLabel}
        </div>
        {dateLabel && (
          <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: '#8A8278', marginTop: 2 }}>
            {dateLabel}
          </div>
        )}
        {isInProgress && (
          <div style={{ marginTop: 8 }}>
            <ShimmerBar />
          </div>
        )}
      </div>

      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 100,
        background: badge, border: `1px solid ${badgeBorder}`,
        flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0,
          animation: isInProgress ? 'dotPulse 1.4s ease-in-out infinite' : undefined,
        }} />
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, color: badgeText, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>

      {/* Watch button */}
      {isComplete && trailer.final_video_url && (
        <a
          href={trailer.final_video_url}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.01em',
            textDecoration: 'none', transition: 'all 150ms ease',
            background: hov ? '#C8402F' : '#F7F4EF',
            color: hov ? '#FFFFFF' : '#0D0D0B',
            border: `1.5px solid ${hov ? '#C8402F' : '#E8E2D5'}`,
          }}
        >
          Watch
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      )}
      {isInProgress && (
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: '#A16207', flexShrink: 0, fontStyle: 'italic' }}>
          ~15–20 min
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookHubClient({ book, trailers: initialTrailers, characters, scenes, audiobook, userName }: Props) {
  const router = useRouter()

  // Live trailers array — we update statuses in place as polling fires
  const [liveTrailers, setLiveTrailers] = useState<Trailer[]>(initialTrailers)

  // The in-progress trailer (if any) — newest first
  const inProgressTrailer = liveTrailers.find(t =>
    t.status === 'pending' || t.status === 'processing' || t.status === 'generating' ||
    t.status === 'failed' || t.status === null
  ) ?? null

  useEffect(() => {
    if (!inProgressTrailer) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/books/status/${book.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (!data.status) return

        setLiveTrailers(prev => prev.map(t => {
          if (t.id !== inProgressTrailer.id) return t
          if (data.status === 'complete') {
            return { ...t, status: 'complete', final_video_url: data.videoUrl }
          }
          return { ...t, status: data.status }
        }))

        if (data.status === 'complete') {
          clearInterval(interval)
          router.refresh()
        }
      } catch { /* swallow */ }
    }, 8000)
    return () => clearInterval(interval)
  }, [book.id, inProgressTrailer?.id, inProgressTrailer?.status])

  const completedTrailers = liveTrailers.filter(t => t.status === 'complete' || !!t.final_video_url)
  const hasTrailer = completedTrailers.length > 0
  const trailerInProgress = !!inProgressTrailer && (
    inProgressTrailer.status === 'pending' ||
    inProgressTrailer.status === 'processing' ||
    inProgressTrailer.status === 'generating'
  )

  const hasCharacters = characters.length > 0
  const approvedChars = characters.filter(c => c.author_approved)
  const hasApproved = approvedChars.length > 0
  const hasScreenplay = scenes.length > 0 && scenes.some(s => s.screenplay_text)
  const hasAudiobook = !!(audiobook && (audiobook.status === 'complete' || !!audiobook.audio_url))
  const audiobookInProgress = !!(audiobook && (audiobook.status === 'pending' || audiobook.status === 'processing' || audiobook.status === 'parsing' || audiobook.status === 'parsed'))

  const completedCount = [hasTrailer, hasApproved, hasScreenplay, hasAudiobook].filter(Boolean).length

  // Non-trailer modules
  const modules: ModuleCardProps[] = [
    {
      icon: <IconCharacters />,
      title: 'Character Images',
      description: hasApproved
        ? `${approvedChars.length} character${approvedChars.length !== 1 ? 's' : ''} approved and ready.`
        : hasCharacters
        ? `${characters.length} image${characters.length !== 1 ? 's' : ''} awaiting your review.`
        : 'Generate 3-angle character portraits for your cast.',
      state: hasApproved ? 'complete' : hasCharacters ? 'in-progress' : 'empty',
      meta: hasCharacters ? `${characters.length} characters` : undefined,
      ctaLabel: hasCharacters ? 'Review Images' : 'Generate Characters',
      ctaHref: hasCharacters ? `/review-images/${book.id}` : undefined,
      onCtaClick: !hasCharacters ? () => router.push(`/upload?book=${book.id}`) : undefined,
    },
    {
      icon: <IconScreenplay />,
      title: 'Screenplay',
      description: hasScreenplay
        ? `${scenes.length} scene${scenes.length !== 1 ? 's' : ''} scripted and ready.`
        : scenes.length > 0
        ? 'Scenes ready — screenplay generation pending.'
        : 'Auto-generate a scene-by-scene cinematic screenplay.',
      state: hasScreenplay ? 'complete' : scenes.length > 0 ? 'in-progress' : 'empty',
      meta: scenes.length > 0 ? `${scenes.length} scenes` : undefined,
      ctaLabel: hasScreenplay || scenes.length > 0 ? 'View Screenplay' : 'Generate Screenplay',
      ctaHref: hasScreenplay || scenes.length > 0 ? `/review/${book.id}` : undefined,
      onCtaClick: !hasScreenplay && scenes.length === 0 ? () => router.push(`/upload?book=${book.id}`) : undefined,
    },
    {
      icon: <IconAudiobook />,
      title: 'Audiobook',
      description: hasAudiobook
        ? 'Your audiobook is complete and ready to listen.'
        : audiobookInProgress
        ? 'Recording your audiobook — check back soon.'
        : 'Create a full-cast AI-narrated audiobook.',
      state: hasAudiobook ? 'complete' : audiobookInProgress ? 'in-progress' : 'empty',
      ctaLabel: hasAudiobook ? 'View Audiobook' : audiobookInProgress ? 'View Audiobook Progress' : 'Create Audiobook',
      ctaHref: hasAudiobook ? `/listen/${book.id}` : `/audiobook/${book.id}`,
      onCtaClick: undefined,
    },
    {
      icon: <IconSocial />,
      title: 'Social Media Clips',
      description: 'Short-form clips for TikTok, Instagram Reels & more — auto-cut from your trailer.',
      state: 'locked',
    },
    {
      icon: <IconEmail />,
      title: 'Email Templates',
      description: 'Launch emails, ARC requests & newsletters — personalized to your book.',
      state: 'locked',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', paddingTop: 64 }}>
      <style>{`
        @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
        @keyframes dotPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.35)} }
      `}</style>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Back link */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, fontWeight: 500,
            color: '#8A8278', padding: 0, marginBottom: 36, transition: 'color 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0D0D0B')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A8278')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          My Books
        </button>

        {/* Book header card */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E8E2D5', borderRadius: 12,
          padding: '32px', marginBottom: 48,
          display: 'flex', gap: 28, alignItems: 'flex-start',
          boxShadow: '0 1px 4px rgba(13,13,11,0.05)',
        }}>
          {/* Cover */}
          <div style={{
            flexShrink: 0, width: 100, height: 142, borderRadius: 8,
            overflow: 'hidden', border: '1px solid #E8E2D5',
            boxShadow: '0 4px 16px rgba(13,13,11,0.12)', position: 'relative',
          }}>
            {book.cover_image_url ? (
              <Image src={book.cover_image_url} alt={book.title} fill style={{ objectFit: 'cover' }} sizes="100px" unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#F4F1EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C8402F" strokeWidth="1.5">
                  <rect x="4" y="2" width="13" height="20" rx="1" />
                  <line x1="4" y1="2" x2="4" y2="22" strokeWidth="3" strokeLinecap="square" />
                  <line x1="8" y1="8" x2="14" y2="8" strokeWidth="1" opacity="0.45" />
                  <line x1="8" y1="11" x2="14" y2="11" strokeWidth="1" opacity="0.45" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {book.genre && (
              <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8402F' }}>
                {book.genre}
              </p>
            )}
            <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-playfair), serif', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: '#0D0D0B', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {book.title}
            </h1>
            {book.description && (
              <p style={{ margin: '0 0 18px', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, lineHeight: 1.65, color: '#8A8278', maxWidth: 560 }}>
                {book.description}
              </p>
            )}

            {/* Progress chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'Trailer',    done: hasTrailer },
                { label: 'Characters', done: hasApproved },
                { label: 'Screenplay', done: hasScreenplay },
                { label: 'Audiobook',  done: hasAudiobook },
              ].map(({ label, done }) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 100,
                  background: done ? '#F0FDF4' : '#F4F1EB',
                  border: `1px solid ${done ? '#BBF7D0' : '#E8E2D5'}`,
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 500,
                  color: done ? '#15803D' : '#8A8278',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: done ? '#16A34A' : '#D4CDC1', display: 'inline-block', flexShrink: 0 }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Completion counter */}
          <div style={{
            flexShrink: 0, textAlign: 'center',
            background: '#F4F1EB', border: '1px solid #E8E2D5',
            borderRadius: 10, padding: '16px 22px',
          }}>
            <div style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 30, fontWeight: 700, color: completedCount === 4 ? '#16A34A' : '#0D0D0B', lineHeight: 1 }}>
              {completedCount}<span style={{ fontSize: 16, color: '#8A8278', fontWeight: 400 }}>/4</span>
            </div>
            <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, color: '#8A8278', marginTop: 5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Complete
            </div>
          </div>
        </div>

        {/* ── Trailers section ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8278', whiteSpace: 'nowrap' }}>
                Book Trailers {liveTrailers.length > 0 && `(${liveTrailers.length})`}
              </span>
              <div style={{ flex: 1, height: 1, background: '#E8E2D5' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Link
                href={`/downloads/${book.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-inter), sans-serif',
                  textDecoration: 'none', transition: 'all 150ms ease',
                  background: '#F7F4EF', color: '#0D0D0B',
                  border: '1.5px solid #E8E2D5',
                }}
              >
                Downloads
              </Link>
            <Link
              href={`/trailer-wizard/${book.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-inter), sans-serif',
                textDecoration: 'none', transition: 'all 150ms ease',
                background: '#F7F4EF', color: '#0D0D0B',
                border: '1.5px solid #E8E2D5',
              }}
            >
              + Generate New
            </Link>
            </div>
          </div>

          {liveTrailers.length === 0 ? (
            // Empty state
            <div style={{
              padding: '28px 24px', background: '#FFFFFF', border: '1px solid #E8E2D5',
              borderRadius: 10, textAlign: 'center',
            }}>
              <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, color: '#8A8278' }}>
                No trailers yet. Transform your manuscript into a cinematic video trailer.
              </p>
              <Link
                href={`/trailer-wizard/${book.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-inter), sans-serif',
                  textDecoration: 'none', background: '#C8402F', color: '#FFFFFF',
                  border: '1.5px solid #C8402F',
                }}
              >
                Create Trailer
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {liveTrailers.map((trailer, index) => (
                <TrailerRow key={trailer.id} trailer={trailer} index={index} total={liveTrailers.length} />
              ))}
            </div>
          )}
        </div>

        {/* ── Production Modules ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8278', whiteSpace: 'nowrap' }}>
            Production Modules
          </span>
          <div style={{ flex: 1, height: 1, background: '#E8E2D5' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {modules.map((m, i) => <ModuleCard key={i} {...m} />)}
        </div>

      </main>
    </div>
  )
}
