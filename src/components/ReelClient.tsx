'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReelItem {
  trailerId:    string
  videoUrl:     string
  thumbnailUrl: string | null
  bookId:       string
  title:        string
  description:  string | null
  genre:        string | null
  coverUrl:     string | null
  amazonLink:   string | null
  authorId:     string | null
  authorName:   string
  authorPhoto:  string | null
  isSaved:      boolean
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={filled ? '#C8402F' : 'none'} stroke={filled ? '#C8402F' : '#fff'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function UserBooksIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function MuteIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

// ─── Single Reel Slide ────────────────────────────────────────────────────────

function ReelSlide({
  item,
  isActive,
  globalMuted,
  onToggleMute,
  onSaveToggle,
}: {
  item:          ReelItem
  isActive:      boolean
  globalMuted:   boolean
  onToggleMute:  () => void
  onSaveToggle:  (bookId: string, wasSaved: boolean) => void
}) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const [saved, setSaved]         = useState(item.isSaved)
  const [saving, setSaving]       = useState(false)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [paused, setPaused]       = useState(false)

  // Play / pause based on active slide
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      v.currentTime = 0
      v.play().catch(() => {/* autoplay blocked — user will tap */})
    } else {
      v.pause()
    }
  }, [isActive])

  // Sync mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted
  }, [globalMuted])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const wasSaved = saved
    setSaved(!wasSaved) // optimistic
    try {
      if (wasSaved) {
        await fetch(`/api/saved-books?bookId=${item.bookId}`, { method: 'DELETE' })
      } else {
        await fetch('/api/saved-books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: item.bookId }),
        })
        setSaveFeedback(true)
        setTimeout(() => setSaveFeedback(false), 1800)
      }
      onSaveToggle(item.bookId, wasSaved)
    } catch {
      setSaved(wasSaved) // rollback
    } finally {
      setSaving(false)
    }
  }

  const handleTap = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPaused(false) }
    else          { v.pause(); setPaused(true) }
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* Video */}
      <video
        ref={videoRef}
        src={item.videoUrl}
        poster={item.thumbnailUrl ?? undefined}
        loop
        playsInline
        muted={globalMuted}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onClick={handleTap}
      />

      {/* Pause indicator */}
      {paused && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" stroke="none">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      )}

      {/* Dark gradient overlays */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.0) 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '80px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Top bar — logo + mute */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 900, fontSize: 18, color: '#fff' }}>Book</span>
          <span style={{ display: 'inline-block', width: 8, height: 8, border: '2px solid #C8402F', outline: '1px solid #C8402F', outlineOffset: 2, background: 'transparent' }} />
          <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 900, fontSize: 18, color: '#C8402F', fontStyle: 'italic' }}>Reel</span>
        </Link>
        <button
          onClick={e => { e.stopPropagation(); onToggleMute() }}
          style={{
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MuteIcon muted={globalMuted} />
        </button>
      </div>

      {/* Right side action buttons */}
      <div style={{
        position: 'absolute', right: 14, bottom: 140,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        {/* Save for later */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <button
            onClick={e => { e.stopPropagation(); handleSave() }}
            style={{
              background: saved ? 'rgba(200,64,47,0.25)' : 'rgba(0,0,0,0.45)',
              border: `1px solid ${saved ? 'rgba(200,64,47,0.6)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '50%', width: 48, height: 48, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms ease',
              transform: saving ? 'scale(0.92)' : 'scale(1)',
            }}
            title={saved ? 'Remove from saved' : 'Save for later'}
          >
            <HeartIcon filled={saved} />
          </button>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, color: '#fff', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {saved ? 'Saved' : 'Save'}
          </span>
        </div>

        {/* Amazon link */}
        {item.amazonLink && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <a
              href={item.amazonLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%', width: 48, height: 48, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
              }}
              title="Buy on Amazon"
            >
              <ShoppingBagIcon />
            </a>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, color: '#fff', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              Amazon
            </span>
          </div>
        )}

        {/* Author's books */}
        {item.authorId && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <Link
              href={`/author/${item.authorId}`}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%', width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
              }}
              title="View author's books"
            >
              <UserBooksIcon />
            </Link>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, color: '#fff', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              Author
            </span>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 70,
        padding: '0 18px 28px',
      }}>
        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {item.authorPhoto ? (
            <img src={item.authorPhoto} alt={item.authorName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(200,64,47,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', fontSize: 14, color: '#fff', fontWeight: 700 }}>
              {item.authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {item.authorName}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: 22, fontWeight: 900, color: '#fff',
          margin: '0 0 6px', lineHeight: 1.2,
          textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        }}>
          {item.title}
        </h2>

        {/* Genre + description */}
        {item.genre && (
          <span style={{
            display: 'inline-block', marginBottom: 8,
            background: 'rgba(200,64,47,0.75)',
            color: '#fff', fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-inter), sans-serif',
            padding: '3px 10px', borderRadius: 100,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {item.genre}
          </span>
        )}
        {item.description && (
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13, color: 'rgba(255,255,255,0.85)',
            margin: 0, lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {item.description}
          </p>
        )}
      </div>

      {/* Save feedback toast */}
      {saveFeedback && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff', borderRadius: 12, padding: '12px 22px',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14, fontWeight: 600,
          border: '1px solid rgba(200,64,47,0.5)',
          pointerEvents: 'none',
          animation: 'fadeInOut 1.8s ease forwards',
        }}>
          ♥ Saved for later
        </div>
      )}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyReel() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0D0D0B',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ marginBottom: 24, opacity: 0.3 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.2">
          <rect x="2" y="2" width="20" height="20" rx="2.18" />
          <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>
        The Reel is warming up.
      </h2>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 32px', maxWidth: 320, lineHeight: 1.6 }}>
        Authors publish their trailers to the Reel when they download them. Check back soon.
      </p>
      <Link href="/browse" style={{
        background: '#C8402F', color: '#fff', textDecoration: 'none',
        padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
        fontFamily: 'var(--font-inter), sans-serif',
      }}>
        Browse Books Instead
      </Link>
    </div>
  )
}

// ─── Main Reel Client ─────────────────────────────────────────────────────────

export default function ReelClient() {
  const [feed, setFeed]         = useState<ReelItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [cursor, setCursor]     = useState<string | null>(null)
  const [hasMore, setHasMore]   = useState(false)
  const [active, setActive]     = useState(0)
  const [muted, setMuted]       = useState(true)
  const containerRef            = useRef<HTMLDivElement>(null)
  const observerRef             = useRef<IntersectionObserver | null>(null)
  const slideRefs               = useRef<(HTMLDivElement | null)[]>([])

  const loadFeed = useCallback(async (cursorParam?: string) => {
    const url = `/api/reel?limit=10${cursorParam ? `&cursor=${cursorParam}` : ''}`
    const res  = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    setFeed(prev => cursorParam ? [...prev, ...data.feed] : data.feed)
    setCursor(data.nextCursor)
    setHasMore(data.hasMore)
    setLoading(false)
  }, [])

  useEffect(() => { loadFeed() }, [loadFeed])

  // IntersectionObserver — detect active slide
  useEffect(() => {
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = slideRefs.current.indexOf(entry.target as HTMLDivElement)
            if (idx !== -1) setActive(idx)
            // Load more when near end
            if (idx >= feed.length - 3 && hasMore) {
              loadFeed(cursor ?? undefined)
            }
          }
        }
      },
      { threshold: 0.6 }
    )
    slideRefs.current.forEach(el => { if (el) observerRef.current!.observe(el) })
    return () => observerRef.current?.disconnect()
  }, [feed, cursor, hasMore, loadFeed])

  const handleSaveToggle = (bookId: string, wasSaved: boolean) => {
    setFeed(prev => prev.map(item =>
      item.bookId === bookId ? { ...item, isSaved: !wasSaved } : item
    ))
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0D0D0B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(200,64,47,0.3)',
            borderTop: '3px solid #C8402F',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Loading the Reel…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!feed.length) return <EmptyReel />

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: hidden; background: #000; }
        .reel-container {
          position: fixed; inset: 0;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .reel-container::-webkit-scrollbar { display: none; }
        .reel-slide {
          scroll-snap-align: start;
          scroll-snap-stop: always;
          width: 100%;
          height: 100dvh;
          flex-shrink: 0;
          position: relative;
        }
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          15%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div ref={containerRef} className="reel-container">
        {feed.map((item, idx) => (
          <div
            key={item.trailerId}
            className="reel-slide"
            ref={el => { slideRefs.current[idx] = el }}
          >
            <ReelSlide
              item={item}
              isActive={active === idx}
              globalMuted={muted}
              onToggleMute={() => setMuted(m => !m)}
              onSaveToggle={handleSaveToggle}
            />
          </div>
        ))}

        {/* Loading more indicator */}
        {hasMore && (
          <div style={{ height: '100dvh', background: '#0D0D0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(200,64,47,0.3)', borderTop: '2px solid #C8402F', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </div>
    </>
  )
}
