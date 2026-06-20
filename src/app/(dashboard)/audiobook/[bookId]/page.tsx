'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Segment {
  index: number
  speaker: string
  text: string
}

interface VoiceOption {
  key: string
  name: string
  label: string
  description: string
}

const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const border = '#E8E2D5'
const cream  = '#FAFAF7'

// Mirror of server voice roster
const VOICE_ROSTER: VoiceOption[] = [
  { key: 'narrator',     name: 'Daniel',    label: 'Narrator (Daniel)',      description: 'Deep, cinematic' },
  { key: 'deep_male',    name: 'George',    label: 'Deep Male (George)',     description: 'Mature, resonant' },
  { key: 'male',         name: 'Liam',      label: 'Male (Liam)',            description: 'Younger, clear' },
  { key: 'old_male',     name: 'Bill',      label: 'Older Male (Bill)',      description: 'Aged, weathered' },
  { key: 'female',       name: 'Charlotte', label: 'Female (Charlotte)',     description: 'Clear, expressive' },
  { key: 'young_female', name: 'Alice',     label: 'Young Female (Alice)',   description: 'Bright, younger' },
  { key: 'default',      name: 'Charlie',   label: 'Neutral (Charlie)',      description: 'Versatile' },
]

export default function AudiobookPage({ params }: { params: { bookId: string } }) {
  const { bookId } = params
  const router = useRouter()

  const [step, setStep]               = useState<'loading' | 'assign' | 'confirm' | 'generating' | 'done' | 'error'>('loading')
  const [segments, setSegments]       = useState<Segment[]>([])
  const [speakers, setSpeakers]       = useState<string[]>([])
  const [voiceMap, setVoiceMap]       = useState<Record<string, string>>({})
  const [wordCount, setWordCount]     = useState(0)
  const [estimatedMins, setEstMins]   = useState(0)
  const [previewSpeaker, setPreview]  = useState<string | null>(null)
  const [generating, setGenerating]   = useState(false)
  const [errorMsg, setError]          = useState<string | null>(null)
  const [audiobookId, setAudiobookId] = useState<string | null>(null)
  const [bookTitle, setBookTitle]     = useState('')

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

  if (step === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-inter), sans-serif', color: muted }}>
      <div>
        <div style={{ fontSize: '32px', marginBottom: '16px', textAlign: 'center' }}>📖</div>
        <div>Parsing your manuscript…</div>
        <div style={{ fontSize: '13px', marginTop: '8px', color: '#B0A89E' }}>Claude is reading every line and identifying who speaks what.</div>
      </div>
    </div>
  )

  if (step === 'error') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-inter), sans-serif', color: red, padding: '32px', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>Something went wrong</div>
        <div style={{ color: muted, fontSize: '14px', maxWidth: '400px' }}>{errorMsg}</div>
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: '24px', padding: '10px 20px', background: dark, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  if (step === 'generating') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-inter), sans-serif', color: dark, padding: '32px', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎙️</div>
        <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '28px', margin: '0 0 12px' }}>Your audiobook is being created</h2>
        <p style={{ color: muted, maxWidth: '420px', lineHeight: 1.6, margin: '0 auto 24px' }}>
          Each line is being voiced by its assigned character. This takes 10–30 minutes depending on book length.
          We'll email you when it's ready.
        </p>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '12px 28px', background: dark, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600 }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  )

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
          Generate Audiobook — 900 credits
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px' }}>

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
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                NARRATOR
              </div>
              <div style={{
                background: '#F7F4EF', borderRadius: '8px', padding: '10px 14px',
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: dark, fontWeight: 600,
              }}>
                🎙 Daniel — Deep, cinematic
              </div>
            </div>

            {/* Character voice pickers */}
            {speakers.map(speaker => (
              <div key={speaker} style={{ marginBottom: '16px' }}>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
                  color: speakerColors[speaker] || muted,
                }}>
                  {speaker}
                </div>
                <select
                  value={voiceMap[speaker] || 'default'}
                  onChange={e => setVoiceMap(prev => ({ ...prev, [speaker]: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: `1.5px solid ${border}`, background: '#fff',
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: dark,
                    cursor: 'pointer',
                  }}
                >
                  {VOICE_ROSTER.filter(v => v.key !== 'narrator').map(v => (
                    <option key={v.key} value={v.key}>
                      {v.label} — {v.description}
                    </option>
                  ))}
                </select>
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
              This will use <strong>900 credits</strong> and render a full-cast audiobook
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
                {generating ? 'Starting…' : 'Confirm — 900 credits'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
