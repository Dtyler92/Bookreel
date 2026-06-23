'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VOICE_ROSTER, VoiceOption } from '@/lib/voiceRoster'

interface Segment {
  index: number
  speaker: string
  text: string
}

const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const border = '#E8E2D5'
const cream  = '#FAFAF7'

// Group voices by gender
const maleVoices    = VOICE_ROSTER.filter(v => v.gender === 'male')
const femaleVoices  = VOICE_ROSTER.filter(v => v.gender === 'female')
const neutralVoices = VOICE_ROSTER.filter(v => v.gender === 'neutral')

function GenderBadge({ gender }: { gender: VoiceOption['gender'] }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    male:    { label: 'M', bg: '#E8F0FE', color: '#1565C0' },
    female:  { label: 'F', bg: '#FCE4EC', color: '#880E4F' },
    neutral: { label: 'N', bg: '#F3E5F5', color: '#4A148C' },
  }
  const cfg = map[gender]
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 6px',
      borderRadius: '4px', background: cfg.bg, color: cfg.color,
      fontFamily: 'var(--font-inter), sans-serif',
    }}>
      {cfg.label}
    </span>
  )
}

interface VoiceCardProps {
  voice: VoiceOption
  selected: boolean
  onSelect: () => void
  playing: boolean
  onPlay: () => void
  onStop: () => void
}

function VoiceCard({ voice, selected, onSelect, playing, onPlay, onStop }: VoiceCardProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
        border: `1.5px solid ${selected ? red : border}`,
        background: selected ? 'rgba(200,64,47,0.04)' : '#fff',
        transition: 'border-color 0.15s, background 0.15s',
        marginBottom: '6px',
      }}
    >
      {/* Play/Stop button */}
      <button
        onClick={e => {
          e.stopPropagation()
          playing ? onStop() : onPlay()
        }}
        style={{
          flexShrink: 0, width: '30px', height: '30px',
          borderRadius: '50%', border: `1.5px solid ${playing ? red : border}`,
          background: playing ? red : '#fff',
          color: playing ? '#fff' : muted,
          cursor: 'pointer', fontSize: '11px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        title={playing ? 'Stop preview' : 'Play preview'}
      >
        {playing ? '■' : '▶'}
      </button>

      {/* Voice info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
            fontWeight: 600, color: dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {voice.label}
          </span>
          <GenderBadge gender={voice.gender} />
        </div>
        <div style={{
          fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px',
          color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {voice.style}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div style={{
          flexShrink: 0, width: '16px', height: '16px',
          borderRadius: '50%', background: red,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>✓</span>
        </div>
      )}
    </div>
  )
}

interface VoicePickerProps {
  value: string
  onChange: (key: string) => void
  excludeKey?: string  // exclude narrator from character picker
}

function VoicePicker({ value, onChange, excludeKey }: VoicePickerProps) {
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlay = (voice: VoiceOption) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playingKey === voice.key) {
      setPlayingKey(null)
      return
    }
    const audio = new Audio(voice.previewUrl)
    audio.onended = () => setPlayingKey(null)
    audio.onerror = () => setPlayingKey(null)
    audioRef.current = audio
    audio.play().catch(() => setPlayingKey(null))
    setPlayingKey(voice.key)
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingKey(null)
  }

  // Cleanup on unmount
  useEffect(() => () => { audioRef.current?.pause() }, [])

  const filtered = (voices: VoiceOption[]) =>
    excludeKey ? voices.filter(v => v.key !== excludeKey) : voices

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{
      fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', fontWeight: 700,
      color: muted, textTransform: 'uppercase', letterSpacing: '0.07em',
      margin: '12px 0 6px',
    }}>
      {label}
    </div>
  )

  return (
    <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
      {filtered(maleVoices).length > 0 && (
        <>
          <SectionLabel label="Male" />
          {filtered(maleVoices).map(v => (
            <VoiceCard
              key={v.key}
              voice={v}
              selected={value === v.key}
              onSelect={() => onChange(v.key)}
              playing={playingKey === v.key}
              onPlay={() => handlePlay(v)}
              onStop={handleStop}
            />
          ))}
        </>
      )}
      {filtered(femaleVoices).length > 0 && (
        <>
          <SectionLabel label="Female" />
          {filtered(femaleVoices).map(v => (
            <VoiceCard
              key={v.key}
              voice={v}
              selected={value === v.key}
              onSelect={() => onChange(v.key)}
              playing={playingKey === v.key}
              onPlay={() => handlePlay(v)}
              onStop={handleStop}
            />
          ))}
        </>
      )}
      {filtered(neutralVoices).length > 0 && (
        <>
          <SectionLabel label="Neutral" />
          {filtered(neutralVoices).map(v => (
            <VoiceCard
              key={v.key}
              voice={v}
              selected={value === v.key}
              onSelect={() => onChange(v.key)}
              playing={playingKey === v.key}
              onPlay={() => handlePlay(v)}
              onStop={handleStop}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default function AudiobookPage({ params }: { params: { bookId: string } }) {
  const { bookId } = params
  const router = useRouter()

  const [step, setStep]               = useState<'loading' | 'assign' | 'confirm' | 'generating' | 'done' | 'error'>('loading')
  const [segments, setSegments]       = useState<Segment[]>([])
  const [speakers, setSpeakers]       = useState<string[]>([])
  const [voiceMap, setVoiceMap]       = useState<Record<string, string>>({})
  const [wordCount, setWordCount]     = useState(0)
  const [estimatedMins, setEstMins]   = useState(0)
  const [generating, setGenerating]   = useState(false)
  const [errorMsg, setError]          = useState<string | null>(null)
  const [audiobookId, setAudiobookId] = useState<string | null>(null)
  const [bookTitle, setBookTitle]     = useState('')
  const [pollProgress, setPollProgress] = useState(0)
  const [doneData, setDoneData]       = useState<{ durationSeconds?: number; chapterCount?: number } | null>(null)

  // Active character for inline voice picker (speaker name)
  const [activePicker, setActivePicker] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/audiobook/${bookId}/parse`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setStep('error'); return }
        setSegments(data.segments)
        setSpeakers(data.speakers)
        setVoiceMap(data.voiceMap)
        setWordCount(data.wordCount)
        setEstMins(data.estimatedMinutes)
        setStep('assign')
      })
      .catch(e => { setError(String(e)); setStep('error') })

    // Fetch book title
    fetch(`/api/books/${bookId}/status`)
      .then(r => r.json())
      .then(d => setBookTitle(d?.title || ''))
      .catch(() => {})
  }, [bookId])

  // Polling for 'generating' step
  useEffect(() => {
    if (step !== 'generating') return
    let stopped = false

    const poll = async () => {
      try {
        const res  = await fetch(`/api/audiobook/${bookId}/status`)
        const data = await res.json()
        if (stopped) return

        if (typeof data.progress === 'number') setPollProgress(data.progress)

        if (data.status === 'complete') {
          const chapters = data.chaptersJson
          setDoneData({
            durationSeconds: data.durationSeconds ?? undefined,
            chapterCount: Array.isArray(chapters) ? chapters.length : undefined,
          })
          setStep('done')
        } else if (data.status === 'failed') {
          setError(data.errorMessage || 'Audiobook generation failed.')
          setStep('error')
        }
      } catch {}
    }

    poll() // immediate first check
    const id = setInterval(poll, 10_000)
    return () => { stopped = true; clearInterval(id) }
  }, [step, bookId])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/audiobook/${bookId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments, voiceMap, narratorVoice: 'Daniel', wordCount }),
      })
      const data = await res.json()
      if (!res.ok || !data.audiobookId) throw new Error(data.error || 'Failed to start audiobook')
      setAudiobookId(data.audiobookId)
      setStep('generating')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setGenerating(false)
    }
  }

  // Speaker color palette for visual distinction
  const speakerColors: Record<string, string> = {}
  const palette = ['#2D6A4F', '#1565C0', '#6A1E55', '#7B3F00', '#1A237E', '#4A148C']
  speakers.forEach((s, i) => { speakerColors[s] = palette[i % palette.length] })
  speakerColors['NARRATOR'] = '#5C5751'

  function formatDuration(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  // ── Step: Loading ───────────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-inter), sans-serif', color: muted }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>📖</div>
        <div>Parsing your manuscript…</div>
        <div style={{ fontSize: '13px', marginTop: '8px', color: '#B0A89E' }}>Claude is reading every line and identifying who speaks what.</div>
      </div>
    </div>
  )

  // ── Step: Error ─────────────────────────────────────────────────────────────
  if (step === 'error') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-inter), sans-serif', color: red, padding: '32px', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>Something went wrong</div>
        <div style={{ color: muted, fontSize: '14px', maxWidth: '400px' }}>{errorMsg}</div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          <button
            onClick={() => { setError(null); setStep('loading') }}
            style={{ padding: '10px 20px', background: red, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600 }}
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ padding: '10px 20px', background: dark, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step: Generating ────────────────────────────────────────────────────────
  if (step === 'generating') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-inter), sans-serif', color: dark, padding: '32px', textAlign: 'center' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎙️</div>
        <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '28px', margin: '0 0 12px' }}>
          Your audiobook is being created
        </h2>
        <p style={{ color: muted, lineHeight: 1.6, margin: '0 auto 28px' }}>
          Each line is being voiced by its assigned character. This takes 10–30 minutes depending on book length.
          We'll notify you when it's ready.
        </p>

        {/* Progress bar */}
        <div style={{ background: '#EDE9E0', borderRadius: '999px', height: '8px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{
            height: '100%', borderRadius: '999px', background: red,
            width: `${pollProgress}%`, transition: 'width 1s ease',
          }} />
        </div>
        <div style={{ fontSize: '12px', color: muted, marginBottom: '28px' }}>
          {pollProgress > 0 ? `${pollProgress}% complete` : 'Queued — starting soon…'}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ padding: '12px 28px', background: dark, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step: Done ──────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-inter), sans-serif', color: dark, padding: '32px', textAlign: 'center' }}>
      <div style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎧</div>
        <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '30px', margin: '0 0 10px' }}>
          Your audiobook is ready!
        </h2>

        {/* Stats */}
        {doneData && (
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', margin: '16px 0 28px' }}>
            {doneData.durationSeconds !== undefined && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '22px', fontWeight: 700, color: red }}>
                  {formatDuration(doneData.durationSeconds)}
                </div>
                <div style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>Duration</div>
              </div>
            )}
            {doneData.chapterCount !== undefined && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '22px', fontWeight: 700, color: red }}>
                  {doneData.chapterCount}
                </div>
                <div style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>Chapters</div>
              </div>
            )}
          </div>
        )}

        <p style={{ color: muted, lineHeight: 1.6, margin: '0 0 28px' }}>
          {bookTitle ? `"${bookTitle}" is` : 'Your book is'} fully voiced and ready to listen to.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href={`/listen/${bookId}`}
            style={{
              display: 'block', padding: '15px 28px', background: red, color: '#fff',
              border: 'none', borderRadius: '12px', cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif', fontSize: '16px', fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            🎧 Listen Now
          </a>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '13px 28px', background: cream, border: `1.5px solid ${border}`,
              borderRadius: '12px', cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: muted,
            }}
          >
            Back to Book Hub
          </button>
        </div>
      </div>
    </div>
  )

  // ── Steps: Assign / Confirm ─────────────────────────────────────────────────
  return (
    <div style={{ background: '#FDFCF9', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: `1px solid ${border}`,
        padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '22px', color: dark }}>
            Full-Cast Audiobook
          </div>
          {bookTitle && (
            <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: muted, marginTop: '2px' }}>
              {bookTitle} · ~{estimatedMins} min listen · {wordCount.toLocaleString()} words
            </div>
          )}
        </div>
        <button
          onClick={() => setStep('confirm')}
          disabled={generating}
          style={{
            background: red, color: '#fff', border: 'none',
            padding: '12px 28px', borderRadius: '10px',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Generate Audiobook — 1500 credits
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>

        {/* Left — Voice Assignment Panel */}
        <div>
          <div style={{
            background: '#fff', border: `1.5px solid ${border}`,
            borderRadius: '16px', padding: '24px', position: 'sticky', top: '88px',
          }}>
            <h3 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '18px', color: dark, margin: '0 0 6px' }}>
              Assign Voices
            </h3>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: muted, margin: '0 0 20px', lineHeight: 1.5 }}>
              Choose who voices each character. Narrator is always Daniel.
            </p>

            {/* Narrator — locked */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                NARRATOR
              </div>
              <div style={{
                background: '#F7F4EF', borderRadius: '10px', padding: '10px 14px',
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: dark, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span>🎙</span>
                <span>Daniel</span>
                <GenderBadge gender="male" />
                <span style={{ color: muted, fontWeight: 400, fontSize: '12px' }}>Deep & Cinematic</span>
              </div>
            </div>

            {/* Character voice pickers */}
            {speakers.map(speaker => (
              <div key={speaker} style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setActivePicker(activePicker === speaker ? null : speaker)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                    border: `1.5px solid ${activePicker === speaker ? red : border}`,
                    background: activePicker === speaker ? 'rgba(200,64,47,0.03)' : '#fff',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: speakerColors[speaker] || muted, marginBottom: '2px' }}>
                      {speaker}
                    </div>
                    <div style={{ fontSize: '12px', color: dark }}>
                      {(() => {
                        const v = VOICE_ROSTER.find(v => v.key === (voiceMap[speaker] || 'default'))
                        return v ? `${v.label} — ${v.style}` : '—'
                      })()}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: muted }}>{activePicker === speaker ? '▲' : '▼'}</span>
                </button>

                {activePicker === speaker && (
                  <div style={{
                    marginTop: '8px', border: `1.5px solid ${border}`,
                    borderRadius: '12px', padding: '12px',
                    background: cream,
                  }}>
                    <VoicePicker
                      value={voiceMap[speaker] || 'default'}
                      onChange={key => {
                        setVoiceMap(prev => ({ ...prev, [speaker]: key }))
                        setActivePicker(null)
                      }}
                      excludeKey="narrator"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Legend */}
            <div style={{ marginTop: '24px', padding: '12px', background: cream, borderRadius: '8px' }}>
              <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: muted, marginBottom: '8px', fontWeight: 600 }}>
                COLOUR LEGEND
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: speakerColors['NARRATOR'] }} />
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: muted }}>Narrator</span>
                </div>
                {speakers.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: speakerColors[s] }} />
                    <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: muted }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Dialogue Preview */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '20px', color: dark, margin: '0 0 6px' }}>
              Manuscript Dialogue
            </h3>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: muted, margin: 0 }}>
              {segments.length} segments parsed · colours show who speaks each line
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {segments.map(seg => {
              const isNarrator = seg.speaker === 'NARRATOR'
              const color = speakerColors[seg.speaker] || muted
              return (
                <div
                  key={seg.index}
                  style={{
                    background: '#fff',
                    border: `1px solid ${border}`,
                    borderLeft: `4px solid ${color}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 700,
                    color, textTransform: 'uppercase', letterSpacing: '0.06em',
                    minWidth: '90px', paddingTop: '2px', flexShrink: 0,
                  }}>
                    {isNarrator ? 'Narrator' : seg.speaker}
                  </div>
                  <div style={{
                    fontFamily: isNarrator ? 'var(--font-inter), sans-serif' : 'var(--font-playfair), serif',
                    fontSize: '14px', color: isNarrator ? '#5C5751' : dark,
                    lineHeight: 1.6,
                    fontStyle: isNarrator ? 'italic' : 'normal',
                  }}>
                    {isNarrator ? seg.text : `"${seg.text}"`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {step === 'confirm' && (
        <div
          onClick={() => setStep('assign')}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(13,13,11,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '20px', padding: '36px',
              maxWidth: '440px', width: '100%',
              boxShadow: '0 24px 64px rgba(13,13,11,0.28)',
            }}
          >
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '16px' }}>🎙️</div>
            <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '24px', color: dark, margin: '0 0 12px', textAlign: 'center' }}>
              Generate Audiobook?
            </h2>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: muted, lineHeight: 1.6, textAlign: 'center', margin: '0 0 24px' }}>
              This will use <strong>1500 credits</strong> and render a full-cast audiobook
              with {speakers.length + 1} voice{speakers.length !== 0 ? 's' : ''} across {segments.length} segments.
              Estimated listen time: ~{estimatedMins} minutes.
            </p>

            {errorMsg && (
              <div style={{
                background: 'rgba(200,64,47,0.06)', border: '1px solid rgba(200,64,47,0.25)',
                borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: red,
              }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep('assign')}
                style={{
                  flex: 1, padding: '13px', background: cream, border: `1.5px solid ${border}`,
                  borderRadius: '10px', cursor: 'pointer',
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: muted,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  flex: 2, padding: '13px', background: red, border: 'none',
                  borderRadius: '10px', cursor: generating ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', fontWeight: 700, color: '#fff',
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? 'Starting…' : 'Confirm — 1500 credits'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
