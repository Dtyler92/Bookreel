'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { GlobalNav } from '@/components/shared/GlobalNav'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BuyCreditsModal } from '@/components/author/BuyCreditsModal'
import { PrimaryButton } from '@/components/shared/PrimaryButton'
import type { TrailerStatus } from '@/types/database'

interface BookWithStatus {
  id: string
  title: string
  genre: string | null
  created_at: string
  trailerStatus: TrailerStatus | null
  viewCount: number
  coverImageUrl?: string | null
}

interface DashboardClientProps {
  firstName: string
  userTier: 'free' | 'author' | 'pro'
  userName: string
  books: BookWithStatus[]
  trailersGenerated: number
  totalViews: number
  trailerCredits: number
  creditsResetAt: string | null
}

// ─── Shared Keyframe Styles ────────────────────────────────────────────────────

const CARD_KEYFRAMES = `
  @keyframes indeterminate {
    0%   { left: -60%; width: 60%; }
    60%  { left: 100%; width: 60%; }
    100% { left: 100%; width: 60%; }
  }
  @keyframes shimmer {
    0%   { left: -100%; }
    100% { left: 100%; }
  }
  @keyframes filmPulse {
    0%, 100% { opacity: 0.2; transform: scaleY(0.8); }
    50%       { opacity: 1;   transform: scaleY(1); }
  }
  @keyframes borderPulse {
    0%, 100% { border-color: #E8E2D5; }
    50%       { border-color: rgba(200,64,47,0.45); }
  }
`

// ─── Indeterminate Progress Bar ───────────────────────────────────────────────

function IndeterminateBar({ height = 3, color = '#C8402F', bg = '#E8E2D5' }: { height?: number; color?: string; bg?: string }) {
  return (
    <div style={{ width: '100%', height, background: bg, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        height: '100%',
        background: color,
        borderRadius: 2,
        animation: 'indeterminate 1.4s ease-in-out infinite',
      }} />
    </div>
  )
}

// ─── Shimmer Progress Bar ─────────────────────────────────────────────────────

function ShimmerBar() {
  return (
    <div style={{ width: '100%', height: 3, background: '#EDE9E0', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, #C8402F 40%, #E8735F 60%, transparent 100%)',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }} />
    </div>
  )
}

// ─── Film Frame Loader ────────────────────────────────────────────────────────

function FilmFrames() {
  const frameBase: React.CSSProperties = {
    width: 12,
    height: 18,
    background: '#C8402F',
    borderRadius: 2,
    flexShrink: 0,
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ ...frameBase, animation: 'filmPulse 1.5s ease-in-out 0s infinite' }} />
      <div style={{ ...frameBase, animation: 'filmPulse 1.5s ease-in-out 0.3s infinite' }} />
      <div style={{ ...frameBase, animation: 'filmPulse 1.5s ease-in-out 0.6s infinite' }} />
    </div>
  )
}

// ─── Cover Modal ──────────────────────────────────────────────────────────────

function CoverModal({
  bookId,
  bookTitle,
  bookGenre,
  bookDescription,
  onClose,
  onCoverUpdated,
}: {
  bookId: string
  bookTitle: string
  bookGenre?: string | null
  bookDescription?: string | null
  onClose: () => void
  onCoverUpdated: (bookId: string, coverUrl: string) => void
}) {
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCoverPreview(reader.result as string)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/books/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookTitle,
          genre: bookGenre ?? 'Fiction',
          description: bookDescription ?? '',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to generate cover')
      }
      const data = await res.json()
      setCoverPreview(data.imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    if (!coverPreview) return
    onCoverUpdated(bookId, coverPreview)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(13,13,11,0.55)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(13,13,11,0.15)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '22px', color: '#0D0D0B', margin: '0 0 8px' }}>
          Book Cover
        </h2>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#8A8278', margin: '0 0 24px' }}>
          Upload your own cover or let us generate one using AI.
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#991B1B', fontSize: '13px', fontFamily: 'var(--font-inter), sans-serif' }}>
            {error}
          </div>
        )}

        {/* Preview */}
        {coverPreview && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Cover preview" style={{ width: 100, height: 150, objectFit: 'cover', borderRadius: '6px', border: '1px solid #E8E2D5', boxShadow: '0 4px 12px rgba(13,13,11,0.1)' }} />
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || generating}
            style={{
              flex: 1,
              background: '#F4F1EB',
              border: '1.5px solid #E8E2D5',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: '#2B2B2B',
              cursor: 'pointer',
            }}
          >
            📁 Upload your cover
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || uploading}
            style={{
              flex: 1,
              background: generating ? '#F4F1EB' : '#C8402F',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: generating ? '#8A8278' : '#FFFFFF',
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? 'Generating...' : '✨ Generate one for me'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {generating && <div style={{ marginBottom: '16px' }}><IndeterminateBar height={3} /></div>}

        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', color: '#8A8278', margin: '0 0 20px' }}>
          Upload: .jpg, .png, .webp — max 5MB
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1.5px solid #E8E2D5', borderRadius: '8px', padding: '10px 20px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#8A8278', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!coverPreview}
            style={{
              background: coverPreview ? '#C8402F' : '#E8E2D5',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: coverPreview ? '#FFFFFF' : '#8A8278',
              cursor: coverPreview ? 'pointer' : 'not-allowed',
            }}
          >
            Use this cover
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Book Card ─────────────────────────────────────────────────────────────────

function BookCard({
  book,
  onChangeCover,
  onDelete,
}: {
  book: BookWithStatus
  onChangeCover: (book: BookWithStatus) => void
  onDelete: (book: BookWithStatus) => void
}) {
  const [trailerStatus, setTrailerStatus] = useState<TrailerStatus | null>(book.trailerStatus)
  const [coverUrl, setCoverUrl] = useState<string | null | undefined>(book.coverImageUrl)
  const [retryHover, setRetryHover] = useState(false)
  const [playHover, setPlayHover] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isGenerating = trailerStatus === 'pending' || trailerStatus === 'processing' || trailerStatus === 'generating'
  const isFailed = trailerStatus === 'failed'
  const isComplete = trailerStatus === 'complete'

  useEffect(() => {
    if (isGenerating) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/books/status/${book.id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.status && data.status !== trailerStatus) {
              setTrailerStatus(data.status)
              if (data.status === 'complete' || data.status === 'failed') {
                if (pollRef.current) clearInterval(pollRef.current)
              }
            }
          }
        } catch {
          // swallow
        }
      }, 30000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, isGenerating])

  const handleChangeCover = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChangeCover(book)
  }

  // ── Cover area content ────────────────────────────────────────────────────

  const renderCover = () => {
    if (isGenerating) {
      return (
        /* ── Generating State: warm editorial light background ── */
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg, #F4F1EB 0%, #EDE9E0 50%, #E8E2D5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}>
          <FilmFrames />
          <span style={{
            fontFamily: 'var(--font-playfair), serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: '#8A8278',
            textAlign: 'center',
            padding: '0 16px',
            lineHeight: 1.4,
          }}>
            Crafting your trailer…
          </span>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 11,
            color: '#B0A99E',
            textAlign: 'center',
          }}>
            Usually ready in 15–20 min
          </span>
        </div>
      )
    }

    if (isFailed) {
      return (
        /* ── Failed State ── */
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg, #F4F1EB 0%, #EDE9E0 50%, #E8E2D5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 10,
        }}>
          <span style={{ fontSize: 22, color: '#C8402F', lineHeight: 1 }}>⚠</span>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 14,
            fontWeight: 500,
            color: '#C8402F',
            textAlign: 'center',
            padding: '0 12px',
          }}>
            Generation failed
          </span>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 11,
            color: '#8A8278',
          }}>
            Please try again
          </span>
          {/* Retry button — stops link propagation */}
          <button
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              setTrailerStatus('generating')
              try {
                await fetch(`/api/books/${book.id}/retry-trailer`, { method: 'POST' })
              } catch (_) { /* ignore */ }
            }}
            onMouseEnter={() => setRetryHover(true)}
            onMouseLeave={() => setRetryHover(false)}
            style={{
              marginTop: 4,
              background: retryHover ? '#C8402F' : 'transparent',
              border: '1.5px solid #C8402F',
              borderRadius: '6px',
              padding: '5px 14px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: retryHover ? '#FFFFFF' : '#C8402F',
              cursor: 'pointer',
              transition: 'background 150ms ease, color 150ms ease',
              letterSpacing: '0.02em',
            }}
          >
            Retry
          </button>
        </div>
      )
    }

    if (isComplete && book.trailerStatus === 'complete') {
      return (
        /* ── Complete State: cover image + play button overlay ── */
        <div
          style={{ position: 'relative', width: '100%', height: '100%' }}
          onMouseEnter={() => setPlayHover(true)}
          onMouseLeave={() => setPlayHover(false)}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(145deg, #C8402F 0%, #8A1C10 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)',
              fontSize: '48px',
            }}>
              📖
            </div>
          )}
          {/* Dark scrim + play button on hover */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: playHover ? 'rgba(13,13,11,0.35)' : 'rgba(13,13,11,0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 200ms ease',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(13,13,11,0.25)',
              transform: playHover ? 'scale(1.05)' : 'scale(1)',
              opacity: playHover ? 1 : 0,
              transition: 'opacity 200ms ease, transform 200ms ease',
            }}>
              {/* Vermillion play triangle */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <polygon points="6,4 14,9 6,14" fill="#C8402F" />
              </svg>
            </div>
          </div>
        </div>
      )
    }

    // Default: cover image or placeholder
    if (coverUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )
    }
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(145deg, #C8402F 0%, #8A1C10 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.2)',
        fontSize: '48px',
      }}>
        📖
      </div>
    )
  }

  // ── Card body status section ──────────────────────────────────────────────

  const renderStatusSection = () => {
    if (isComplete) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>✅</span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', fontWeight: 500, color: '#16A34A' }}>
            Ready to view!
          </span>
        </div>
      )
    }

    if (isGenerating) {
      return (
        /* In Production badge + shimmer progress bar */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            padding: '3px 10px',
            borderRadius: '100px',
            background: '#FDF3DC',
            color: '#A16207',
          }}>
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#D97706',
              animation: 'filmPulse 1.5s ease-in-out infinite',
            }} />
            In Production
          </span>
          <ShimmerBar />
        </div>
      )
    }

    if (isFailed) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>⚠</span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', fontWeight: 500, color: '#C8402F' }}>
            Generation failed
          </span>
        </div>
      )
    }

    if (trailerStatus) {
      return <div><StatusBadge status={trailerStatus} /></div>
    }

    return null
  }

  return (
    <>
      {/* Inject keyframes once per card mount — React dedupes style tags */}
      <style>{CARD_KEYFRAMES}</style>
      <Link key={book.id} href={`/review/${book.id}`} style={{ textDecoration: 'none' }}>
        <div style={{
          background: '#FFFFFF',
          border: `1px solid ${isGenerating ? 'rgba(200,64,47,0.3)' : '#E8E2D5'}`,
          borderRadius: '10px',
          overflow: 'hidden',
          transition: 'box-shadow 150ms ease, border-color 150ms ease',
          animation: isGenerating ? 'borderPulse 2s ease-in-out infinite' : undefined,
        }}
          onMouseEnter={e => {
            if (!isGenerating) {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(13,13,11,0.08)'
              ;(e.currentTarget as HTMLDivElement).style.borderColor = '#C8402F'
            }
          }}
          onMouseLeave={e => {
            if (!isGenerating) {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
              ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E8E2D5'
            }
          }}
        >
          {/* Cover */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3' }}>
            {renderCover()}
            {/* Delete book button — top right */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(book) }}
              title="Remove this book"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(13,13,11,0.65)',
                border: 'none',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#FAFAF7',
                cursor: 'pointer',
              }}
            >
              🗑
            </button>
            {/* Change cover button — always visible */}
            <button
              onClick={handleChangeCover}
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(13,13,11,0.65)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: '#FAFAF7',
                cursor: 'pointer',
              }}
            >
              📷 Change Cover
            </button>
          </div>

          {/* Card body */}
          <div style={{ padding: '16px' }}>
            <p style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '16px',
              color: '#0D0D0B',
              margin: '0 0 8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {book.title}
            </p>
            {book.genre && (
              <span style={{
                display: 'inline-block',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '100px',
                background: '#EDE9E0',
                color: '#8A8278',
                marginBottom: '10px',
              }}>
                {book.genre}
              </span>
            )}

            {/* Trailer status / progress */}
            {renderStatusSection()}
          </div>
        </div>
      </Link>
    </>
  )
}

// ─── Delete Book Modal ─────────────────────────────────────────────────────────

function DeleteBookModal({
  book,
  creditsResetAt,
  onClose,
  onDeleted,
}: {
  book: BookWithStatus
  creditsResetAt: string | null
  onClose: () => void
  onDeleted: (bookId: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [info, setInfo] = useState<{
    creditAlreadyUsed: boolean
    currentCredits: number
    resetAt: string | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/books/${book.id}/delete`)
        const data = await res.json()
        if (active && res.ok) {
          setInfo({
            creditAlreadyUsed: data.creditAlreadyUsed,
            currentCredits: data.currentCredits,
            resetAt: data.resetAt,
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [book.id])

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/books/${book.id}/delete`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted(book.id)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete book')
        setDeleting(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setDeleting(false)
    }
  }

  const resetDate = (info?.resetAt || creditsResetAt)
    ? new Date((info?.resetAt || creditsResetAt) as string).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : 'your next billing date'

  const confirmed = confirmText.trim().toUpperCase() === 'DELETE'

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,13,11,0.55)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{
        background: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%',
        padding: '32px', boxShadow: '0 20px 60px rgba(13,13,11,0.3)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '22px',
          color: '#0D0D0B', margin: '0 0 12px',
        }}>
          Remove &ldquo;{book.title}&rdquo;?
        </h2>

        <p style={{
          fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px',
          color: '#1A1A18', lineHeight: 1.6, margin: '0 0 16px',
        }}>
          This permanently deletes your book and <strong>all of its data</strong> — the
          screenplay, characters, scene images, and any generated trailer. This
          <strong> cannot be undone.</strong>
        </p>

        {loading ? (
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
            color: '#8A8278', margin: '0 0 20px',
          }}>
            Checking your credits…
          </p>
        ) : (
          <div style={{
            background: '#FDF4E3', border: '1px solid #E8A23D', borderRadius: '10px',
            padding: '16px', marginBottom: '20px',
          }}>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
              fontWeight: 600, color: '#8A5A12', margin: '0 0 6px',
            }}>
              ⚠️ Heads up about your trailer credit
            </p>
            {info?.creditAlreadyUsed ? (
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
                color: '#6B4E1F', margin: 0, lineHeight: 1.55,
              }}>
                You already used a trailer credit on this book. Deleting it
                <strong> will not refund that credit.</strong> You currently have{' '}
                <strong>{info.currentCredits} credit{info.currentCredits === 1 ? '' : 's'}</strong> left.
                {info.currentCredits < 1 && (
                  <> Your next free credit arrives <strong>{resetDate}</strong> — until then you&rsquo;d need to buy a redo credit to make a new trailer.</>
                )}
              </p>
            ) : (
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
                color: '#6B4E1F', margin: 0, lineHeight: 1.55,
              }}>
                This book hasn&rsquo;t used a trailer credit yet, so nothing is lost there.
                You have <strong>{info?.currentCredits ?? 0} credit{(info?.currentCredits ?? 0) === 1 ? '' : 's'}</strong> available.
              </p>
            )}
          </div>
        )}

        <label style={{
          display: 'block', fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '12px', fontWeight: 600, color: '#8A8278', margin: '0 0 6px',
        }}>
          Type DELETE to confirm
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          style={{
            width: '100%', padding: '10px 12px', fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '14px', border: '1px solid #E8E2D5', borderRadius: '8px',
            outline: 'none', marginBottom: '20px', boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
            color: '#C8402F', margin: '0 0 12px',
          }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              background: 'transparent', border: '1px solid #E8E2D5', borderRadius: '8px',
              padding: '10px 18px', fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px', fontWeight: 600, color: '#1A1A18', cursor: 'pointer',
            }}
          >
            Keep my book
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            style={{
              background: confirmed && !deleting ? '#C8402F' : '#E0B5AE',
              color: '#FFFFFF', border: 'none', borderRadius: '8px',
              padding: '10px 18px', fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px', fontWeight: 600,
              cursor: confirmed && !deleting ? 'pointer' : 'not-allowed',
            }}
          >
            {deleting ? 'Removing…' : 'Permanently remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main DashboardClient ──────────────────────────────────────────────────────

export function DashboardClient({
  firstName,
  userTier,
  userName,
  books: initialBooks,
  trailersGenerated,
  totalViews,
  trailerCredits,
  creditsResetAt,
}: DashboardClientProps) {
  const [books, setBooks] = useState<BookWithStatus[]>(initialBooks)
  const [credits, setCredits] = useState<number>(trailerCredits)
  const [deleteBook, setDeleteBook] = useState<BookWithStatus | null>(null)
  const [coverModalBook, setCoverModalBook] = useState<BookWithStatus | null>(null)
  const [showBuyCredits, setShowBuyCredits] = useState(false)

  const stats = [
    { label: 'Trailers Generated', value: trailersGenerated },
    { label: 'Total Views', value: totalViews },
    { label: 'Books Listed', value: books.length },
  ]

  const handleCoverUpdated = (bookId: string, coverUrl: string) => {
    setBooks((prev) => prev.map((b) => b.id === bookId ? { ...b, coverImageUrl: coverUrl } : b))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7' }}>
      <GlobalNav userName={userName} userTier={userTier} credits={credits} />

      <main style={{
        paddingTop: '64px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '104px 24px 64px',
      }}>
        {/* Welcome */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            fontSize: '36px',
            color: '#0D0D0B',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Welcome back, {firstName}.
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '15px',
            color: '#8A8278',
            marginTop: '8px',
            marginBottom: 0,
          }}>
            Here&apos;s what&apos;s happening with your books.
          </p>
          <button
            onClick={() => setShowBuyCredits(true)}
            style={{
              marginTop: '16px',
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: credits > 0 ? 'rgba(200,64,47,0.06)' : '#C8402F',
              border: credits > 0 ? '1px solid rgba(200,64,47,0.25)' : 'none',
              borderRadius: '999px', padding: '8px 16px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '13px', fontWeight: 600,
              color: credits > 0 ? '#C8402F' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>🎬</span>
            {credits > 0
              ? `${credits} credit${credits === 1 ? '' : 's'} · Buy more`
              : 'Out of credits · Buy credits'}
          </button>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '48px',
        }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{
              background: '#F4F1EB',
              border: '1px solid #E8E2D5',
              borderRadius: '12px',
              padding: '24px 28px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
            }}>
              {/* Accent bar */}
              <div style={{
                width: '3px',
                height: '40px',
                background: '#C8402F',
                borderRadius: '2px',
                flexShrink: 0,
              }} />
              <div>
                <div style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 900,
                  fontSize: '48px',
                  color: '#0D0D0B',
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#8A8278',
                  marginTop: '4px',
                }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Books Section */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#0D0D0B',
              margin: 0,
            }}>
              My Books
            </h2>
            <Link href="/upload" style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: '#C8402F',
              textDecoration: 'none',
            }}>
              Add My First Book →
            </Link>
          </div>

          {books.length === 0 ? (
            /* Empty State */
            <div style={{
              background: '#F4F1EB',
              border: '2px dashed #E8E2D5',
              borderRadius: '16px',
              padding: '80px 40px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '56px', marginBottom: '20px' }}>📚</div>
              <h3 style={{
                fontFamily: 'var(--font-playfair), serif',
                fontWeight: 700,
                fontSize: '22px',
                color: '#0D0D0B',
                margin: '0 0 12px',
              }}>
                Your shelf is empty.
              </h3>
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '15px',
                color: '#8A8278',
                margin: '0 0 28px',
                maxWidth: '380px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}>
                Upload your manuscript and we&apos;ll turn it into a cinematic trailer.
              </p>
              <Link href="/upload">
                <PrimaryButton>Add My First Book →</PrimaryButton>
              </Link>
            </div>
          ) : (
            /* Book Cards Grid */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '20px',
            }}>
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onChangeCover={(b) => setCoverModalBook(b)}
                  onDelete={(b) => setDeleteBook(b)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <Link href="/upload" style={{ textDecoration: 'none' }}>
        <div style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          background: '#C8402F',
          color: '#FAFAF7',
          borderRadius: '50px',
          padding: '14px 20px',
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          boxShadow: '0 4px 20px rgba(200,64,47,0.35)',
          cursor: 'pointer',
          zIndex: 50,
          transition: 'background 150ms ease, transform 100ms ease',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#A8321F' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#C8402F' }}
        >
          + Add Book
        </div>
      </Link>

      {/* Cover Modal */}
      {coverModalBook && (
        <CoverModal
          bookId={coverModalBook.id}
          bookTitle={coverModalBook.title}
          bookGenre={coverModalBook.genre}
          onClose={() => setCoverModalBook(null)}
          onCoverUpdated={handleCoverUpdated}
        />
      )}

      {/* Delete Book Modal */}
      {deleteBook && (
        <DeleteBookModal
          book={deleteBook}
          creditsResetAt={creditsResetAt}
          onClose={() => setDeleteBook(null)}
          onDeleted={(id) => {
            setBooks((prev) => prev.filter((b) => b.id !== id))
            setDeleteBook(null)
          }}
        />
      )}

      {/* Buy Credits Modal */}
      {showBuyCredits && (
        <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />
      )}
    </div>
  )
}
