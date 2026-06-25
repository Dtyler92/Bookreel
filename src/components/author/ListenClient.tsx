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
const card   = '#FFFFFF'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── SVG Icon Components (all local, no emoji, no external imports) ───────────

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

function PlayIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function PauseIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function Rewind15Icon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      {/* Circular arrow going counter-clockwise */}
      <path
        d="M18 6 A12 12 0 1 0 30 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead pointing left/back */}
      <polyline
        points="14,2 18,6 14,10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* '15' label centred */}
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fontFamily="var(--font-inter), system-ui, sans-serif"
        fontWeight="700"
        fontSize="10"
        fill="currentColor"
      >
        15
      </text>
    </svg>
  )
}

function Forward30Icon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      {/* Circular arrow going clockwise */}
      <path
        d="M18 6 A12 12 0 1 1 6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead pointing right/forward */}
      <polyline
        points="22,2 18,6 22,10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* '30' label centred */}
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fontFamily="var(--font-inter), system-ui, sans-serif"
        fontWeight="700"
        fontSize="10"
        fill="currentColor"
      >
        30
      </text>
    </svg>
  )
}

function DownloadArrowIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v13" />
      <path d="M7 11l5 5 5-5" />
      <path d="M3 19h18" />
    </svg>
  )
}

function BookCoverIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Book back cover */}
      <rect x="10" y="8" width="42" height="48" rx="4" fill="#DDD8CE" />
      {/* Spine */}
      <rect x="10" y="8" width="8" height="48" rx="2" fill="#C8B89A" />
      {/* Page lines */}
      <line x1="24" y1="22" x2="46" y2="22" stroke="#B8B0A4" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="30" x2="46" y2="30" stroke="#B8B0A4" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="38" x2="38" y2="38" stroke="#B8B0A4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function HeadphonesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Headband arc */}
      <path d="M3 14V12a9 9 0 0 1 18 0v2" />
      {/* Left ear cup */}
      <rect x="2" y="14" width="4" height="6" rx="2" />
      {/* Right ear cup */}
      <rect x="18" y="14" width="4" height="6" rx="2" />
    </svg>
  )
}

function ChapterPlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ListenClient({
  bookId, title, genre, coverUrl, audioUrl, durationSeconds, chapters,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)

  const [playing, setPlaying]              = useState(false)
  const [currentTime, setCurrentTime]      = useState(0)
  const [duration, setDuration]            = useState(durationSeconds ?? 0)
  const [speed, setSpeed]                  = useState(1)
  const [currentChapterIdx, setChapterIdx] = useState(0)
  const [dragging, setDragging]            = useState(false)
  const [scrubTime, setScrubTime]          = useState<number | null>(null)
  const [thumbHover, setThumbHover]        = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // ── Audio event handlers ──────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (!dragging) setCurrentTime(audio.currentTime)
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

  // ── Playback speed ────────────────────────────────────────────────────────

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  // ── Controls ──────────────────────────────────────────────────────────────

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

  // ── Progress bar scrubbing ────────────────────────────────────────────────

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
    if (t !== null) {
      setDragging(true)
      setScrubTime(t)
    }
  }
  const onBarTouchMove = (e: React.TouchEvent) => {
    const t = calcTimeFromEvent(e.touches[0].clientX)
    if (t !== null) setScrubTime(t)
  }
  const onBarTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const t = calcTimeFromEvent(touch.clientX)
    if (t !== null) seekTo(t)
    setDragging(false)
    setScrubTime(null)
  }

  const displayTime = dragging && scrubTime !== null ? scrubTime : currentTime
  const progress    = duration > 0 ? (displayTime / duration) * 100 : 0

  const currentChapter = chapters.length > 0 ? chapters[currentChapterIdx] : null

  const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

  return (
    <div style={{ background: cream, minHeight: '100vh', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* ── Sticky Top Bar ──────────────────────────────────────────────────── */}
      <div style={{
        background: card,
        borderBottom: `1px solid ${border}`,
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: '0 1px 0 rgba(13,13,11,0.04)',
      }}>
        <Link
          href={`/book/${bookId}`}
          aria-label="Back to book page"
          style={{
            color: muted,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
          className="back-btn"
        >
          <BackArrowIcon />
        </Link>

        <div style={{
          fontFamily: 'var(--font-playfair), serif',
          fontWeight: 700,
          fontSize: '17px',
          color: dark,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {title}
        </div>

        {genre && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: muted,
            background: '#EDECE7',
            borderRadius: '20px',
            padding: '4px 12px',
            flexShrink: 0,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            {genre}
          </span>
        )}
      </div>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div
        className="listen-layout"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '40px 24px 64px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: '40px',
          alignItems: 'start',
        }}
      >

        {/* ── Left Column: Player ─────────────────────────────────────────── */}
        <div>

          {/* Cover art + meta row */}
          <div
            className="cover-meta-row"
            style={{
            display: 'flex',
            gap: '28px',
            alignItems: 'flex-start',
            marginBottom: '44px',
            flexWrap: 'wrap',
          }}>

            {/* Cover art */}
            <div
              className="cover-art"
              style={{
              flexShrink: 0,
              width: '148px',
              height: '212px',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#E8E3D8',
              boxShadow: '0 12px 32px rgba(13,13,11,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <BookCoverIcon size={72} />
              )}
            </div>

            {/* Meta */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: red,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                marginBottom: '10px',
              }}>
                Now Playing
              </div>

              <h1 style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: '26px',
                fontWeight: 700,
                color: dark,
                margin: '0 0 10px',
                lineHeight: 1.25,
              }}>
                {title}
              </h1>

              {genre && (
                <div style={{ fontSize: '13px', color: muted, marginBottom: '18px' }}>
                  {genre}
                </div>
              )}

              {duration > 0 && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '13px',
                  color: muted,
                  background: '#F0EDE7',
                  borderRadius: '8px',
                  padding: '6px 12px',
                }}>
                  <HeadphonesIcon size={15} />
                  <span>{formatTime(duration)} total runtime</span>
                </div>
              )}
            </div>
          </div>

          {/* Player card */}
          <div
            className="player-card"
            style={{
            background: card,
            border: `1.5px solid ${border}`,
            borderRadius: '18px',
            padding: '32px 28px 28px',
            boxShadow: '0 2px 12px rgba(13,13,11,0.05)',
          }}>

            {/* Current chapter indicator */}
            {currentChapter && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
                padding: '10px 14px',
                background: cream,
                borderRadius: '8px',
                border: `1px solid ${border}`,
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: red,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ChapterPlayIcon />
                </div>
                <span style={{
                  fontSize: '13px',
                  color: dark,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {currentChapter.title}
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div style={{ marginBottom: '10px', paddingTop: '8px' }}>
              <div
                ref={progressBarRef}
                onMouseDown={onBarMouseDown}
                onTouchStart={onBarTouchStart}
                onTouchMove={onBarTouchMove}
                onTouchEnd={onBarTouchEnd}
                style={{
                  height: '8px',
                  background: '#E2DDD4',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  position: 'relative',
                  userSelect: 'none',
                  touchAction: 'none',
                }}
                className="progress-track"
              >
                {/* Filled portion */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${red} 0%, #D4563F 100%)`,
                  borderRadius: '999px',
                  transition: dragging ? 'none' : 'width 0.25s linear',
                  pointerEvents: 'none',
                }} />

                {/* Draggable thumb */}
                <div
                  onMouseEnter={() => setThumbHover(true)}
                  onMouseLeave={() => setThumbHover(false)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${progress}%`,
                    transform: 'translate(-50%, -50%)',
                    width: thumbHover || dragging ? '18px' : '14px',
                    height: thumbHover || dragging ? '18px' : '14px',
                    borderRadius: '50%',
                    background: card,
                    border: `2.5px solid ${red}`,
                    boxShadow: dragging
                      ? `0 0 0 4px rgba(200,64,47,0.18), 0 2px 8px rgba(200,64,47,0.35)`
                      : `0 1px 4px rgba(200,64,47,0.3)`,
                    cursor: dragging ? 'grabbing' : 'grab',
                    transition: thumbHover || dragging ? 'none' : 'width 0.15s, height 0.15s, box-shadow 0.15s',
                    zIndex: 2,
                  }}
                />
              </div>
            </div>

            {/* Time display */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: muted,
              marginBottom: '32px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <span>{formatTime(displayTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>

            {/* Transport controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '32px',
            }}>

              {/* Rewind 15s */}
              <button
                onClick={() => seekTo(currentTime - 15)}
                aria-label="Rewind 15 seconds"
                className="transport-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: muted,
                  padding: '10px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '44px',
                  minHeight: '44px',
                  transition: 'color 0.15s, background 0.15s',
                }}
              >
                <Rewind15Icon size={34} />
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className="play-btn"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: red,
                  color: card,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 22px rgba(200,64,47,0.38)',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  flexShrink: 0,
                }}
              >
                {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
              </button>

              {/* Forward 30s */}
              <button
                onClick={() => seekTo(currentTime + 30)}
                aria-label="Forward 30 seconds"
                className="transport-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: muted,
                  padding: '10px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '44px',
                  minHeight: '44px',
                  transition: 'color 0.15s, background 0.15s',
                }}
              >
                <Forward30Icon size={34} />
              </button>
            </div>

            {/* Speed selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: muted,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginRight: '2px',
              }}>
                Speed
              </span>
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  aria-label={`Set speed to ${s}x`}
                  style={{
                    padding: '6px 13px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: speed === s ? 700 : 500,
                    background: speed === s ? red : 'transparent',
                    color: speed === s ? card : muted,
                    border: `1.5px solid ${speed === s ? red : border}`,
                    transition: 'all 0.15s ease',
                    minHeight: '36px',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* ── Download Section ──────────────────────────────────────────── */}
          <div style={{ marginTop: '32px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: muted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '14px',
            }}>
              Download Audiobook
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href={`/api/books/${bookId}/download?asset=audiobook_mp3`}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '12px 22px',
                  borderRadius: '10px',
                  border: `1.5px solid ${border}`,
                  background: card,
                  color: dark,
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter), sans-serif',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  minHeight: '44px',
                  boxShadow: '0 1px 3px rgba(13,13,11,0.06)',
                }}
                className="download-btn"
              >
                <DownloadArrowIcon size={16} />
                Download MP3
              </a>
              <a
                href={`/api/books/${bookId}/download?asset=audiobook_m4b`}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '12px 22px',
                  borderRadius: '10px',
                  border: `1.5px solid ${border}`,
                  background: card,
                  color: dark,
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter), sans-serif',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  minHeight: '44px',
                  boxShadow: '0 1px 3px rgba(13,13,11,0.06)',
                }}
                className="download-btn"
              >
                <DownloadArrowIcon size={16} />
                Download M4B
              </a>
            </div>
          </div>
        </div>

        {/* ── Right Column: Chapter Sidebar ───────────────────────────────── */}
        {chapters.length > 0 && (
          <div>
            <div style={{
              background: card,
              border: `1.5px solid ${border}`,
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'sticky',
              top: '76px',
              boxShadow: '0 2px 12px rgba(13,13,11,0.05)',
            }}>

              {/* Chapter list header */}
              <div style={{
                padding: '18px 20px 14px',
                borderBottom: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: dark,
                  margin: 0,
                }}>
                  Chapters
                </h3>
                <span style={{
                  fontSize: '12px',
                  color: muted,
                  background: '#F0EDE7',
                  borderRadius: '20px',
                  padding: '2px 9px',
                  fontWeight: 600,
                }}>
                  {chapters.length}
                </span>
              </div>

              {/* Chapter list */}
              <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                {chapters.map((ch, i) => {
                  const active = i === currentChapterIdx
                  return (
                    <button
                      key={ch.index}
                      onClick={() => seekToChapter(ch)}
                      aria-label={`Go to chapter: ${ch.title}`}
                      aria-current={active ? 'true' : undefined}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '13px 20px 13px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${border}`,
                        borderLeft: active ? `3px solid ${red}` : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        transition: 'background 0.15s, border-left-color 0.15s',
                        minHeight: '56px',
                      }}
                      className="chapter-btn"
                    >
                      {/* Chapter number badge */}
                      <div style={{
                        flexShrink: 0,
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: active ? red : '#EDECE7',
                        color: active ? card : muted,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: active ? '9px' : '10px',
                        fontWeight: 700,
                        marginTop: '2px',
                        transition: 'background 0.15s, color 0.15s',
                        flexDirection: 'column',
                      }}>
                        {active ? <ChapterPlayIcon /> : i + 1}
                      </div>

                      {/* Chapter info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '13px',
                          fontWeight: active ? 700 : 500,
                          color: active ? red : dark,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '3px',
                          transition: 'color 0.15s',
                        }}>
                          {ch.title}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: muted,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
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

      {/* ── Responsive & interaction styles ──────────────────────────────────── */}
      <style>{`
        @media (max-width: 767px) {
          .listen-layout {
            grid-template-columns: 1fr !important;
            padding: 16px 12px 48px !important;
            gap: 20px !important;
            max-width: 100% !important;
          }
          .player-card {
            padding: 20px 16px 20px !important;
            border-radius: 14px !important;
          }
          .cover-meta-row {
            gap: 16px !important;
            margin-bottom: 28px !important;
          }
          .cover-art {
            width: 110px !important;
            height: 158px !important;
          }
        }

        .back-btn:hover {
          background: #F0EDE7;
          color: ${dark};
        }

        .transport-btn:hover {
          color: ${dark};
          background: #F0EDE7;
        }

        .play-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 8px 28px rgba(200,64,47,0.46) !important;
        }

        .play-btn:active {
          transform: scale(0.97);
          box-shadow: 0 3px 12px rgba(200,64,47,0.32) !important;
        }

        .download-btn:hover {
          border-color: ${dark} !important;
          box-shadow: 0 2px 8px rgba(13,13,11,0.1) !important;
        }

        .chapter-btn:hover {
          background: ${cream} !important;
        }

        .progress-track:hover .progress-thumb {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  )
}
