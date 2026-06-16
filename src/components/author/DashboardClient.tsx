'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { GlobalNav } from '@/components/shared/GlobalNav'
import { StatusBadge } from '@/components/shared/StatusBadge'
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
}

// ─── Indeterminate Progress Bar ───────────────────────────────────────────────

function IndeterminateBar({ height = 3, color = '#C8402F', bg = '#E8E2D5' }: { height?: number; color?: string; bg?: string }) {
  return (
    <div style={{ width: '100%', height, background: bg, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes indeterminate {
          0%   { left: -60%; width: 60%; }
          60%  { left: 100%; width: 60%; }
          100% { left: 100%; width: 60%; }
        }
      `}</style>
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
}: {
  book: BookWithStatus
  onChangeCover: (book: BookWithStatus) => void
}) {
  const [trailerStatus, setTrailerStatus] = useState<TrailerStatus | null>(book.trailerStatus)
  const [coverUrl, setCoverUrl] = useState<string | null | undefined>(book.coverImageUrl)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isGenerating = trailerStatus === 'processing' || trailerStatus === 'generating'

  useEffect(() => {
    if (isGenerating) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/books/trailer-status?bookId=${book.id}`)
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
      }, 10000)
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

  return (
    <Link key={book.id} href={`/review/${book.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8E2D5',
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(13,13,11,0.08)'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = '#C8402F'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E8E2D5'
        }}
      >
        {/* Cover */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3' }}>
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
          {/* Change cover button */}
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
          {trailerStatus === 'complete' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>✅</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', fontWeight: 500, color: '#16A34A' }}>
                Ready to view!
              </span>
            </div>
          ) : isGenerating ? (
            <div style={{ marginTop: '4px' }}>
              <IndeterminateBar height={3} />
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: '#8A8278', margin: '6px 0 2px' }}>
                Generating your trailer...
              </p>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', color: '#8A8278', margin: 0 }}>
                Usually ready in 15–20 minutes
              </p>
            </div>
          ) : trailerStatus ? (
            <div>
              <StatusBadge status={trailerStatus} />
            </div>
          ) : null}
        </div>
      </div>
    </Link>
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
}: DashboardClientProps) {
  const [books, setBooks] = useState<BookWithStatus[]>(initialBooks)
  const [coverModalBook, setCoverModalBook] = useState<BookWithStatus | null>(null)

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
      <GlobalNav userName={userName} userTier={userTier} />

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
    </div>
  )
}
