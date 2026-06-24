'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const border = '#E8E2D5'
const cream  = '#FAFAF7'
const card   = '#FFFFFF'

interface Props {
  bookId: string
  title: string
  genre?: string
  coverUrl?: string
  hasAudiobook: boolean
  audiobookDuration?: number
  hasTrailer: boolean
  trailerDate?: string
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

interface DownloadItemProps {
  icon: string
  title: string
  description: string
  available: boolean
  formats: Array<{ label: string; asset: string; ext: string }>
  bookId: string
}

function DownloadItem({ icon, title, description, available, formats, bookId }: DownloadItemProps) {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (asset: string, label: string) => {
    setDownloading(label)
    // Trigger via anchor redirect — just open the download URL
    const a = document.createElement('a')
    a.href = `/api/books/${bookId}/download?asset=${asset}`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Reset after a moment
    setTimeout(() => setDownloading(null), 2500)
  }

  return (
    <div style={{
      background: card,
      border: `1px solid ${available ? border : '#F0EDE8'}`,
      borderRadius: 14,
      padding: '24px',
      opacity: available ? 1 : 0.55,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: available ? 20 : 0 }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: available ? '#FEF2F0' : '#F4F1EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
        }}>
          {icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 17, fontWeight: 700, color: dark,
            }}>
              {title}
            </span>
            {available && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 100,
                background: '#F0FDF4', border: '1px solid #BBF7D0',
                fontSize: 11, fontWeight: 600, color: '#16A34A',
                fontFamily: 'var(--font-inter), sans-serif',
              }}>
                <CheckIcon /> Ready
              </span>
            )}
          </div>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13, color: muted, margin: 0, lineHeight: 1.5,
          }}>
            {description}
          </p>
        </div>
      </div>

      {/* Download buttons */}
      {available && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {formats.map(fmt => (
            <button
              key={fmt.asset}
              onClick={() => handleDownload(fmt.asset, fmt.label)}
              disabled={!!downloading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10,
                background: downloading === fmt.label ? '#F4F1EB' : card,
                border: `1.5px solid ${downloading === fmt.label ? '#C8402F' : border}`,
                color: downloading === fmt.label ? red : dark,
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, fontWeight: 600,
                cursor: downloading ? 'not-allowed' : 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                if (!downloading) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = red
                  ;(e.currentTarget as HTMLButtonElement).style.color = red
                }
              }}
              onMouseLeave={e => {
                if (downloading !== fmt.label) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = border
                  ;(e.currentTarget as HTMLButtonElement).style.color = dark
                }
              }}
            >
              {downloading === fmt.label ? (
                <>
                  <svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Preparing…
                </>
              ) : (
                <>
                  <DownloadIcon />
                  {fmt.label}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {!available && (
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 12, color: muted, margin: 0, fontStyle: 'italic',
        }}>
          Not yet available — generate this asset first.
        </p>
      )}
    </div>
  )
}

export default function DownloadsClient({
  bookId, title, genre, coverUrl,
  hasAudiobook, audiobookDuration,
  hasTrailer, trailerDate,
}: Props) {
  const router = useRouter()

  const items = [
    {
      icon: '🎧',
      title: 'Audiobook',
      description: hasAudiobook && audiobookDuration
        ? `Full-cast AI-narrated audiobook · ${formatDuration(audiobookDuration)} runtime`
        : 'Full-cast AI-narrated audiobook',
      available: hasAudiobook,
      formats: [
        { label: 'Download MP3', asset: 'audiobook_mp3', ext: 'mp3' },
        { label: 'Download M4B', asset: 'audiobook_m4b', ext: 'm4b' },
      ],
    },
    {
      icon: '🎬',
      title: 'Trailer',
      description: hasTrailer && trailerDate
        ? `Cinematic video trailer · Generated ${new Date(trailerDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : 'Cinematic video trailer',
      available: hasTrailer,
      formats: [
        { label: 'Download MP4', asset: 'trailer', ext: 'mp4' },
      ],
    },
    {
      icon: '🖼️',
      title: 'Book Cover',
      description: coverUrl ? 'Your generated or uploaded book cover image' : 'No cover uploaded yet',
      available: !!coverUrl,
      formats: [
        { label: 'Download Cover', asset: 'cover', ext: 'jpg' },
      ],
    },
  ]

  return (
    <div style={{ background: cream, minHeight: '100vh', paddingTop: 64 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Back */}
        <button
          onClick={() => router.push(`/book/${bookId}`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13, fontWeight: 500, color: muted,
            padding: 0, marginBottom: 36, transition: 'color 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = dark)}
          onMouseLeave={e => (e.currentTarget.style.color = muted)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Book Hub
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 40 }}>
          {/* Cover thumbnail */}
          {coverUrl && (
            <div style={{
              flexShrink: 0, width: 72, height: 100, borderRadius: 8,
              overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div>
            {genre && (
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: red, margin: '0 0 6px',
              }}>
                {genre}
              </p>
            )}
            <h1 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 28, fontWeight: 700, color: dark,
              margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>
              {title}
            </h1>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13, color: muted, margin: 0,
            }}>
              Downloads &amp; Exports
            </p>
          </div>
        </div>

        {/* Download cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(item => (
            <DownloadItem key={item.title} {...item} bookId={bookId} />
          ))}
        </div>

        {/* Listen link if audiobook ready */}
        {hasAudiobook && (
          <div style={{
            marginTop: 32, padding: '18px 20px',
            background: '#FEF2F0', border: `1px solid rgba(200,64,47,0.2)`,
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: dark }}>
              <strong>Want to listen in the browser?</strong> Use the built-in player.
            </div>
            <a
              href={`/listen/${bookId}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 8,
                background: red, color: '#fff', textDecoration: 'none',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}
            >
              🎧 Listen Now
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
