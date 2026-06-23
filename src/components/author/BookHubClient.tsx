'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

// ─── Design tokens (matches site-wide palette) ────────────────────────────────
const ink    = '#0D0D0B'
const muted  = '#8A8278'
const border = '#E8E2D5'
const red    = '#C8402F'
const redHov = '#A8321F'
const paper  = '#FDFCF9'
const bg     = '#FAFAF7'
const surface = '#F4F1EB'
const inset  = '#EDE9E0'

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
  video_url?: string | null
  final_video_url?: string | null
  quality_tier?: string | null
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
  trailer: Trailer | null
  characters: Character[]
  scenes: Scene[]
  audiobook: Audiobook | null
  userName: string
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'complete' | 'in-progress' | 'empty' }) {
  if (status === 'complete') return (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block', flexShrink: 0 }} />
  )
  if (status === 'in-progress') return (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706', display: 'inline-block', flexShrink: 0, animation: 'dotPulse 1.4s ease-in-out infinite' }} />
  )
  return (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: inset, border: `1.5px solid ${border}`, display: 'inline-block', flexShrink: 0 }} />
  )
}

// ─── Hub Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  icon: string
  title: string
  description: string
  status: 'complete' | 'in-progress' | 'empty'
  statusLabel: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  comingSoon?: boolean
  meta?: string
}

function HubCard({ icon, title, description, status, statusLabel, ctaLabel, ctaHref, onCtaClick, comingSoon, meta }: CardProps) {
  const [hovered, setHovered] = useState(false)
  const [ctaHovered, setCtaHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: paper,
        border: `1px solid ${hovered && !comingSoon ? '#D4CDC1' : border}`,
        borderRadius: 12,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        boxShadow: hovered && !comingSoon ? '0 4px 20px rgba(13,13,11,0.07)' : '0 1px 4px rgba(13,13,11,0.04)',
        opacity: comingSoon ? 0.6 : 1,
        cursor: comingSoon ? 'default' : 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: status === 'complete' ? '#F0FDF4' : status === 'in-progress' ? '#FFFBEB' : surface,
          border: `1px solid ${status === 'complete' ? '#BBF7D0' : status === 'in-progress' ? '#FDE68A' : border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {icon}
        </div>
        {/* Status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, background: surface, border: `1px solid ${border}`, flexShrink: 0 }}>
          <StatusDot status={status} />
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, color: muted, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-inter), sans-serif', fontSize: 15, fontWeight: 600, color: comingSoon ? muted : ink, letterSpacing: '-0.01em' }}>
            {title}
          </h3>
          {comingSoon && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: inset, color: muted }}>
              Soon
            </span>
          )}
          {meta && !comingSoon && (
            <span style={{ fontSize: 11, fontWeight: 500, color: muted, background: surface, border: `1px solid ${border}`, padding: '1px 7px', borderRadius: 100 }}>
              {meta}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.6, color: muted }}>
          {description}
        </p>
      </div>

      {/* CTA */}
      {ctaLabel && !comingSoon && (
        <>
          {ctaHref ? (
            <Link
              href={ctaHref}
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => setCtaHovered(false)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.01em',
                textDecoration: 'none', transition: 'background 150ms ease, color 150ms ease',
                background: ctaHovered ? red : surface,
                color: ctaHovered ? '#FFFFFF' : ink,
                border: `1px solid ${ctaHovered ? red : border}`,
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
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => setCtaHovered(false)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.01em',
                cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease',
                background: ctaHovered ? red : surface,
                color: ctaHovered ? '#FFFFFF' : ink,
                border: `1px solid ${ctaHovered ? red : border}`,
              }}
            >
              {ctaLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookHubClient({ book, trailer, characters, scenes, audiobook, userName }: Props) {
  const router = useRouter()

  const hasTrailer = !!(trailer && (trailer.status === 'complete' || !!trailer.video_url || !!trailer.final_video_url))
  const trailerVideoUrl = trailer?.final_video_url ?? trailer?.video_url ?? null
  const trailerInProgress = !!(trailer && (trailer.status === 'pending' || trailer.status === 'processing' || trailer.status === 'generating'))
  const hasCharacters = characters.length > 0
  const approvedCharacters = characters.filter(c => c.author_approved)
  const hasApprovedCharacters = approvedCharacters.length > 0
  const hasScreenplay = scenes.length > 0 && scenes.some(s => s.screenplay_text)
  const hasAudiobook = !!(audiobook && (audiobook.status === 'complete' || !!audiobook.audio_url))
  const audiobookInProgress = !!(audiobook && (audiobook.status === 'pending' || audiobook.status === 'processing'))

  const completedCount = [hasTrailer, hasApprovedCharacters, hasScreenplay, hasAudiobook].filter(Boolean).length

  const cards: CardProps[] = [
    {
      icon: '🎬',
      title: 'Book Trailer',
      description: hasTrailer
        ? `Your cinematic trailer is ready${trailer?.quality_tier ? ` — ${trailer.quality_tier}` : ''}.`
        : trailerInProgress ? 'Your trailer is being crafted. Usually ready in 15–20 min.'
        : 'Transform your manuscript into a cinematic trailer.',
      status: hasTrailer ? 'complete' : trailerInProgress ? 'in-progress' : 'empty',
      statusLabel: hasTrailer ? 'Ready' : trailerInProgress ? 'Generating' : 'Not started',
      ctaLabel: hasTrailer ? 'Watch Trailer' : trailerInProgress ? undefined : 'Create Trailer',
      ctaHref: hasTrailer && trailerVideoUrl ? trailerVideoUrl : hasTrailer ? `/review/${book.id}` : undefined,
      onCtaClick: !trailer ? () => router.push(`/trailer-wizard/${book.id}`) : undefined,
      meta: trailer?.quality_tier ?? undefined,
    },
    {
      icon: '👥',
      title: 'Character Images',
      description: hasApprovedCharacters
        ? `${approvedCharacters.length} character${approvedCharacters.length !== 1 ? 's' : ''} approved.`
        : hasCharacters ? `${characters.length} image${characters.length !== 1 ? 's' : ''} awaiting your review.`
        : 'Generate 3-angle character portraits for your cast.',
      status: hasApprovedCharacters ? 'complete' : hasCharacters ? 'in-progress' : 'empty',
      statusLabel: hasApprovedCharacters ? 'Approved' : hasCharacters ? 'Review needed' : 'Not started',
      ctaLabel: hasCharacters ? 'Review Images' : 'Generate Images',
      ctaHref: hasCharacters ? `/review-images/${book.id}` : undefined,
      onCtaClick: !hasCharacters ? () => router.push(`/upload?book=${book.id}`) : undefined,
      meta: hasCharacters ? `${characters.length}` : undefined,
    },
    {
      icon: '📝',
      title: 'Screenplay',
      description: hasScreenplay
        ? `${scenes.length} scene${scenes.length !== 1 ? 's' : ''} ready for production.`
        : scenes.length > 0 ? 'Scenes ready — screenplay pending.'
        : 'Auto-generate a scene-by-scene cinematic screenplay.',
      status: hasScreenplay ? 'complete' : scenes.length > 0 ? 'in-progress' : 'empty',
      statusLabel: hasScreenplay ? `${scenes.length} scenes` : scenes.length > 0 ? 'In progress' : 'Not started',
      ctaLabel: hasScreenplay || scenes.length > 0 ? 'View Screenplay' : 'Generate Screenplay',
      ctaHref: hasScreenplay || scenes.length > 0 ? `/review/${book.id}` : undefined,
      onCtaClick: !hasScreenplay && scenes.length === 0 ? () => router.push(`/upload?book=${book.id}`) : undefined,
      meta: scenes.length > 0 ? `${scenes.length} scenes` : undefined,
    },
    {
      icon: '🎧',
      title: 'Audiobook',
      description: hasAudiobook ? 'Your audiobook is complete and ready to listen.'
        : audiobookInProgress ? 'Recording your audiobook — check back soon.'
        : 'Create a full-cast AI-narrated audiobook.',
      status: hasAudiobook ? 'complete' : audiobookInProgress ? 'in-progress' : 'empty',
      statusLabel: hasAudiobook ? 'Complete' : audiobookInProgress ? 'Recording' : 'Not started',
      ctaLabel: hasAudiobook ? 'Listen' : audiobookInProgress ? undefined : 'Create Audiobook',
      ctaHref: hasAudiobook || audiobookInProgress ? `/audiobook/${book.id}` : undefined,
      onCtaClick: !hasAudiobook && !audiobookInProgress ? () => router.push(`/audiobook/${book.id}`) : undefined,
    },
    {
      icon: '📱',
      title: 'Social Media Clips',
      description: 'Short-form clips for TikTok, Instagram Reels & more.',
      status: 'empty',
      statusLabel: 'Coming soon',
      comingSoon: true,
    },
    {
      icon: '✉️',
      title: 'Email Templates',
      description: 'Launch emails, ARC requests & newsletters.',
      status: 'empty',
      statusLabel: 'Coming soon',
      comingSoon: true,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: bg, paddingTop: 64 }}>
      <style>{`@keyframes dotPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.7} }`}</style>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 13, fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500, padding: '0 0 32px', transition: 'color 150ms ease' }}
          onMouseEnter={e => (e.currentTarget.style.color = ink)}
          onMouseLeave={e => (e.currentTarget.style.color = muted)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          My Books
        </button>

        {/* Book header */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: 48, paddingBottom: 40, borderBottom: `1px solid ${border}` }}>
          {/* Cover */}
          <div style={{ flexShrink: 0, width: 96, height: 136, borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}`, boxShadow: '0 4px 16px rgba(13,13,11,0.1)', position: 'relative' }}>
            {book.cover_image_url ? (
              <Image src={book.cover_image_url} alt={book.title} fill style={{ objectFit: 'cover' }} sizes="96px" unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📖</div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {book.genre && (
              <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: red }}>{book.genre}</p>
            )}
            <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-playfair), serif', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: ink, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              {book.title}
            </h1>
            {book.description && (
              <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, lineHeight: 1.65, color: muted, maxWidth: 560 }}>
                {book.description}
              </p>
            )}

            {/* Progress chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'Trailer', done: hasTrailer },
                { label: 'Characters', done: hasApprovedCharacters },
                { label: 'Screenplay', done: hasScreenplay },
                { label: 'Audiobook', done: hasAudiobook },
              ].map(({ label, done }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, background: done ? '#F0FDF4' : surface, border: `1px solid ${done ? '#BBF7D0' : border}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: done ? '#16A34A' : inset, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 500, color: done ? '#15803D' : muted }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Completion badge */}
          <div style={{ flexShrink: 0, textAlign: 'center', background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 28, fontWeight: 700, color: completedCount === 4 ? '#16A34A' : ink, lineHeight: 1 }}>
              {completedCount}/4
            </div>
            <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 500, color: muted, marginTop: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Complete
            </div>
          </div>
        </div>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted }}>
            Production Modules
          </p>
          <div style={{ flex: 1, height: 1, background: border }} />
        </div>

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {cards.map((card, i) => <HubCard key={i} {...card} />)}
        </div>

      </main>
    </div>
  )
}
