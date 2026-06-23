'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

// ─────────────────────────────────────────────
// Interfaces — unchanged
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Status dot
// ─────────────────────────────────────────────

type StatusVariant = 'complete' | 'in-progress' | 'empty' | 'locked'

function StatusDot({ variant }: { variant: StatusVariant }) {
  if (variant === 'complete') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: '#22c55e' }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 6px 2px #22c55e88' }} />
      </span>
    )
  }
  if (variant === 'in-progress') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: '#f59e0b' }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 6px 2px #f59e0b88' }} />
      </span>
    )
  }
  if (variant === 'locked') {
    return <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: '#374151' }} />
  }
  return <span className="relative inline-flex rounded-full h-2.5 w-2.5 border" style={{ borderColor: '#4b5563', backgroundColor: 'transparent' }} />
}

// ─────────────────────────────────────────────
// Hub Card
// ─────────────────────────────────────────────

interface HubCardProps {
  icon: React.ReactNode
  title: string
  description: string
  statusVariant: StatusVariant
  statusLabel: string
  ctaLabel: string | null
  ctaHref?: string
  onCtaClick?: () => void
  comingSoon?: boolean
  badge?: string | null
}

function HubCard({ icon, title, description, statusVariant, statusLabel, ctaLabel, ctaHref, onCtaClick, comingSoon = false, badge }: HubCardProps) {
  const cardStyle: React.CSSProperties = {
    background: comingSoon ? 'linear-gradient(135deg, #0d0d0d 0%, #111111 100%)' : 'linear-gradient(135deg, #111111 0%, #161616 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    position: 'relative',
    overflow: 'hidden',
    opacity: comingSoon ? 0.55 : 1,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    cursor: comingSoon ? 'not-allowed' : 'default',
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (comingSoon) return
    const el = e.currentTarget
    el.style.transform = 'translateY(-3px)'
    el.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,64,47,0.18)'
    el.style.borderColor = 'rgba(200,64,47,0.3)'
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.transform = 'translateY(0)'
    el.style.boxShadow = 'none'
    el.style.borderColor = 'rgba(255,255,255,0.07)'
  }

  const ctaButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.02em',
    textDecoration: 'none',
    transition: 'background 0.2s ease, transform 0.1s ease',
    background: 'linear-gradient(135deg, #C8402F 0%, #E54B38 100%)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(200,64,47,0.35)',
    alignSelf: 'flex-start',
  }

  return (
    <div style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Top-edge accent line */}
      {!comingSoon && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(200,64,47,0.5) 50%, transparent 100%)' }} />
      )}

      {/* Header row: icon + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: comingSoon ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, rgba(200,64,47,0.15) 0%, rgba(200,64,47,0.05) 100%)',
          border: comingSoon ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(200,64,47,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <StatusDot variant={statusVariant} />
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{statusLabel}</span>
        </div>
      </div>

      {/* Title + badge + description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: comingSoon ? '#6b7280' : '#f9fafb', letterSpacing: '-0.01em' }}>{title}</h3>
          {badge && (
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: 'rgba(200,64,47,0.15)', color: '#E54B38', border: '1px solid rgba(200,64,47,0.25)' }}>{badge}</span>
          )}
          {comingSoon && (
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: 'rgba(107,114,128,0.15)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.2)' }}>Coming Soon</span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.6', color: comingSoon ? '#374151' : '#6b7280' }}>{description}</p>
      </div>

      {/* CTA */}
      {ctaLabel && !comingSoon && (
        <>
          {ctaHref ? (
            <Link href={ctaHref} style={ctaButtonStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              {ctaLabel}
            </Link>
          ) : onCtaClick ? (
            <button onClick={onCtaClick} style={ctaButtonStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              {ctaLabel}
            </button>
          ) : null}
        </>
      )}

      {/* Lock icon for coming soon */}
      {comingSoon && (
        <div style={{ alignSelf: 'flex-start' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

function IconTrailer() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E54B38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
}
function IconCharacters() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E54B38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}
function IconScreenplay() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E54B38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
}
function IconAudiobook() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E54B38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
}
function IconSocial() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
}
function IconEmail() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function BookHubClient({ book, trailer, characters, scenes, audiobook, userName }: Props) {
  const router = useRouter()

  const hasTrailer = !!(trailer && (trailer.status === 'complete' || !!trailer.video_url))
  const trailerInProgress = !!(trailer && (trailer.status === 'pending' || trailer.status === 'processing' || trailer.status === 'generating'))
  const hasCharacters = characters.length > 0
  const approvedCharacters = characters.filter(c => c.author_approved)
  const hasApprovedCharacters = approvedCharacters.length > 0
  const hasScreenplay = scenes.length > 0 && scenes.some(s => s.screenplay_text)
  const hasAudiobook = !!(audiobook && (audiobook.status === 'complete' || !!audiobook.audio_url))
  const audiobookInProgress = !!(audiobook && (audiobook.status === 'pending' || audiobook.status === 'processing'))
  const hasCoverImage = !!book.cover_image_url

  const sections: HubCardProps[] = [
    {
      icon: <IconTrailer />,
      title: 'Book Trailer',
      description: hasTrailer
        ? `Your cinematic trailer is ready${trailer?.quality_tier ? ` — ${trailer.quality_tier} quality` : ''}.`
        : trailerInProgress ? 'Your trailer is being crafted by our cinematic engine.'
        : 'Transform your story into a cinematic trailer that captivates readers.',
      statusVariant: hasTrailer ? 'complete' : trailerInProgress ? 'in-progress' : 'empty',
      statusLabel: hasTrailer ? 'Complete' : trailerInProgress ? 'Rendering' : 'Not Started',
      ctaLabel: hasTrailer ? 'View Trailer' : trailerInProgress ? null : 'Create Trailer',
      ctaHref: hasTrailer ? `/review/${book.id}` : undefined,
      onCtaClick: !trailer ? () => router.push(`/trailer-wizard/${book.id}`) : undefined,
      badge: trailer?.quality_tier ?? null,
    },
    {
      icon: <IconCharacters />,
      title: 'Character Images',
      description: hasApprovedCharacters
        ? `${approvedCharacters.length} character${approvedCharacters.length !== 1 ? 's' : ''} approved and ready.`
        : hasCharacters ? `${characters.length} character image${characters.length !== 1 ? 's' : ''} awaiting your review.`
        : 'Bring your characters to life with AI-generated 3-angle portrait art.',
      statusVariant: hasApprovedCharacters ? 'complete' : hasCharacters ? 'in-progress' : 'empty',
      statusLabel: hasApprovedCharacters ? 'Approved' : hasCharacters ? 'Needs Review' : 'Not Started',
      ctaLabel: hasCharacters ? 'Review Characters' : 'Generate Characters',
      ctaHref: hasCharacters ? `/review-images/${book.id}` : undefined,
      onCtaClick: !hasCharacters ? () => router.push(`/upload?book=${book.id}`) : undefined,
    },
    {
      icon: <IconScreenplay />,
      title: 'Screenplay',
      description: hasScreenplay
        ? `${scenes.length} scene${scenes.length !== 1 ? 's' : ''} scripted and ready for production.`
        : scenes.length > 0 ? 'Scenes ready — screenplay generation in progress.'
        : 'Auto-generate a cinematic screenplay adapted from your manuscript.',
      statusVariant: hasScreenplay ? 'complete' : scenes.length > 0 ? 'in-progress' : 'empty',
      statusLabel: hasScreenplay ? `${scenes.length} Scenes` : scenes.length > 0 ? 'In Progress' : 'Not Started',
      ctaLabel: hasScreenplay || scenes.length > 0 ? 'View Screenplay' : 'Generate Screenplay',
      ctaHref: hasScreenplay || scenes.length > 0 ? `/review/${book.id}` : undefined,
      onCtaClick: !hasScreenplay && scenes.length === 0 ? () => router.push(`/upload?book=${book.id}`) : undefined,
    },
    {
      icon: <IconAudiobook />,
      title: 'Audiobook',
      description: hasAudiobook ? 'Your audiobook is produced and ready to listen.'
        : audiobookInProgress ? 'Recording your audiobook — check back shortly.'
        : 'Narrate your story with a full-cast AI voice production.',
      statusVariant: hasAudiobook ? 'complete' : audiobookInProgress ? 'in-progress' : 'empty',
      statusLabel: hasAudiobook ? 'Complete' : audiobookInProgress ? 'Recording' : 'Not Started',
      ctaLabel: hasAudiobook ? 'Listen' : audiobookInProgress ? null : 'Create Audiobook',
      ctaHref: hasAudiobook || audiobookInProgress ? `/audiobook/${book.id}` : undefined,
      onCtaClick: !hasAudiobook && !audiobookInProgress ? () => router.push(`/audiobook/${book.id}`) : undefined,
    },
    {
      icon: <IconSocial />,
      title: 'Social Media Clips',
      description: 'Short-form clips for TikTok, Instagram Reels & more — auto-cut from your trailer.',
      statusVariant: 'locked',
      statusLabel: 'Locked',
      ctaLabel: null,
      comingSoon: true,
    },
    {
      icon: <IconEmail />,
      title: 'Email Templates',
      description: 'Launch emails, ARC requests & newsletters — personalized from your book.',
      statusVariant: 'locked',
      statusLabel: 'Locked',
      ctaLabel: null,
      comingSoon: true,
    },
  ]

  const completedCount = [hasTrailer, hasApprovedCharacters, hasScreenplay, hasAudiobook, hasCoverImage].filter(Boolean).length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(200,64,47,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 0' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, letterSpacing: '0.01em', padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            My Library
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #C8402F 0%, #E54B38 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.01em' }}>Book<span style={{ color: '#E54B38' }}>Reel</span></span>
          </div>
        </div>

        {/* Book hero */}
        <div style={{ marginTop: '40px', padding: '40px', borderRadius: '20px', background: 'linear-gradient(135deg, #111111 0%, #141414 50%, #111111 100%)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '36px', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(200,64,47,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(200,64,47,0.4) 30%, rgba(200,64,47,0.1) 70%, transparent 100%)' }} />

          {/* Cover */}
          <div style={{ flexShrink: 0, width: '130px', height: '190px', borderRadius: '10px', overflow: 'hidden', position: 'relative', boxShadow: hasCoverImage ? '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(200,64,47,0.15), 0 0 0 1px rgba(255,255,255,0.08)' : '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>
            {hasCoverImage ? (
              <Image src={book.cover_image_url!} alt={book.title} fill style={{ objectFit: 'cover' }} sizes="130px" unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                <span style={{ fontSize: '10px', color: '#374151', textAlign: 'center', padding: '0 8px' }}>No Cover</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E54B38' }}>{userName}&apos;s Production Hub</p>
            <h1 style={{ margin: '0 0 14px', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: '#ffffff' }}>{book.title}</h1>
            {book.genre && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px', background: 'rgba(200,64,47,0.12)', color: '#E54B38', border: '1px solid rgba(200,64,47,0.22)' }}>{book.genre}</span>
              </div>
            )}
            {book.description && (
              <p style={{ margin: '0 0 20px', fontSize: '14.5px', lineHeight: '1.65', color: '#6b7280', maxWidth: '560px' }}>{book.description}</p>
            )}
            {/* Progress pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Trailer', done: hasTrailer },
                { label: 'Characters', done: hasApprovedCharacters },
                { label: 'Screenplay', done: hasScreenplay },
                { label: 'Audiobook', done: hasAudiobook },
              ].map(({ label, done }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '6px', background: done ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', border: done ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: done ? '#22c55e' : '#374151', boxShadow: done ? '0 0 5px #22c55e88' : 'none' }} />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: done ? '#86efac' : '#4b5563' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '52px', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280' }}>Production Modules</h2>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{completedCount} / 4 complete</span>
        </div>

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {sections.map((section, i) => (
            <HubCard key={i} {...section} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#374151' }}>Book<span style={{ color: '#C8402F' }}>Reel</span> — Cinematic tools for indie authors</span>
        </div>

      </div>
    </div>
  )
}
