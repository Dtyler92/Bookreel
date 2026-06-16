'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Character, Scene } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CharacterWithApproval extends Character {
  author_approved: boolean
}

interface SceneWithApproval extends Scene {
  author_approved: boolean
}

interface Props {
  bookId: string
  initialCharacters: CharacterWithApproval[]
  initialScenes: SceneWithApproval[]
}

// ─── Helper: parse combined description field ─────────────────────────────────

function parseCharacterDescription(description: string | null) {
  if (!description) return { story: '', temperament: '' }
  const parts = description.split('**Temperament:**')
  return {
    story: parts[0].trim(),
    temperament: parts[1]?.trim() || '',
  }
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string | null }) {
  const r = (role ?? '').toLowerCase()
  // Vermillion (#C8402F) badge for all roles, varying shade
  const bg =
    r === 'protagonist'
      ? 'rgba(200,64,47,0.12)'
      : r === 'antagonist'
      ? 'rgba(200,64,47,0.20)'
      : 'rgba(138,130,120,0.12)'
  const color =
    r === 'protagonist' || r === 'antagonist' ? '#C8402F' : '#8A8278'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '999px',
        padding: '2px 10px',
        fontSize: '11px',
        fontFamily: 'var(--font-inter), sans-serif',
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: '0.04em',
        background: bg,
        color,
      }}
    >
      {role ?? 'Supporting'}
    </span>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: '#8A8278',
        marginBottom: '3px',
        fontVariant: 'small-caps',
      }}
    >
      {children}
    </span>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FAFAF7',
  border: '1.5px solid #E8E2D5',
  borderRadius: '8px',
  padding: '10px 12px',
  fontFamily: 'var(--font-inter), sans-serif',
  fontSize: '14px',
  color: '#1A1A18',
  outline: 'none',
  boxSizing: 'border-box',
  resize: 'none',
}

// ─── Character Card ───────────────────────────────────────────────────────────

function CharacterCard({
  character,
  approved,
  onApprove,
  onUpdate,
}: {
  character: CharacterWithApproval
  approved: boolean
  onApprove: (id: string, approved: boolean) => void
  onUpdate: (id: string, data: Partial<Character>) => void
}) {
  const parsed = parseCharacterDescription(character.description)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(character.name)
  const [role, setRole] = useState(character.role ?? '')
  const [storyDescription, setStoryDescription] = useState(parsed.story)
  const [temperament, setTemperament] = useState(parsed.temperament)
  const [appearance, setAppearance] = useState(character.appearance_notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Recombine story + temperament into description
    const combinedDescription = temperament
      ? `${storyDescription}\n\n**Temperament:** ${temperament}`.trim()
      : storyDescription

    try {
      const res = await fetch('/api/books/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'character',
          id: character.id,
          name,
          role,
          description: combinedDescription,
          appearance_notes: appearance,
        }),
      })
      if (res.ok) {
        onUpdate(character.id, {
          name,
          role,
          description: combinedDescription,
          appearance_notes: appearance,
        })
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleApproveChange = async (checked: boolean) => {
    onApprove(character.id, checked)
    await fetch('/api/books/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'character', id: character.id, author_approved: checked }),
    })
  }

  // Re-parse in view mode in case onUpdate changed the character
  const viewParsed = parseCharacterDescription(character.description)

  return (
    <div
      style={{
        borderRadius: '12px',
        border: `1.5px solid ${approved ? '#6DBF8A' : '#E8E2D5'}`,
        background: '#FFFFFF',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 200ms ease',
      }}
    >
      {editing ? (
        // ── Edit form ──────────────────────────────────────────────────────────
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Name */}
          <div>
            <SectionLabel>Name</SectionLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Role */}
          <div>
            <SectionLabel>Role</SectionLabel>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' }}
            >
              <option value="protagonist">Protagonist</option>
              <option value="antagonist">Antagonist</option>
              <option value="supporting">Supporting</option>
            </select>
          </div>

          {/* Appearance */}
          <div>
            <SectionLabel>Appearance</SectionLabel>
            <textarea
              rows={3}
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              style={inputStyle}
              placeholder="Height, build, hair, eyes, age, skin tone, distinguishing features, typical clothing…"
            />
          </div>

          {/* Temperament */}
          <div>
            <SectionLabel>Temperament</SectionLabel>
            <textarea
              rows={3}
              value={temperament}
              onChange={(e) => setTemperament(e.target.value)}
              style={inputStyle}
              placeholder="Personality traits, emotional tendencies, speech patterns, mannerisms…"
            />
          </div>

          {/* Role in Story */}
          <div>
            <SectionLabel>Role in Story</SectionLabel>
            <textarea
              rows={3}
              value={storyDescription}
              onChange={(e) => setStoryDescription(e.target.value)}
              style={inputStyle}
              placeholder="Personality, backstory, role in story…"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#C8402F',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FAFAF7',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity 150ms ease',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                background: '#FAFAF7',
                border: '1.5px solid #E8E2D5',
                borderRadius: '8px',
                padding: '8px 18px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1A1A18',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // ── View mode ──────────────────────────────────────────────────────────
        <>
          {/* Header: name + badge + edit */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  fontSize: '17px',
                  color: '#0D0D0B',
                  margin: 0,
                }}
              >
                {character.name}
              </h3>
              <RoleBadge role={character.role} />
            </div>
            <button
              onClick={() => setEditing(true)}
              style={{
                flexShrink: 0,
                background: '#FAFAF7',
                border: '1.5px solid #E8E2D5',
                borderRadius: '8px',
                padding: '5px 14px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8A8278',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
              }}
            >
              Edit
            </button>
          </div>

          {/* Appearance */}
          {character.appearance_notes && (
            <div>
              <SectionLabel>Appearance</SectionLabel>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '13px',
                  color: '#4A4642',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {character.appearance_notes}
              </p>
            </div>
          )}

          {/* Temperament */}
          {viewParsed.temperament && (
            <div>
              <SectionLabel>Temperament</SectionLabel>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '13px',
                  color: '#4A4642',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {viewParsed.temperament}
              </p>
            </div>
          )}

          {/* Role in Story */}
          {viewParsed.story && (
            <div>
              <SectionLabel>Role in Story</SectionLabel>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '13px',
                  color: '#4A4642',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {viewParsed.story}
              </p>
            </div>
          )}

          {/* Approve toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingTop: '10px',
              borderTop: '1px solid #F0EBE2',
            }}
          >
            <input
              type="checkbox"
              id={`char-approve-${character.id}`}
              checked={approved}
              onChange={(e) => handleApproveChange(e.target.checked)}
              style={{ accentColor: '#C8402F', width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <label
              htmlFor={`char-approve-${character.id}`}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4A4642',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Approve character
            </label>
            {approved && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#3C9E5E',
                }}
              >
                ✓ Approved
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Scene Card ───────────────────────────────────────────────────────────────

function SceneCard({
  scene,
  approved,
  onApprove,
}: {
  scene: SceneWithApproval
  approved: boolean
  onApprove: (id: string, approved: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const handleApproveChange = async (checked: boolean) => {
    onApprove(scene.id, checked)
    await fetch('/api/books/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'scene', id: scene.id, author_approved: checked }),
    })
  }

  return (
    <div
      style={{
        borderRadius: '12px',
        border: `1.5px solid ${approved ? '#6DBF8A' : '#E8E2D5'}`,
        background: '#FFFFFF',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 200ms ease',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Scene number badge */}
        <span
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(200,64,47,0.10)',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            color: '#C8402F',
          }}
        >
          {scene.scene_number}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {scene.title && (
            <h3
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontWeight: 700,
                fontSize: '16px',
                color: '#0D0D0B',
                margin: '0 0 4px',
              }}
            >
              {scene.title}
            </h3>
          )}
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '13px',
              color: '#4A4642',
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {scene.description}
          </p>
        </div>
      </div>

      {scene.screenplay_text && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#C8402F',
            }}
          >
            <span>{expanded ? '▲' : '▼'}</span>
            {expanded ? 'Hide screenplay' : 'View screenplay'}
          </button>
          {expanded && (
            <pre
              style={{
                marginTop: '8px',
                borderRadius: '8px',
                background: '#F5F1EB',
                border: '1px solid #E8E2D5',
                padding: '14px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#4A4642',
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
              }}
            >
              {scene.screenplay_text}
            </pre>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingTop: '10px',
          borderTop: '1px solid #F0EBE2',
        }}
      >
        <input
          type="checkbox"
          id={`scene-approve-${scene.id}`}
          checked={approved}
          onChange={(e) => handleApproveChange(e.target.checked)}
          style={{ accentColor: '#C8402F', width: '15px', height: '15px', cursor: 'pointer' }}
        />
        <label
          htmlFor={`scene-approve-${scene.id}`}
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: '#4A4642',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          Approve scene
        </label>
        {approved && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#3C9E5E',
            }}
          >
            ✓ Approved
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main ReviewClient ────────────────────────────────────────────────────────

export default function ReviewClient({ bookId, initialCharacters, initialScenes }: Props) {
  const router = useRouter()
  const [characters, setCharacters] = useState<CharacterWithApproval[]>(initialCharacters)
  const [scenes, setScenes] = useState<SceneWithApproval[]>(initialScenes)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const approvedCharacters = new Set(characters.filter((c) => c.author_approved).map((c) => c.id))
  const approvedScenes = new Set(scenes.filter((s) => s.author_approved).map((s) => s.id))
  const allApproved =
    characters.length > 0 &&
    scenes.length > 0 &&
    approvedCharacters.size === characters.length &&
    approvedScenes.size === scenes.length

  const handleCharacterApprove = (id: string, approved: boolean) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, author_approved: approved } : c)))
  }

  const handleCharacterUpdate = (id: string, data: Partial<Character>) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  const handleSceneApprove = (id: string, approved: boolean) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, author_approved: approved } : s)))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      router.push(`/review-images/${bookId}`)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to navigate.')
      setGenerating(false)
    }
  }

  const totalItems = characters.length + scenes.length
  const approvedItems = approvedCharacters.size + approvedScenes.size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '120px' }}>
      {/* ── Characters ──────────────────────────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#0D0D0B',
              margin: '0 0 4px',
            }}
          >
            Your Characters
            <span
              style={{
                marginLeft: '10px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                color: '#8A8278',
              }}
            >
              ({approvedCharacters.size}/{characters.length} approved)
            </span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: '#8A8278',
              margin: 0,
            }}
          >
            These are the characters we found in your manuscript. Confirm the ones you&apos;d like featured in your trailer.
          </p>
        </div>
        {characters.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: '#8A8278',
              fontStyle: 'italic',
            }}
          >
            No characters found.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                approved={approvedCharacters.has(c.id)}
                onApprove={handleCharacterApprove}
                onUpdate={handleCharacterUpdate}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Scenes ──────────────────────────────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#0D0D0B',
              margin: '0 0 4px',
            }}
          >
            Your Key Scenes
            <span
              style={{
                marginLeft: '10px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                color: '#8A8278',
              }}
            >
              ({approvedScenes.size}/{scenes.length} approved)
            </span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: '#8A8278',
              margin: 0,
            }}
          >
            These are the moments from your book that we think will resonate most on screen. Keep the ones that feel right, swap any that don&apos;t.
          </p>
        </div>
        {scenes.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: '#8A8278',
              fontStyle: 'italic',
            }}
          >
            No scenes found.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {scenes.map((s) => (
              <SceneCard
                key={s.id}
                scene={s}
                approved={approvedScenes.has(s.id)}
                onApprove={handleSceneApprove}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid #E8E2D5',
          background: 'rgba(250,250,247,0.97)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          {/* Progress */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  color: '#8A8278',
                }}
              >
                {approvedItems} of {totalItems} items approved
              </span>
              {allApproved && (
                <span
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#3C9E5E',
                  }}
                >
                  All approved! 🎉
                </span>
              )}
            </div>
            <div
              style={{
                height: '5px',
                width: '100%',
                borderRadius: '999px',
                background: '#E8E2D5',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '999px',
                  background: '#C8402F',
                  width: totalItems > 0 ? `${(approvedItems / totalItems) * 100}%` : '0%',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
          </div>

          {/* Generate button */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            {generateError && (
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  color: '#C8402F',
                  marginBottom: '4px',
                }}
              >
                {generateError}
              </p>
            )}
            <button
              onClick={handleGenerate}
              disabled={!allApproved || generating}
              style={{
                background: allApproved ? '#C8402F' : '#E8E2D5',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                color: allApproved ? '#FAFAF7' : '#8A8278',
                cursor: allApproved && !generating ? 'pointer' : 'not-allowed',
                transition: 'background 200ms ease, color 200ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {generating ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(250,250,247,0.4)',
                      borderTopColor: '#FAFAF7',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Opening…
                </>
              ) : (
                'Continue to Visual Review →'
              )}
            </button>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '11px',
                color: '#8A8278',
                marginTop: '4px',
                textAlign: 'right',
              }}
            >
              Your trailer usually takes 15–20 minutes to produce.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
