'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { VOICE_ROSTER, VoiceOption } from '@/lib/voiceRoster'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Segment {
  index: number
  speaker: string
  text: string
}

type WizardStep = 'loading' | 'language' | 'tier' | 'assign' | 'confirm' | 'generating' | 'done' | 'error'

// ─── Design tokens ──────────────────────────────────────────────────────────────

const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const border = '#E8E2D5'
const cream  = '#FAFAF7'
const card   = '#FFFFFF'

// ─── Speaker colour palette ─────────────────────────────────────────────────────

const SPEAKER_PALETTE = [
  '#1565C0', '#2D6A4F', '#6A1E55', '#7B3F00',
  '#1A237E', '#4A148C', '#B45309', '#0F766E',
]
const NARRATOR_COLOR = '#5C5751'

// ─── Voice roster slices ────────────────────────────────────────────────────────

const maleVoices    = VOICE_ROSTER.filter(v => v.gender === 'male')
const femaleVoices  = VOICE_ROSTER.filter(v => v.gender === 'female')
const neutralVoices = VOICE_ROSTER.filter(v => v.gender === 'neutral')

// ─── Global CSS keyframes (injected once) ────────────────────────────────────────

const KEYFRAMES = `
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}
@keyframes playPulse {
  0%, 100% { box-shadow: 0 0 0 0px rgba(200,64,47,0.45); }
  60%       { box-shadow: 0 0 0 7px rgba(200,64,47,0); }
}
`

// ─── ShimmerBar ─────────────────────────────────────────────────────────────────

function ShimmerBar({ height = 4 }: { height?: number }) {
  return (
    <div style={{
      width: '100%', height,
      background: '#EDE9E0', borderRadius: 2,
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, width: '55%',
        background: 'linear-gradient(90deg, transparent 0%, #C8402F 40%, #E8735F 65%, transparent 100%)',
        animation: 'shimmer 1.7s ease-in-out infinite',
      }} />
    </div>
  )
}

// ─── Step indicator ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { id: 1, label: 'Parse' },
  { id: 2, label: 'Cast Voices' },
  { id: 3, label: 'Generate' },
]

function getStepStatus(wizardId: number, current: WizardStep): 'done' | 'active' | 'upcoming' {
  const map: Record<WizardStep, number> = {
    loading: 1, language: 1, tier: 1, assign: 2, confirm: 3, generating: 3, done: 4, error: 0,
  }
  const active = map[current]
  if (wizardId < active) return 'done'
  if (wizardId === active) return 'active'
  return 'upcoming'
}

function StepIndicator({ current }: { current: WizardStep }) {
  if (current === 'error') return null
  return (
    <div style={{
      position: 'sticky', top: 64, zIndex: 20,
      background: card, borderBottom: `1px solid ${border}`,
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        display: 'flex', alignItems: 'center', height: 58,
      }}>
        {WIZARD_STEPS.flatMap((step, i) => {
          const status = getStepStatus(step.id, current)
          const prevDone = i > 0 && getStepStatus(WIZARD_STEPS[i - 1].id, current) === 'done'
          const items = []

          if (i > 0) {
            items.push(
              <div
                key={`line-${i}`}
                style={{
                  flex: 1, height: 1.5,
                  background: prevDone ? '#16A34A' : '#E8E2D5',
                  margin: '0 10px',
                  transition: 'background 300ms ease',
                }}
              />
            )
          }

          items.push(
            <div
              key={`step-${step.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            >
              {/* Pill */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 12, fontWeight: 700,
                transition: 'all 250ms ease',
                background:
                  status === 'done'   ? '#16A34A' :
                  status === 'active' ? red : '#EDE9E0',
                color: status === 'upcoming' ? muted : '#fff',
                boxShadow: status === 'active' ? `0 0 0 3px rgba(200,64,47,0.18)` : 'none',
              }}>
                {status === 'done' ? '✓' : step.id}
              </div>
              {/* Label */}
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13,
                fontWeight: status === 'active' ? 700 : 500,
                color:
                  status === 'done'   ? '#16A34A' :
                  status === 'active' ? dark : muted,
                transition: 'color 250ms ease',
              }}>
                {step.label}
              </span>
            </div>
          )

          return items
        })}
      </div>
    </div>
  )
}

// ─── GenderBadge ────────────────────────────────────────────────────────────────

function GenderBadge({ gender }: { gender: VoiceOption['gender'] }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    male:    { label: 'M', bg: '#E8F0FE', color: '#1565C0' },
    female:  { label: 'F', bg: '#FCE4EC', color: '#880E4F' },
    neutral: { label: 'N', bg: '#F3E5F5', color: '#6A1E8C' },
  }
  const c = cfg[gender]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      padding: '2px 5px', borderRadius: 4,
      background: c.bg, color: c.color,
      fontFamily: 'var(--font-inter), sans-serif',
    }}>
      {c.label}
    </span>
  )
}

// ─── VoiceCardH (horizontal compact card) ──────────────────────────────────────

interface VoiceCardHProps {
  voice: VoiceOption
  selected: boolean
  onSelect: () => void
  playing: boolean
  onPlay: () => void
  onStop: () => void
  usedBy?: string | null   // name of character already using this voice
}

function VoiceCardH({ voice, selected, onSelect, playing, onPlay, onStop, usedBy }: VoiceCardHProps) {
  const [hov, setHov] = useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0, width: 138,
        padding: '12px 12px 10px',
        borderRadius: 10, cursor: 'pointer',
        border: `1.5px solid ${selected ? red : hov ? 'rgba(200,64,47,0.4)' : border}`,
        background: selected ? 'rgba(200,64,47,0.04)' : hov ? '#FDFCFB' : card,
        transition: 'all 150ms ease',
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}
    >
      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 17, height: 17, borderRadius: '50%',
          background: red, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>
        </div>
      )}

      {/* Play / Stop button */}
      <button
        onClick={e => { e.stopPropagation(); playing ? onStop() : onPlay() }}
        style={{
          alignSelf: 'flex-start', flexShrink: 0,
          width: 30, height: 30, borderRadius: '50%',
          border: `1.5px solid ${playing ? red : border}`,
          background: playing ? red : '#F7F4EF',
          color: playing ? '#fff' : muted,
          cursor: 'pointer', fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms ease',
          animation: playing ? 'playPulse 1.2s ease-in-out infinite' : 'none',
        }}
        title={playing ? 'Stop preview' : 'Play preview'}
      >
        {playing ? '■' : '▶'}
      </button>

      {/* Name + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 12, fontWeight: 700, color: dark,
        }}>
          {voice.label}
        </span>
        <GenderBadge gender={voice.gender} />
      </div>

      {/* Style tagline */}
      <div style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 11, color: muted, lineHeight: 1.3,
      }}>
        {voice.style}
      </div>

      {/* "Used by" indicator */}
      {usedBy && !selected && (
        <div style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 10, fontWeight: 600,
          color: '#B45309',
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: 6,
          padding: '2px 6px',
          lineHeight: 1.4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          ← {usedBy}
        </div>
      )}
    </div>
  )
}

// ─── VoicePickerH (horizontal rows by gender) ──────────────────────────────────

interface VoicePickerHProps {
  value: string
  onChange: (key: string) => void
  excludeKey?: string
  playingKey: string | null
  onPlay: (voice: VoiceOption) => void
  onStop: () => void
  voiceUsageMap?: Record<string, string>  // voiceKey → character name using it
}

function VoicePickerH({ value, onChange, excludeKey, playingKey, onPlay, onStop, voiceUsageMap = {} }: VoicePickerHProps) {
  const filtered = (voices: VoiceOption[]) =>
    excludeKey ? voices.filter(v => v.key !== excludeKey) : voices

  const GenderRow = ({ label, voices }: { label: string; voices: VoiceOption[] }) => {
    const fv = filtered(voices)
    if (!fv.length) return null
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 10, fontWeight: 700, color: muted,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          marginBottom: 8,
        }}>
          {label}
        </div>
        <div style={{
          display: 'flex', gap: 8,
          overflowX: 'auto', paddingBottom: 4,
          /* thin scrollbar */
          scrollbarWidth: 'thin',
          scrollbarColor: `${border} transparent`,
        }}>
          {fv.map(v => (
            <VoiceCardH
              key={v.key}
              voice={v}
              selected={value === v.key}
              onSelect={() => onChange(v.key)}
              playing={playingKey === v.key}
              onPlay={() => onPlay(v)}
              onStop={onStop}
              usedBy={voiceUsageMap[v.key] || null}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 14 }}>
      <GenderRow label="Male voices"    voices={maleVoices} />
      <GenderRow label="Female voices"  voices={femaleVoices} />
      <GenderRow label="Neutral voices" voices={neutralVoices} />
    </div>
  )
}

// ─── CharacterCard ──────────────────────────────────────────────────────────────

interface CharacterCardProps {
  speaker: string
  speakerColor: string
  voiceKey: string
  isOpen: boolean
  onToggle: () => void
  onVoiceChange: (key: string) => void
  playingKey: string | null
  onPlay: (voice: VoiceOption) => void
  onStop: () => void
  isNarrator?: boolean
  lineCount?: number
  voiceUsageMap?: Record<string, string>
}

function CharacterCard({
  speaker, speakerColor, voiceKey, isOpen, onToggle, onVoiceChange,
  playingKey, onPlay, onStop, isNarrator, lineCount, voiceUsageMap = {},
}: CharacterCardProps) {
  const voice = VOICE_ROSTER.find(v => v.key === voiceKey)

  return (
    <div style={{
      background: card,
      border: `1px solid ${isOpen ? red : border}`,
      borderRadius: 10, overflow: 'hidden',
      transition: 'border-color 150ms ease, box-shadow 150ms ease',
      boxShadow: isOpen ? '0 2px 12px rgba(200,64,47,0.08)' : 'none',
    }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          cursor: 'pointer',
          background: isOpen ? 'rgba(200,64,47,0.018)' : 'transparent',
          userSelect: 'none',
        }}
      >
        {/* Speaker colour dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: speakerColor, flexShrink: 0,
          boxShadow: `0 0 0 2px ${speakerColor}28`,
        }} />

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 13, fontWeight: 700, color: dark,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {speaker === 'NARRATOR' ? 'Narrator' : speaker}
            </span>
            {isNarrator && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px',
                borderRadius: 100, background: '#F4F1EB',
                color: muted, letterSpacing: '0.04em',
                fontFamily: 'var(--font-inter), sans-serif',
                textTransform: 'uppercase', flexShrink: 0,
              }}>
                Narrator
              </span>
            )}
            {lineCount !== undefined && (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 5px',
                borderRadius: 100, background: '#F0F9FF',
                color: '#0369A1', letterSpacing: '0.03em',
                fontFamily: 'var(--font-inter), sans-serif', flexShrink: 0,
              }}>
                {lineCount}
              </span>
            )}
            {/* Shared voice warning */}
            {!isNarrator && voiceKey && voiceKey !== 'default' &&
              Object.entries(voiceUsageMap).some(([k, v]) => k === voiceKey && v !== speaker) && (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 5px',
                borderRadius: 100, background: '#FEF3C7',
                color: '#B45309', letterSpacing: '0.03em',
                fontFamily: 'var(--font-inter), sans-serif', flexShrink: 0,
              }}>
                ⚠ shared
              </span>
            )}
          </div>
          {/* Selected voice shown below name when collapsed */}
          {voice && !isOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 11, color: isNarrator ? muted : red, fontWeight: 500,
              }}>
                {voice.label}
              </span>
              <GenderBadge gender={voice.gender} />
            </div>
          )}
          {!voice && !isOpen && (
            <div style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 11, color: muted, fontStyle: 'italic', marginTop: 2,
            }}>
              No voice assigned
            </div>
          )}
        </div>

        {/* Chevron */}
        <svg
          width={16} height={16} viewBox="0 0 24 24" fill="none"
          stroke={isOpen ? red : muted}
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms ease, stroke 150ms ease',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded voice picker */}
      {isOpen && (
        <div style={{
          borderTop: `1px solid ${border}`,
          padding: '4px 18px 18px',
          background: '#FDFCFB',
        }}>
          <VoicePickerH
            value={voiceKey}
            onChange={key => { onVoiceChange(key); onToggle() }}
            playingKey={playingKey}
            onPlay={onPlay}
            onStop={onStop}
            voiceUsageMap={voiceUsageMap}
          />
        </div>
      )}
    </div>
  )
}

// ─── Stat chip ──────────────────────────────────────────────────────────────────

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      background: cream, border: `1px solid ${border}`,
      borderRadius: 10, padding: '13px 10px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-playfair), serif',
        fontSize: 19, fontWeight: 700, color: dark,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 11, color: muted, marginTop: 3,
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Main page component ────────────────────────────────────────────────────────

export default function AudiobookClient({ bookId }: { bookId: string }) {
  const router = useRouter()

  // ── Step & data ──────────────────────────────────────────────────────────────
  const [step, setStep]               = useState<WizardStep>('loading')
  const [segments, setSegments]       = useState<Segment[]>([])
  const [speakers, setSpeakers]       = useState<string[]>([])
  const [voiceMap, setVoiceMap]       = useState<Record<string, string>>({})
  const [wordCount, setWordCount]     = useState(0)
  const [estimatedMins, setEstMins]   = useState(0)
  const [estCredits, setEstCredits]   = useState(0)
  const [bookTitle, setBookTitle]     = useState('')
  const [bookCover, setBookCover]         = useState<string | null>(null)
  const [narratorVoice, setNarratorVoice] = useState<string>('daniel')
  const [characterCount, setCharacterCount] = useState<number>(0)
  const [ttsModel, setTtsModel] = useState<string>('eleven_turbo_v2_5')

  // ── UI toggles ───────────────────────────────────────────────────────────────
  const [activePicker, setActivePicker] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen]   = useState(false)

  // ── Generation ───────────────────────────────────────────────────────────────
  const [generating, setGenerating]     = useState(false)
  const [errorMsg, setError]            = useState<string | null>(null)
  const [pollProgress, setPollProgress] = useState(0)
  const [doneData, setDoneData]         = useState<{
    durationSeconds?: number
    chapterCount?: number
  } | null>(null)

  // ── Global audio preview state ───────────────────────────────────────────────
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Derived: line counts per speaker ─────────────────────────────────────────
  const lineCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const seg of segments) {
      counts[seg.speaker] = (counts[seg.speaker] || 0) + 1
    }
    return counts
  }, [segments])

  // ── Derived: speakers sorted by line count desc ───────────────────────────────
  const sortedSpeakers = useMemo(() =>
    [...speakers].sort((a, b) => (lineCounts[b] || 0) - (lineCounts[a] || 0)),
    [speakers, lineCounts]
  )

  // ── Derived: voiceUsageMap — which voice is used by which character ───────────
  const voiceUsageMap = useMemo(() => {
    const map: Record<string, string> = {}
    // narrator
    map[narratorVoice] = 'Narrator'
    for (const sp of speakers) {
      const key = voiceMap[sp]
      if (key && !map[key]) map[key] = sp
    }
    return map
  }, [narratorVoice, speakers, voiceMap])

  // ── Auto-fill remaining unassigned characters ─────────────────────────────────
  const handleAutoFill = () => {
    const usedKeys = new Set(Object.values(voiceUsageMap))
    const available = VOICE_ROSTER.filter(v => !usedKeys.has(v.key))
    const unassigned = sortedSpeakers.filter(sp => !voiceMap[sp] || voiceMap[sp] === 'default')
    const updates: Record<string, string> = {}
    let idx = 0
    for (const sp of unassigned) {
      if (idx >= available.length) break
      updates[sp] = available[idx].key
      idx++
    }
    if (Object.keys(updates).length > 0) {
      setVoiceMap(prev => ({ ...prev, ...updates }))
    }
  }


  const handlePlayVoice = (voice: VoiceOption) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (playingKey === voice.key) { setPlayingKey(null); return }
    const audio = new Audio(voice.previewUrl)
    audio.onended = () => setPlayingKey(null)
    audio.onerror = () => setPlayingKey(null)
    audioRef.current = audio
    audio.play().catch(() => setPlayingKey(null))
    setPlayingKey(voice.key)
  }

  const handleStopVoice = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPlayingKey(null)
  }

  // cleanup on unmount
  useEffect(() => () => { audioRef.current?.pause() }, [])

  // ── Mount: fetch book metadata + scan character count ────────────────────
  useEffect(() => {
    fetch(`/api/books/${bookId}/status`)
      .then(r => r.json())
      .then(d => { setBookTitle(d?.title || ''); setBookCover(d?.cover_image_url || null) })
      .catch(() => {})

    fetch(`/api/audiobook/${bookId}/scan`)
      .then(r => r.json())
      .then(d => {
        if (d.characterCount) setCharacterCount(d.characterCount)
        // Only go to language selection if we haven't already resumed into a further step
        setStep(prev => prev === 'loading' ? 'language' : prev)
      })
      .catch(() => { setStep(prev => prev === 'loading' ? 'language' : prev) })
  }, [bookId])

  // ── Parse on mount: check existing status → resume or kickoff ────────────
  useEffect(() => {
    if (step !== 'loading') return
    let stopped = false

    async function checkAndResume() {
      // First check if there's already an in-flight or complete audiobook row
      try {
        const statusRes = await fetch(`/api/audiobook/${bookId}/parse-status`)
        const statusData = await statusRes.json()
        if (stopped) return

        // Already being generated or done — skip the whole wizard
        if (statusData.status === 'pending' || statusData.status === 'processing') {
          setStep('generating')
          return
        }
        if (statusData.status === 'complete') {
          setStep('done')
          return
        }
        // Already parsed — go straight to voice assign
        if (statusData.status === 'parsed') {
          setSegments(statusData.segments     ?? [])
          setSpeakers(statusData.speakers     ?? [])
          setVoiceMap(statusData.voiceMap     ?? {})
          setWordCount(statusData.wordCount   ?? 0)
          setEstMins(statusData.estimatedMinutes ?? 0)
          setEstCredits(statusData.estimatedCredits ?? 0)
          setStep('assign')
          return
        }
        // Still parsing — jump straight to parsing screen and poll
        if (statusData.status === 'parsing') {
          setStep('loading') // stay on loading/parsing screen
          pollParseStatus()
          return
        }
        // No row yet or parse_failed — fall through to normal kickoff flow
      } catch { /* no row yet — proceed normally */ }

      // Normal flow: kickoff parse
      await kickoffAndPoll()
    }

    async function pollParseStatus() {
      const poll = async () => {
        if (stopped) return
        try {
          const res  = await fetch(`/api/audiobook/${bookId}/parse-status`)
          const data = await res.json()
          if (stopped) return
          if (data.status === 'parsed') {
            setSegments(data.segments     ?? [])
            setSpeakers(data.speakers     ?? [])
            setVoiceMap(data.voiceMap     ?? {})
            setWordCount(data.wordCount   ?? 0)
            setEstMins(data.estimatedMinutes ?? 0)
            setEstCredits(data.estimatedCredits ?? 0)
            setStep('assign')
          } else if (data.status === 'parse_failed') {
            setError(data.error || 'Parse failed — please try again.')
            setStep('error')
          } else {
            if (!stopped) setTimeout(poll, 5_000)
          }
        } catch {
          if (!stopped) setTimeout(poll, 5_000)
        }
      }
      poll()
    }

    async function kickoffAndPoll() {
      // Step 1: fire the thin kickoff (fast — just inserts a DB row)
      try {
        const kickoffRes  = await fetch(`/api/audiobook/${bookId}/parse`, { method: 'POST' })
        const kickoffData = await kickoffRes.json()
        if (kickoffData.error) {
          setError(kickoffData.error)
          setStep('error')
          return
        }

        // ── Already parsed — skip straight to voice assign ──────────────────
        if (kickoffData.status === 'parsed') {
          setSegments(kickoffData.segments     ?? [])
          setSpeakers(kickoffData.speakers     ?? [])
          setVoiceMap(kickoffData.voiceMap     ?? {})
          setWordCount(kickoffData.wordCount   ?? 0)
          setEstMins(Math.round((kickoffData.wordCount ?? 0) / 150))
          setEstCredits(kickoffData.estimatedCredits ?? 0)
          setStep('assign')
          return
        }
      } catch (e) {
        setError(String(e))
        setStep('error')
        return
      }

      // Step 2: poll parse-status every 5s until parsed or parse_failed
      pollParseStatus()
    }

    checkAndResume()

    return () => { stopped = true }
  }, [bookId])

  // ── Poll generating status ───────────────────────────────────────────────────
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
      } catch { /* swallow */ }
    }

    poll()
    const id = setInterval(poll, 10_000)
    return () => { stopped = true; clearInterval(id) }
  }, [step, bookId])

  // ── Generate handler ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/audiobook/${bookId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments, voiceMap, narratorVoice: VOICE_ROSTER.find(v => v.key === narratorVoice)?.name ?? 'Daniel', wordCount, ttsModel }),
      })
      const data = await res.json()
      if (!res.ok || !data.audiobookId) throw new Error(data.error || 'Failed to start audiobook')
      setStep('generating')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setGenerating(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const speakerColors: Record<string, string> = { NARRATOR: NARRATOR_COLOR }
  speakers.forEach((s, i) => { speakerColors[s] = SPEAKER_PALETTE[i % SPEAKER_PALETTE.length] })

  // Estimate chapter count from narrator lines that look like chapter headings
  const chapterCount = segments.filter(s =>
    s.speaker === 'NARRATOR' && /^chapter\s+\d+/i.test(s.text.trim())
  ).length || null

  function fmtDuration(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // ── Shared page shell ─────────────────────────────────────────────────────────
  // (just inlines background + paddingTop for each branch below)

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'loading') return (
    <div style={{ background: cream, minHeight: '100vh', paddingTop: 64 }}>
      <style>{KEYFRAMES}</style>
      <StepIndicator current="loading" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 24px' }}>
        <div style={{
          background: card, border: `1px solid ${border}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          {/* Amber accent + shimmer */}
          <div style={{ height: 3, background: '#D97706' }} />
          <ShimmerBar height={2} />

          <div style={{ padding: '56px 40px 60px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 22 }}>📖</div>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 28, fontWeight: 700, color: dark,
              margin: '0 0 10px', letterSpacing: '-0.02em',
            }}>
              Sending manuscript to production studio…
            </h2>
            {bookTitle && (
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 14, color: red, fontWeight: 600,
                margin: '0 0 12px',
              }}>
                {bookTitle}
              </div>
            )}
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 14, color: muted, lineHeight: 1.7,
              maxWidth: 460, margin: '0 auto 36px',
            }}>
              Reading your manuscript chapter by chapter, identifying every speaker, and assembling your full cast. Short stories take 5–10 minutes. Full novels can take 45–90 minutes — we'll save your progress so you won't have to wait again.
            </p>
            <div style={{ maxWidth: 340, margin: '0 auto' }}>
              <ShimmerBar height={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: LANGUAGE — single vs multilingual
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'language') return (
    <div style={{ background: cream, minHeight: '100vh' }}>
      <StepIndicator current={step} />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🌍</div>
          <h1 style={{
            fontFamily: 'var(--font-playfair), serif',
            fontSize: 28, fontWeight: 700, color: dark,
            margin: '0 0 10px', letterSpacing: '-0.01em',
          }}>
            Is this a multilingual book?
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 14, color: muted, margin: 0, lineHeight: 1.6,
          }}>
            This helps us choose the best voice engine for your audiobook.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Single language */}
          <button
            onClick={() => { setTtsModel('eleven_turbo_v2_5'); setStep('tier') }}
            style={{
              background: card, border: `2px solid ${border}`,
              borderRadius: 16, padding: '20px 24px',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = red; e.currentTarget.style.background = 'rgba(200,64,47,0.03)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = card }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 22 }}>⚡</span>
                  <span style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: 18, fontWeight: 700, color: dark,
                  }}>
                    Single Language
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 100, background: '#DCFCE7', color: '#16A34A',
                    fontFamily: 'var(--font-inter), sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    Recommended for highest accuracy
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 13, color: muted, lineHeight: 1.5,
                }}>
                  Entire book is in one language. Uses Flash Turbo — faster generation, lower cost, excellent quality.
                </div>
              </div>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>

          {/* Multilingual */}
          <button
            onClick={() => { setTtsModel('eleven_multilingual_v2'); setStep('tier') }}
            style={{
              background: card, border: `2px solid ${border}`,
              borderRadius: 16, padding: '20px 24px',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.background = 'rgba(139,92,246,0.03)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = card }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 22 }}>🌐</span>
                  <span style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: 18, fontWeight: 700, color: dark,
                  }}>
                    Multilingual
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 100, background: '#EDE9FE', color: '#7C3AED',
                    fontFamily: 'var(--font-inter), sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    Recommended for books with multiple languages
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 13, color: muted, lineHeight: 1.5,
                }}>
                  Book contains multiple languages or non-English text. Uses Multilingual v2 for accurate cross-language pronunciation.
                </div>
              </div>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: TIER — show pricing tier before parsing
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'tier') {
    const tiers = [
      {
        label: 'Short Story',
        range: 'Under 100K characters',
        min: 0, max: 100_000,
        credits: 800,
        time: '5–10 min parse',
        color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7',
      },
      {
        label: 'Novella',
        range: '100K – 500K characters',
        min: 100_001, max: 500_000,
        credits: 1200,
        time: '15–30 min parse',
        color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE',
      },
      {
        label: 'Novel',
        range: '500K – 1M characters',
        min: 500_001, max: 1_000_000,
        credits: 1500,
        time: '30–60 min parse',
        color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE',
      },
      {
        label: 'Epic Novel',
        range: '1M – 1.5M characters',
        min: 1_000_001, max: 1_500_000,
        credits: 1700,
        time: '60–90 min parse',
        color: '#EF4444', bg: '#FEF2F2', border: '#FECACA',
      },
    ]
    const activeTier = tiers.find(t => characterCount >= t.min && characterCount <= t.max)
      ?? (characterCount > 1_500_000 ? tiers[3] : tiers[0])

    return (
      <div style={{ background: cream, minHeight: '100vh' }}>
        <StepIndicator current={step} />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎙</div>
            <h1 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 28, fontWeight: 700, color: dark,
              margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              {bookTitle || 'Your Audiobook'}
            </h1>
            {characterCount > 0 && (
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, color: muted, margin: 0,
              }}>
                {characterCount.toLocaleString()} characters detected
              </p>
            )}
          </div>

          {/* Tier cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {tiers.map(tier => {
              const isActive = tier === activeTier
              return (
                <div
                  key={tier.label}
                  style={{
                    border: `2px solid ${isActive ? tier.color : border}`,
                    borderRadius: 14,
                    padding: '16px 20px',
                    background: isActive ? tier.bg : card,
                    transition: 'all 150ms ease',
                    position: 'relative',
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: -11, left: 20,
                      background: tier.color, color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 10px', borderRadius: 100,
                      fontFamily: 'var(--font-inter), sans-serif',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      Your Book
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{
                          fontFamily: 'var(--font-playfair), serif',
                          fontSize: 16, fontWeight: 700,
                          color: isActive ? tier.color : dark,
                        }}>
                          {tier.label}
                        </span>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 12, color: muted,
                      }}>
                        {tier.range} · {tier.time}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 20, fontWeight: 700,
                        color: isActive ? tier.color : dark,
                      }}>
                        {tier.credits.toLocaleString()}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 11, color: muted,
                      }}>
                        credits
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Start button */}
          <button
            onClick={() => setStep('loading')}
            style={{
              width: '100%', padding: '16px',
              background: red, color: '#fff',
              border: 'none', borderRadius: 12,
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.01em',
            }}
          >
            Start Production — {activeTier.credits.toLocaleString()} Credits
          </button>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 12, color: muted, textAlign: 'center',
            margin: '12px 0 0', lineHeight: 1.5,
          }}>
            Credits are only deducted when audio generation begins, not during parsing.
          </p>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: ERROR
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'error') return (
    <div style={{ background: cream, minHeight: '100vh', paddingTop: 64 }}>
      <style>{KEYFRAMES}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 24px' }}>
        <div style={{
          background: card, border: '1px solid #FECACA',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: '#DC2626' }} />
          <div style={{ padding: '56px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 18 }}>⚠️</div>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 26, fontWeight: 700, color: dark,
              margin: '0 0 10px',
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 14, color: muted, lineHeight: 1.6,
              maxWidth: 440, margin: '0 auto 32px',
            }}>
              {errorMsg}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => { setError(null); setStep('loading') }}
                style={{
                  padding: '12px 26px', background: red, color: '#fff',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 14, fontWeight: 700,
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '12px 26px', background: cream,
                  border: `1.5px solid ${border}`, borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 14, color: muted,
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: GENERATING
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'generating') return (
    <div style={{ background: cream, minHeight: '100vh', paddingTop: 64 }}>
      <style>{KEYFRAMES}</style>
      <StepIndicator current="generating" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 24px' }}>
        <div style={{
          background: card, border: '1px solid #FDE68A',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: '#D97706' }} />
          <div style={{ padding: '56px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 22 }}>🎙️</div>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 30, fontWeight: 700, color: dark,
              margin: '0 0 12px', letterSpacing: '-0.02em',
            }}>
              Your audiobook is being produced
            </h2>
            {bookTitle && (
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 14, color: red, fontWeight: 600,
                margin: '0 0 14px',
              }}>
                {bookTitle}
              </div>
            )}
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 14, color: muted, lineHeight: 1.7,
              maxWidth: 460, margin: '0 auto 36px',
            }}>
              Each line is being voiced by its assigned character. Usually ready in{' '}
              <strong style={{ color: dark }}>20–40 minutes</strong>.
              We&apos;ll notify you when it&apos;s ready.
            </p>

            {/* Progress bar */}
            <div style={{ maxWidth: 480, margin: '0 auto 10px' }}>
              <div style={{
                background: '#EDE9E0', borderRadius: 999,
                height: 9, overflow: 'hidden', position: 'relative',
              }}>
                {pollProgress > 0 ? (
                  <div style={{
                    height: '100%', borderRadius: 999,
                    background: `linear-gradient(90deg, ${red}, #E8735F)`,
                    width: `${pollProgress}%`, transition: 'width 1.2s ease',
                  }} />
                ) : (
                  <ShimmerBar height={9} />
                )}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 12, color: muted, marginBottom: 36,
            }}>
              {pollProgress > 0 ? `${pollProgress}% complete` : 'Queued — starting soon…'}
            </div>

            {/* Stats row */}
            <div style={{
              display: 'flex', gap: 28, justifyContent: 'center',
              marginBottom: 36,
            }}>
              {[
                { v: segments.length.toString(), l: 'Segments' },
                { v: `~${estimatedMins}m`, l: 'Est. runtime' },
                ...(chapterCount ? [{ v: chapterCount.toString(), l: 'Chapters' }] : []),
              ].map(s => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: 24, fontWeight: 700, color: dark,
                  }}>
                    {s.v}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 12, color: muted, marginTop: 2,
                  }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '12px 28px', background: cream,
                border: `1.5px solid ${border}`, borderRadius: 10,
                cursor: 'pointer',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 14, color: muted,
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: DONE
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'done') return (
    <div style={{ background: cream, minHeight: '100vh', paddingTop: 64 }}>
      <style>{KEYFRAMES}</style>
      <StepIndicator current="done" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 24px' }}>
        <div style={{
          background: card, border: '1px solid #BBF7D0',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: '#16A34A' }} />
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 18 }}>🎧</div>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 34, fontWeight: 700, color: dark,
              margin: '0 0 12px', letterSpacing: '-0.02em',
            }}>
              Your audiobook is ready!
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15, color: muted, lineHeight: 1.7,
              margin: '0 0 32px',
            }}>
              {bookTitle ? `"${bookTitle}" is` : 'Your book is'} fully voiced and ready to listen to.
            </p>

            {/* Stats */}
            {doneData && (
              <div style={{
                display: 'flex', gap: 36, justifyContent: 'center',
                margin: '0 0 40px',
              }}>
                {doneData.durationSeconds !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-playfair), serif',
                      fontSize: 28, fontWeight: 700, color: red,
                    }}>
                      {fmtDuration(doneData.durationSeconds)}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: 12, color: muted, marginTop: 4,
                    }}>
                      Duration
                    </div>
                  </div>
                )}
                {doneData.chapterCount !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-playfair), serif',
                      fontSize: 28, fontWeight: 700, color: red,
                    }}>
                      {doneData.chapterCount}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: 12, color: muted, marginTop: 4,
                    }}>
                      Chapters
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              maxWidth: 340, margin: '0 auto',
            }}>
              <a
                href={`/listen/${bookId}`}
                style={{
                  display: 'block', padding: '17px 28px',
                  background: red, color: '#fff',
                  borderRadius: 12, textDecoration: 'none',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 16, fontWeight: 700,
                }}
              >
                🎧 Listen Now
              </a>
              <a
                href={`/downloads/${bookId}`}
                style={{
                  display: 'block', padding: '14px 28px',
                  background: card, color: dark,
                  border: `1.5px solid ${border}`,
                  borderRadius: 12, textDecoration: 'none',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 14, fontWeight: 600,
                }}
              >
                ⬇️ Downloads
              </a>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '14px 28px', background: cream,
                  border: `1.5px solid ${border}`, borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 14, color: muted,
                }}
              >
                Back to Book Hub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: CONFIRM
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'confirm') return (
    <div style={{ background: cream, minHeight: '100vh', paddingTop: 64 }}>
      <style>{KEYFRAMES}</style>
      <StepIndicator current="confirm" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 24px' }}>
        <div style={{
          background: card, border: `1px solid ${border}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: '#D97706' }} />
          <div style={{
            padding: '52px 40px 56px',
            maxWidth: 540, margin: '0 auto', textAlign: 'center',
          }}>

            {/* Cover / icon */}
            {bookCover ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bookCover}
                  alt={bookTitle}
                  style={{
                    width: 80, height: 110,
                    borderRadius: 8, objectFit: 'cover',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                    display: 'block',
                  }}
                />
              </div>
            ) : (
              <div style={{ fontSize: 44, marginBottom: 22 }}>🎙️</div>
            )}

            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 28, fontWeight: 700, color: dark,
              margin: '0 0 6px', letterSpacing: '-0.02em',
            }}>
              Generate Audiobook?
            </h2>
            {bookTitle && (
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 14, color: muted, margin: '0 0 30px',
              }}>
                {bookTitle}
              </div>
            )}

            {/* Stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10, marginBottom: 30,
            }}>
              <StatChip value={segments.length.toString()} label="Segments" />
              <StatChip value={(speakers.length + 1).toString()} label="Characters" />
              {chapterCount
                ? <StatChip value={chapterCount.toString()} label="Chapters" />
                : <StatChip value={`~${estimatedMins}m`} label="Est. runtime" />
              }
              <StatChip value={`~${estimatedMins}m`} label="Runtime" />
              <StatChip value="1,500" label="Credits" />
            </div>

            {/* Error message */}
            {errorMsg && (
              <div style={{
                background: 'rgba(200,64,47,0.06)',
                border: '1px solid rgba(200,64,47,0.25)',
                borderRadius: 8, padding: '12px 16px', marginBottom: 22,
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, color: red, textAlign: 'left',
              }}>
                {errorMsg}
              </div>
            )}

            {/* Primary CTA */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                width: '100%', padding: '17px',
                background: generating ? '#E8735F' : red,
                color: '#fff', border: 'none', borderRadius: 12,
                cursor: generating ? 'wait' : 'pointer',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 16, fontWeight: 700,
                marginBottom: 16,
                transition: 'background 150ms ease',
              }}
            >
              {generating ? 'Starting generation…' : `🎙️ Generate Audiobook — ${(estCredits || 1500).toLocaleString()} credits`}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setStep('assign')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: muted, fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, textDecoration: 'underline',
              }}
            >
              ← Back to voice assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: ASSIGN  (the main layout)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: cream, minHeight: '100vh', paddingTop: 64 }}>
      <style>{KEYFRAMES}</style>
      <StepIndicator current="assign" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 96px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: 28,
          alignItems: 'start',
        }}>

          {/* ── SIDEBAR ── */}
          <div>
            <div style={{
              background: card, border: `1px solid ${border}`,
              borderRadius: 12, overflow: 'hidden',
              position: 'sticky', top: 138,
            }}>
              {/* Accent strip */}
              <div style={{ height: 3, background: '#D97706' }} />

              <div style={{ padding: '22px 20px 24px' }}>

                {/* Cover */}
                {bookCover ? (
                  <div style={{ marginBottom: 18 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bookCover}
                      alt={bookTitle}
                      style={{
                        width: '100%', height: 'auto', aspectRatio: '2/3',
                        objectFit: 'cover', borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        display: 'block',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '2/3', borderRadius: 8,
                    background: 'linear-gradient(145deg, #C8402F 0%, #8A1C10 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.25)', fontSize: 48, marginBottom: 18,
                  }}>
                    📖
                  </div>
                )}

                {/* Book title */}
                <h3 style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontSize: 16, fontWeight: 700, color: dark,
                  margin: '0 0 18px', lineHeight: 1.35,
                }}>
                  {bookTitle || 'Your Book'}
                </h3>

                {/* Stats list */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 9,
                  marginBottom: 20,
                }}>
                  {[
                    { icon: '📝', label: 'Words',       value: wordCount.toLocaleString() },
                    { icon: '⏱',  label: 'Est. runtime', value: `~${estimatedMins} min` },
                    { icon: '🎭', label: 'Characters',  value: (speakers.length + 1).toString() },
                    ...(chapterCount ? [{ icon: '📖', label: 'Chapters', value: chapterCount.toString() }] : []),
                    { icon: '💬', label: 'Segments',    value: segments.length.toString() },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 12, color: muted,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {stat.icon} {stat.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 12, fontWeight: 700, color: dark,
                      }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div style={{ borderTop: `1px solid ${border}`, marginBottom: 18 }} />

                {/* Preview hint blurb */}
                <div style={{
                  background: '#FDF8F3', border: '1px solid #F0E8D8',
                  borderRadius: 8, padding: '12px 14px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 10, fontWeight: 700, color: '#B45309',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    marginBottom: 6,
                  }}>
                    💡 Preview voices
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 12, color: muted, lineHeight: 1.6, margin: 0,
                  }}>
                    Click <strong>▶</strong> on any voice card to hear a sample before assigning it to a character.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div>
            {/* Section heading */}
            <div style={{ marginBottom: 22 }}>
              <h2 style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: 26, fontWeight: 700, color: dark,
                margin: '0 0 6px', letterSpacing: '-0.01em',
              }}>
                Cast Your Characters
              </h2>
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, color: muted, margin: 0, lineHeight: 1.5,
              }}>
                Assign a voice to each character. Sorted by most lines. Click a card to pick a voice.
              </p>
            </div>

            {/* Narrator (selectable) */}
            <CharacterCard
              speaker="NARRATOR"
              speakerColor={NARRATOR_COLOR}
              voiceKey={narratorVoice}
              isOpen={activePicker === 'NARRATOR'}
              onToggle={() => setActivePicker(activePicker === 'NARRATOR' ? null : 'NARRATOR')}
              onVoiceChange={key => { setNarratorVoice(key); setActivePicker(null) }}
              playingKey={playingKey}
              onPlay={handlePlayVoice}
              onStop={handleStopVoice}
              isNarrator
              lineCount={lineCounts['NARRATOR']}
              voiceUsageMap={voiceUsageMap}
            />

            {/* Auto-fill button */}
            {sortedSpeakers.some(sp => !voiceMap[sp] || voiceMap[sp] === 'default') && (
              <button
                onClick={handleAutoFill}
                style={{
                  width: '100%', padding: '11px 18px',
                  background: 'rgba(200,64,47,0.06)',
                  border: `1.5px dashed rgba(200,64,47,0.35)`,
                  borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 4,
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,64,47,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(200,64,47,0.06)')}
              >
                <span style={{ fontSize: 15 }}>✨</span>
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 13, fontWeight: 600, color: red,
                }}>
                  Auto-fill remaining characters
                </span>
              </button>
            )}

            {/* Character cards — 2-column grid, sorted by line count */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {sortedSpeakers.map(speaker => (
              <CharacterCard
                key={speaker}
                speaker={speaker}
                speakerColor={speakerColors[speaker] || muted}
                voiceKey={voiceMap[speaker] || 'default'}
                isOpen={activePicker === speaker}
                onToggle={() => setActivePicker(activePicker === speaker ? null : speaker)}
                onVoiceChange={key => setVoiceMap(prev => ({ ...prev, [speaker]: key }))}
                playingKey={playingKey}
                onPlay={handlePlayVoice}
                onStop={handleStopVoice}
                lineCount={lineCounts[speaker]}
                voiceUsageMap={voiceUsageMap}
              />
            ))}
            </div>


            {/* ── Collapsible dialogue preview ── */}
            {segments.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <button
                  onClick={() => setPreviewOpen(v => !v)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: previewOpen ? '12px 12px 0 0' : 12,
                    cursor: 'pointer',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>💬</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 13, fontWeight: 700, color: dark,
                      }}>
                        Preview Dialogue
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 11, color: muted, marginTop: 1,
                      }}>
                        First {Math.min(10, segments.length)} of {segments.length} segments · colour-coded by speaker
                      </div>
                    </div>
                  </div>
                  <svg
                    width={16} height={16} viewBox="0 0 24 24" fill="none"
                    stroke={muted} strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      transform: previewOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 200ms ease',
                      flexShrink: 0,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {previewOpen && (
                  <div style={{
                    border: `1px solid ${border}`, borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    background: '#FDFCFB',
                    padding: '12px 14px 14px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    {segments.slice(0, 10).map(seg => {
                      const isNarr = seg.speaker === 'NARRATOR'
                      const col    = speakerColors[seg.speaker] || muted
                      return (
                        <div
                          key={seg.index}
                          style={{
                            background: card,
                            border: `1px solid ${border}`,
                            borderLeft: `4px solid ${col}`,
                            borderRadius: 8,
                            padding: '10px 14px',
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                          }}
                        >
                          <div style={{
                            fontFamily: 'var(--font-inter), sans-serif',
                            fontSize: 10, fontWeight: 700,
                            color: col, textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            minWidth: 76, paddingTop: 2, flexShrink: 0,
                          }}>
                            {isNarr ? 'Narrator' : seg.speaker}
                          </div>
                          <div style={{
                            fontFamily: isNarr
                              ? 'var(--font-inter), sans-serif'
                              : 'var(--font-playfair), serif',
                            fontSize: 13,
                            color: isNarr ? '#5C5751' : dark,
                            lineHeight: 1.6,
                            fontStyle: isNarr ? 'italic' : 'normal',
                          }}>
                            {isNarr ? seg.text : `"${seg.text}"`}
                          </div>
                        </div>
                      )
                    })}
                    {segments.length > 10 && (
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 12, color: muted,
                        textAlign: 'center', paddingTop: 6,
                      }}>
                        + {segments.length - 10} more segments
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Continue CTA ── */}
            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setStep('confirm')}
                style={{
                  width: '100%', padding: '16px',
                  background: red, color: '#fff', border: 'none',
                  borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 15, fontWeight: 700,
                  transition: 'background 150ms ease',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                }}
              >
                Continue to Generate
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
