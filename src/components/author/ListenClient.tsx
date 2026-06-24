'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChapterEntry {
  index: number
  title: string
  startSeconds: number
  endSeconds?: number
}

interface Props {
  bookId: string
  title: string
  genre?: string
  coverUrl?: string
  audioUrl: string
  durationSeconds?: number
  chapters: ChapterEntry[]
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const border = '#E8E2D5'
const cream  = '#FAFAF7'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function PauseIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ListenClient({
  bookId, title, genre, coverUrl, audioUrl, durationSeconds, chapters,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)

  const [playing, setPlaying]             = useState(false)
  const [currentTime, setCurrentTime]     = useState(0)
  const [duration, setDuration]           = useState(durationSeconds ?? 0)
  const [speed, setSpeed]                 = useState(1)
  const [currentChapterIdx, setChapterIdx] = useState(0)
  const [dragging, setDragging]           = useState(false)
  const [scrubTime, setScrubTime]         = useState<number | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // ── Audio event handlers ────────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (!dragging) setCurrentTime(audio.currentTime)
      // Update current chapter
      if (chapters.length > 0) {
        let idx = 0
        for (let i = chapters.length - 1; i >= 0; i--) {
          if (audio.currentTime >= chapters[i].startSeconds) { idx = i; break }
        }
        setChapterIdx(idx)
      }
    }
    const onLoaded = () => {
      if (!durationSeconds) setDuration(audio.duration)
    }
    const onEnded = () => setPlaying(false)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('durationchange', onLoaded)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('durationchange', onLoaded)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [dragging, durationSeconds, chapters])

  // ── Playback speed ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  // ── Controls ────────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    playing ? audio.pause() : audio.play()
  }

  const seekTo = useCallback((secs: number) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(secs, duration || Infinity))
    audio.currentTime = clamped
    setCurrentTime(clamped)
  }, [duration])

  const seekToChapter = (ch: ChapterEntry) => {
    seekTo(ch.startSeconds)
    if (audioRef.current && !playing) audioRef.current.play()
  }

  // ── Progress bar scrubbing ──────────────────────────────────────────────────
  const calcTimeFromEvent = useCallback((clientX: number) => {
    const bar = progressBarRef.current
    if (!bar || !duration) return null
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * duration
  }, [duration])

  const onBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    const t = calcTimeFromEvent(e.clientX)
    if (t !== null) setScrubTime(t)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const t = calcTimeFromEvent(e.clientX)
      if (t !== null) setScrubTime(t)
    }
    const onUp = (e: MouseEvent) => {
      const t = calcTimeFromEvent(e.clientX)
      if (t !== null) seekTo(t)
      setDragging(false)
      setScrubTime(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, calcTimeFromEvent, seekTo])

  // Touch support
  const onBarTouchStart = (e: React.TouchEvent) => {
    const t = calcTimeFromEvent(e.touches[0].clientX)
    if (t !== null) seekTo(t)
  }

  const displayTime = dragging && scrubTime !== null ? scrubTime : currentTime
  const progress    = duration > 0 ? (displayTime / duration) * 100 : 0

  const currentChapter = chapters.length > 0 ? chapters[currentChapterIdx] : null

  // ── Download URLs ───────────────────────────────────────────────────────────
  // If audio_url ends in .m4b or .mp3, derive the other; else just offer the same
  const m4bUrl  = audioUrl.replace(/\.(mp3|wav)$/i, '.m4b')
  const mp3Url  = audioUrl.replace(/\.(m4b|wav)$/i, '.mp3')

  const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

  return (
    <div style={{ background: cream, minHeight: '100vh', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: `1px solid ${border}`,
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <Link href={`/book/${bookId}`} style={{ color: muted, textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </Link>
        <div style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '18px', color: dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        {genre && (
          <span style={{ fontSize: '12px', color: muted, background: '#EDE9E0', borderRadius: '20px', padding: '3px 10px', flexShrink: 0 }}>
            {genre}
          </span>
        )}
      </div>

      {/* Main layout */}
      <div style={{
        maxWidth: '1100px', margin: '0 auto', padding: '32px 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: '32px',
      }}
        className="listen-layout"
      >

        {/* ── Left: Player ───────────────────────────────────────────────────── */}
        <div>

          {/* Book cover + meta */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap' }}>
            <div style={{ flexShrink: 0, width: '140px', height: '200px', borderRadius: '12px', overflow: 'hidden', background: '#EDE9E0', boxShadow: '0 8px 24px rgba(13,13,11,0.12)' }}>
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📖</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                Now Playing
              </div>
              <h1 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '28px', fontWeight: 700, color: dark, margin: '0 0 8px', lineHeight: 1.25 }}>
                {title}
              </h1>
              {genre && (
                <div style={{ fontSize: '13px', color: muted, marginBottom: '16px' }}>{genre}</div>
              )}
              {duration > 0 && (
                <div style={{ fontSize: '14px', color: muted }}>
                  🎧 {formatTime(duration)} total
                </div>
              )}
            </div>
          </div>

          {/* Current chapter name */}
          {currentChapter && (
            <div style={{
              fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: muted,
              marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ color: red, fontWeight: 600 }}>▶</span>
              {currentChapter.title}
            </div>
          )}

          {/* Progress bar */}
          <div style={{ marginBottom: '10px' }}>
            <div
              ref={progressBarRef}
              onMouseDown={onBarMouseDown}
              onTouchStart={onBarTouchStart}
              style={{
                height: '6px', background: '#DDD8CE', borderRadius: '999px',
                cursor: 'pointer', position: 'relative', userSelect: 'none',
              }}
            >
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${progress}%`, background: red, borderRadius: '999px',
                transition: dragging ? 'none' : 'width 0.25s linear',
              }} />
              {/* Thumb */}
              <div style={{
                position: 'absolute', top: '50%', left: `${progress}%`,
                transform: 'translate(-50%, -50%)',
                width: '14px', height: '14px', borderRadius: '50%',
                background: red, boxShadow: '0 2px 6px rgba(200,64,47,0.4)',
                cursor: 'grab',
              }} />
            </div>
          </div>

          {/* Time display */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: muted, marginBottom: '32px' }}>
            <span>{formatTime(displayTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>

          {/* Play/Pause + Speed */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '40px' }}>

            {/* Rewind 15s */}
            <button
              onClick={() => seekTo(currentTime - 15)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '8px', borderRadius: '50%' }}
              title="Back 15 seconds"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 .49-3.96" />
                <text x="8.5" y="14" style={{ fontSize: '6px', fill: 'currentColor', fontFamily: 'sans-serif', stroke: 'none' }}>15</text>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: red, color: '#fff', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(200,64,47,0.35)',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
            >
              {playing ? <PauseIcon size={32} /> : <PlayIcon size={32} />}
            </button>

            {/* Forward 30s */}
            <button
              onClick={() => seekTo(currentTime + 30)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '8px', borderRadius: '50%' }}
              title="Forward 30 seconds"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-.48-3.97" />
                <text x="8.5" y="14" style={{ fontSize: '6px', fill: 'currentColor', fontFamily: 'sans-serif', stroke: 'none' }}>30</text>
              </svg>
            </button>
          </div>

          {/* Speed selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
            <span style={{ fontSize: '12px', color: muted, marginRight: '4px' }}>Speed</span>
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: speed === s ? 700 : 400,
                  background: speed === s ? red : '#fff',
                  color: speed === s ? '#fff' : muted,
                  border: `1.5px solid ${speed === s ? red : border}`,
                  transition: 'all 0.15s',
                }}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Download buttons */}
          <div style={{
            borderTop: `1px solid ${border}`, paddingTop: '28px',
            display: 'flex', gap: '12px', flexWrap: 'wrap',
          }}>
            <a
              href={m4bUrl}
              download
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '11px 20px', borderRadius: '10px',
                border: `1.5px solid ${border}`, background: '#fff', color: dark,
                textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              <DownloadIcon /> Download M4B
            </a>
            <a
              href={mp3Url}
              download
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '11px 20px', borderRadius: '10px',
                border: `1.5px solid ${border}`, background: '#fff', color: dark,
                textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              <DownloadIcon /> Download MP3
            </a>
          </div>
        </div>

        {/* ── Right: Chapter list ─────────────────────────────────────────────── */}
        {chapters.length > 0 && (
          <div>
            <div style={{
              background: '#fff', border: `1.5px solid ${border}`,
              borderRadius: '16px', overflow: 'hidden',
              position: 'sticky', top: '70px',
            }}>
              <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${border}` }}>
                <h3 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '17px', color: dark, margin: 0 }}>
                  Chapters
                </h3>
              </div>
              <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {chapters.map((ch, i) => {
                  const active = i === currentChapterIdx
                  return (
                    <button
                      key={ch.index}
                      onClick={() => seekToChapter(ch)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '14px 20px',
                        background: active ? 'rgba(200,64,47,0.05)' : 'transparent',
                        border: 'none', borderBottom: `1px solid ${border}`,
                        cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{
                        flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
                        background: active ? red : '#EDE9E0',
                        color: active ? '#fff' : muted,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, marginTop: '1px',
                      }}>
                        {active ? <span style={{ fontSize: '8px' }}>▶</span> : i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
                          fontWeight: active ? 700 : 400, color: active ? red : dark,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginBottom: '2px',
                        }}>
                          {ch.title}
                        </div>
                        <div style={{ fontSize: '11px', color: muted }}>
                          {formatTime(ch.startSeconds)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Responsive styles via a style tag */}
      <style>{`
        @media (max-width: 768px) {
          .listen-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
