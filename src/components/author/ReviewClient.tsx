'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  bookTitle: string
  bookGenre?: string | null
  initialVoiceover?: string | null
  initialCharacters: CharacterWithApproval[]
  initialScenes: SceneWithApproval[]
  wizardMode?: boolean
  onWizardComplete?: (approvedSceneIds: string[], approvedCharacterIds: string[]) => void
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

// ─── Custom Toggle Switch ─────────────────────────────────────────────────────

function ApproveToggle({
  approved,
  onChange,
  id,
}: {
  approved: boolean
  onChange: (val: boolean) => void
  id: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        role="switch"
        aria-checked={approved}
        aria-label="Approve"
        id={id}
        onClick={() => onChange(!approved)}
        style={{
          position: 'relative',
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: approved ? '#C8402F' : '#E8E2D5',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          transition: 'background-color 250ms',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: 0,
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 4px rgba(13,13,11,0.20)',
            transform: approved ? 'translateX(20px)' : 'translateX(2px)',
            transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1)',
            display: 'block',
          }}
        />
      </button>
      <label
        htmlFor={id}
        style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          color: approved ? '#C8402F' : '#8A8278',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {approved ? 'Approved' : 'Approve'}
      </label>
    </div>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string | null }) {
  const r = (role ?? '').toLowerCase()
  const bg =
    r === 'protagonist'
      ? '#FEF3C7'
      : r === 'antagonist'
      ? '#FEE2E2'
      : '#EDE9E0'
  const color =
    r === 'protagonist'
      ? '#92400E'
      : r === 'antagonist'
      ? '#991B1B'
      : '#8A8278'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '100px',
        padding: '3px 10px',
        fontSize: '10px',
        fontFamily: 'var(--font-inter), sans-serif',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        backgroundColor: bg,
        color,
      }}
    >
      {role ?? 'Supporting'}
    </span>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2
        style={{
          fontFamily: 'var(--font-playfair), serif',
          fontWeight: 700,
          fontSize: '20px',
          color: '#0D0D0B',
          margin: 0,
        }}
      >
        {children}
      </h2>
      <div
        style={{
          width: '40px',
          height: '2px',
          backgroundColor: '#C8402F',
          marginTop: '6px',
          borderRadius: '1px',
        }}
      />
    </div>
  )
}

// ─── Shared input/textarea style ──────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  border: '1px solid #E8E2D5',
  borderRadius: '6px',
  padding: '10px 12px',
  fontFamily: 'var(--font-inter), sans-serif',
  fontSize: '14px',
  color: '#1A1A18',
  outline: 'none',
  boxSizing: 'border-box',
  resize: 'none',
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        style={{
          display: 'block',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#8A8278',
          marginBottom: '4px',
        }}
      >
        {label}
      </span>
      <p
        style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          color: '#1A1A18',
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {value}
      </p>
    </div>
  )
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

  const initial = character.name.charAt(0).toUpperCase()

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E2D5',
        borderLeft: `3px solid ${approved ? '#C8402F' : '#E8E2D5'}`,
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(13,13,11,0.05)',
        transition: 'border-left-color 250ms',
      }}
    >
      {/* ── Card header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EDE9E0, rgba(200,64,47,0.20))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            fontSize: '18px',
            color: '#C8402F',
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        {/* Name + role badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '18px',
              color: '#0D0D0B',
              margin: '0 0 4px',
            }}
          >
            {character.name}
          </h3>
          <RoleBadge role={character.role} />
        </div>
      </div>

      {/* ── View / Edit body ─────────────────────────────────────────────────── */}
      {editing ? (
        <div
          style={{
            backgroundColor: '#F4F1EB',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Appearance */}
          <div>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#8A8278',
                marginBottom: '4px',
              }}
            >
              Appearance
            </span>
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
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#8A8278',
                marginBottom: '4px',
              }}
            >
              Temperament
            </span>
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
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#8A8278',
                marginBottom: '4px',
              }}
            >
              Role in Story
            </span>
            <textarea
              rows={3}
              value={storyDescription}
              onChange={(e) => setStoryDescription(e.target.value)}
              style={inputStyle}
              placeholder="Personality, backstory, role in story…"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: '#C8402F',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
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
                background: 'none',
                border: 'none',
                padding: '12px 16px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: '#8A8278',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {character.appearance_notes && (
            <>
              <InfoRow label="Appearance" value={character.appearance_notes} />
              <div style={{ height: '1px', backgroundColor: '#EDE9E0', margin: '12px 0' }} />
            </>
          )}
          {viewParsed.temperament && (
            <>
              <InfoRow label="Temperament" value={viewParsed.temperament} />
              <div style={{ height: '1px', backgroundColor: '#EDE9E0', margin: '12px 0' }} />
            </>
          )}
          {viewParsed.story && (
            <InfoRow label="Role in Story" value={viewParsed.story} />
          )}
        </div>
      )}

      {/* ── Card footer ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: '16px',
          borderTop: '1px solid #EDE9E0',
          marginTop: '16px',
        }}
      >
        {/* Edit button */}
        <button
          onClick={() => setEditing((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 8px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: '#8A8278',
            cursor: 'pointer',
          }}
        >
          ✏ Edit
        </button>

        {/* Approve toggle */}
        <ApproveToggle
          approved={approved}
          onChange={handleApproveChange}
          id={`char-approve-${character.id}`}
        />
      </div>
    </div>
  )
}

// ─── Scene Card ───────────────────────────────────────────────────────────────

function SceneCard({
  scene,
  approved,
  onApprove,
  onSceneUpdate,
  bookId,
  index,
}: {
  scene: SceneWithApproval
  approved: boolean
  onApprove: (id: string, approved: boolean) => void
  onSceneUpdate: (id: string, updates: Partial<SceneWithApproval>) => void
  bookId: string
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draftDescription, setDraftDescription] = useState(scene.description)
  const [draftScreenplay, setDraftScreenplay] = useState(scene.screenplay_text ?? '')

  const isRejected = scene.moderation_status === 'rejected'

  const handleApproveChange = async (checked: boolean) => {
    onApprove(scene.id, checked)
    await fetch('/api/books/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'scene', id: scene.id, author_approved: checked }),
    })
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/books/${bookId}/scenes/${scene.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: draftDescription,
          screenplay_text: draftScreenplay,
        }),
      })
      if (res.ok) {
        onSceneUpdate(scene.id, {
          description: draftDescription,
          screenplay_text: draftScreenplay,
          author_edited: true,
          moderation_status: null,
          moderation_reason: null,
          suggested_edit: null,
        })
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUseSuggestion = () => {
    if (!scene.suggested_edit) return
    setDraftDescription(scene.suggested_edit)
    setEditing(true)
  }

  const handleCancelEdit = () => {
    setDraftDescription(scene.description)
    setDraftScreenplay(scene.screenplay_text ?? '')
    setEditing(false)
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E2D5',
        borderLeft: `3px solid ${isRejected ? '#E8A23D' : approved ? '#C8402F' : '#E8E2D5'}`,
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(13,13,11,0.05)',
        transition: 'border-left-color 250ms',
      }}
    >
      {/* Decorative number + title row */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span
          style={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 900,
            fontSize: '48px',
            color: 'rgba(200,64,47,0.15)',
            lineHeight: 1,
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1, minWidth: 0, paddingTop: '6px' }}>
          {scene.title && (
            <h3
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontWeight: 700,
                fontSize: '17px',
                color: '#0D0D0B',
                margin: '0 0 6px',
              }}
            >
              {scene.title}
            </h3>
          )}
          {editing ? (
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                color: '#1A1A18',
                lineHeight: 1.6,
                padding: '12px',
                border: '1px solid #C8402F',
                borderRadius: '8px',
                resize: 'vertical',
                outline: 'none',
                background: '#FFFDF9',
              }}
            />
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                color: '#1A1A18',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {scene.description}
            </p>
          )}
          {scene.author_edited && !editing && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '8px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                color: '#8A8578',
              }}
            >
              ✎ Edited by you
            </span>
          )}
        </div>
      </div>

      {/* ── Moderation rejection banner ──────────────────────────────────── */}
      {isRejected && scene.moderation_reason && (
        <div
          style={{
            background: '#FDF4E3',
            border: '1px solid #E8A23D',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.3 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#8A5A12',
                  margin: '0 0 4px',
                }}
              >
                This scene couldn&rsquo;t be filmed
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '13px',
                  color: '#6B4E1F',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {scene.moderation_reason}
              </p>

              {/* Suggested safe rewrite */}
              {scene.suggested_edit && !editing && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#FFFFFF',
                    border: '1px dashed #E8A23D',
                    borderRadius: '8px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#8A5A12',
                      margin: '0 0 6px',
                    }}
                  >
                    Suggested rewrite
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '13px',
                      color: '#1A1A18',
                      margin: '0 0 10px',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{scene.suggested_edit}&rdquo;
                  </p>
                  <button
                    onClick={handleUseSuggestion}
                    style={{
                      background: '#C8402F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Use this version
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / screenplay area */}
      {editing ? (
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#8A8578',
              margin: '0 0 6px',
            }}
          >
            Screenplay (optional)
          </label>
          <textarea
            value={draftScreenplay}
            onChange={(e) => setDraftScreenplay(e.target.value)}
            rows={5}
            placeholder="Add or edit the screenplay text for this scene…"
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#1A1A18',
              lineHeight: 1.6,
              padding: '12px',
              border: '1px solid #E8E2D5',
              borderRadius: '8px',
              resize: 'vertical',
              outline: 'none',
              background: '#F4F1EB',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              style={{
                background: '#C8402F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              style={{
                background: 'transparent',
                color: '#8A8578',
                border: '1px solid #E8E2D5',
                borderRadius: '8px',
                padding: '9px 18px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        scene.screenplay_text && (
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: '#C8402F',
              }}
            >
              {expanded ? 'Hide screenplay' : 'Read screenplay'}
              <span style={{ fontSize: '10px' }}>{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
              <pre
                style={{
                  marginTop: '8px',
                  borderRadius: '8px',
                  background: '#F4F1EB',
                  padding: '16px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#1A1A18',
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  maxHeight: '200px',
                  margin: '8px 0 0',
                }}
              >
                {scene.screenplay_text}
              </pre>
            )}
          </div>
        )
      )}

      {/* Card footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: '16px',
          borderTop: '1px solid #EDE9E0',
        }}
      >
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'transparent',
              border: '1px solid #E8E2D5',
              borderRadius: '8px',
              padding: '10px 14px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1A1A18',
              cursor: 'pointer',
            }}
          >
            ✎ Edit scene
          </button>
        ) : (
          <span />
        )}
        <ApproveToggle
          approved={approved}
          onChange={handleApproveChange}
          id={`scene-approve-${scene.id}`}
        />
      </div>
    </div>
  )
}

// ─── Main ReviewClient ────────────────────────────────────────────────────────

export default function ReviewClient({
  bookId,
  bookTitle,
  bookGenre,
  initialVoiceover,
  initialCharacters,
  initialScenes,
  wizardMode,
  onWizardComplete,
}: Props) {
  const router = useRouter()
  const [characters, setCharacters] = useState<CharacterWithApproval[]>(initialCharacters)
  const [scenes, setScenes] = useState<SceneWithApproval[]>(initialScenes)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // ── Narrator script state ─────────────────────────────────────────────────
  const [voiceoverExpanded, setVoiceoverExpanded] = useState(false)
  const [voiceoverEditing, setVoiceoverEditing] = useState(false)
  const [voiceoverDraft, setVoiceoverDraft] = useState(initialVoiceover ?? '')
  const [voiceover, setVoiceover] = useState(initialVoiceover ?? '')
  const [voiceoverSaving, setVoiceoverSaving] = useState(false)
  const [voiceoverSaved, setVoiceoverSaved] = useState(false)

  const handleVoiceoverSave = async () => {
    setVoiceoverSaving(true)
    setVoiceoverSaved(false)
    try {
      await fetch(`/api/books/${bookId}/voiceover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceover: voiceoverDraft }),
      })
      setVoiceover(voiceoverDraft)
      setVoiceoverEditing(false)
      setVoiceoverSaved(true)
      setTimeout(() => setVoiceoverSaved(false), 3000)
    } finally {
      setVoiceoverSaving(false)
    }
  }

  const approvedCharacters = new Set(characters.filter((c) => c.author_approved).map((c) => c.id))
  const approvedScenes = new Set(scenes.filter((s) => s.author_approved).map((s) => s.id))
  const allApproved = wizardMode
    ? scenes.length > 0 && approvedScenes.size === scenes.length
    : characters.length > 0 &&
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

  const handleSceneUpdate = (id: string, updates: Partial<SceneWithApproval>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const [regenScreenplay, setRegenScreenplay] = useState(false)
  const [regenError, setRegenError]           = useState<string | null>(null)
  const [regenDone, setRegenDone]             = useState(false)

  const handleRegenScreenplay = async () => {
    if (!confirm('This will replace your current screenplay and character list with a fresh AI-generated version using the latest prompts. All current approvals will be reset. Continue?')) return
    setRegenScreenplay(true)
    setRegenError(null)
    setRegenDone(false)
    try {
      const res = await fetch(`/api/books/${bookId}/regenerate-screenplay`, { method: 'POST' })
      const data = await res.json().catch(() => ({})) as { error?: string; scenes?: number; characters?: number }
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setRegenDone(true)
      // Reload the page to show fresh scenes/characters
      setTimeout(() => router.refresh(), 800)
    } catch (e: any) {
      setRegenError(e.message ?? 'Something went wrong. Please try again.')
    } finally {
      setRegenScreenplay(false)
    }
  }

  const handleGenerate = async () => {
    if (wizardMode) {
      onWizardComplete?.(
        scenes.filter(s => s.author_approved).map(s => s.id),
        characters.filter(c => c.author_approved).map(c => c.id),
      )
    } else {
      setGenerating(true)
      setGenerateError(null)
      try {
        router.push(`/review-images/${bookId}`)
      } catch (err) {
        setGenerateError(err instanceof Error ? err.message : 'Failed to navigate.')
        setGenerating(false)
      }
    }
  }

  const totalItems = characters.length + scenes.length
  const approvedItems = approvedCharacters.size + approvedScenes.size
  const progressPct = totalItems > 0 ? (approvedItems / totalItems) * 100 : 0

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAF7',
        paddingTop: wizardMode ? '0' : '128px',
      }}
    >
      {/* ── Fixed page header — hidden in wizard mode (wizard has its own StepBar) */}
      {!wizardMode && (
      <div
        style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          zIndex: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E2D5',
        }}
      >
        <div
          style={{
            maxWidth: '1300px',
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Link
              href="/dashboard"
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                color: '#8A8278',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ← Back to Dashboard
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  fontSize: '28px',
                  color: '#0D0D0B',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {bookTitle}
              </h1>
              {bookGenre && (
                <span
                  style={{
                    backgroundColor: '#EDE9E0',
                    color: '#8A8278',
                    borderRadius: '100px',
                    padding: '4px 12px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {bookGenre}
                </span>
              )}
            </div>
          </div>

          {/* Right: regen button + progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleRegenScreenplay}
              disabled={regenScreenplay}
              title="Re-run AI with the latest screenplay prompts — replaces all current scenes and characters"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: regenDone ? '#F0FDF4' : '#F4F1EB',
                border: `1.5px solid ${regenDone ? '#86EFAC' : '#E8E2D5'}`,
                color: regenDone ? '#15803D' : '#0D0D0B',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13, fontWeight: 600, cursor: regenScreenplay ? 'not-allowed' : 'pointer',
                opacity: regenScreenplay ? 0.6 : 1,
                transition: 'all 150ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {regenScreenplay ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
                  Regenerating…
                </>
              ) : regenDone ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Done — reloading
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                  Regenerate Screenplay
                </>
              )}
            </button>
            <span
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                color: '#8A8278',
                whiteSpace: 'nowrap',
              }}
            >
              {approvedItems} of {totalItems} approved
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Regen error banner */}
      {regenError && (
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            padding: '10px 16px', borderRadius: 8, marginTop: 12,
            background: '#FEF2F2', border: '1px solid #FECACA',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: '#DC2626',
          }}>
            {regenError}
          </div>
        </div>
      )}

      {/* ── Narrator Script panel ────────────────────────────────────────────── */}
      {(voiceover || voiceoverEditing) && (
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 24px 0' }}>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8E2D5',
              borderLeft: '3px solid #C8402F',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            {/* Header row — always visible */}
            <button
              onClick={() => {
                setVoiceoverExpanded((v) => !v)
                if (!voiceoverExpanded) setVoiceoverEditing(false)
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '18px' }}>🎙️</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontWeight: 700,
                    fontSize: '16px',
                    color: '#0D0D0B',
                    margin: 0,
                  }}>
                    Narrator Script
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '12px',
                    color: '#8A8278',
                    margin: '2px 0 0',
                  }}>
                    {voiceoverExpanded ? 'Click to collapse' : 'The voiceover narration for your trailer — click to review and edit'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {voiceoverSaved && (
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#16A34A',
                  }}>✓ Saved</span>
                )}
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  color: '#C8402F',
                  fontWeight: 600,
                }}>
                  {voiceoverExpanded ? '▲ Hide' : '▼ Show'}
                </span>
              </div>
            </button>

            {/* Expandable body */}
            {voiceoverExpanded && (
              <div style={{ padding: '0 24px 24px', borderTop: '1px solid #F0EBE3' }}>
                <p style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  color: '#8A8278',
                  margin: '16px 0 10px',
                }}>
                  This script is what the narrator will speak over your trailer clips. You can edit it to match your voice exactly — it will be used as-is when your trailer is generated.
                </p>

                {voiceoverEditing ? (
                  <>
                    <textarea
                      value={voiceoverDraft}
                      onChange={(e) => setVoiceoverDraft(e.target.value)}
                      rows={8}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '14px',
                        color: '#1A1A18',
                        lineHeight: 1.7,
                        padding: '14px',
                        border: '1px solid #C8402F',
                        borderRadius: '8px',
                        resize: 'vertical',
                        outline: 'none',
                        background: '#FFFDF9',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Write the narrator's script here..."
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button
                        onClick={handleVoiceoverSave}
                        disabled={voiceoverSaving}
                        style={{
                          background: '#C8402F',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: voiceoverSaving ? 'not-allowed' : 'pointer',
                          opacity: voiceoverSaving ? 0.7 : 1,
                        }}
                      >
                        {voiceoverSaving ? 'Saving…' : '✓ Save script'}
                      </button>
                      <button
                        onClick={() => {
                          setVoiceoverDraft(voiceover)
                          setVoiceoverEditing(false)
                        }}
                        disabled={voiceoverSaving}
                        style={{
                          background: 'transparent',
                          color: '#8A8578',
                          border: '1px solid #E8E2D5',
                          borderRadius: '8px',
                          padding: '10px 18px',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      background: '#F4F1EB',
                      borderRadius: '8px',
                      padding: '18px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '14px',
                      color: '#1A1A18',
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {voiceover || <span style={{ color: '#8A8278', fontStyle: 'italic' }}>No narrator script yet. Regenerate the screenplay to generate one.</span>}
                    </div>
                    <button
                      onClick={() => {
                        setVoiceoverDraft(voiceover)
                        setVoiceoverEditing(true)
                      }}
                      style={{
                        marginTop: '12px',
                        background: 'transparent',
                        border: '1px solid #E8E2D5',
                        borderRadius: '8px',
                        padding: '9px 16px',
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#1A1A18',
                        cursor: 'pointer',
                      }}
                    >
                      ✎ Edit narrator script
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <style>{`@media (max-width: 768px) { .br-review-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }`}</style>
      <div
        className="br-review-grid"
        style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '32px 24px 120px',
          display: 'grid',
          gridTemplateColumns: '40% 1fr',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* ── Left column: Characters ──────────────────────────────────────── */}
        <section>
          <SectionHeader>Your Characters</SectionHeader>
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
            characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                approved={approvedCharacters.has(c.id)}
                onApprove={handleCharacterApprove}
                onUpdate={handleCharacterUpdate}
              />
            ))
          )}
        </section>

        {/* ── Right column: Scenes ─────────────────────────────────────────── */}
        <section>
          <SectionHeader>Your Key Scenes</SectionHeader>
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
            scenes.map((s, i) => (
              <SceneCard
                key={s.id}
                scene={s}
                approved={approvedScenes.has(s.id)}
                onApprove={handleSceneApprove}
                onSceneUpdate={handleSceneUpdate}
                bookId={bookId}
                index={i}
              />
            ))
          )}
        </section>
      </div>

      {/* ── Sticky bottom bar ────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '72px',
          backgroundColor: 'rgba(250,250,247,0.95)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid #E8E2D5',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          zIndex: 50,
        }}
      >
        {/* Left: counts + progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              color: '#8A8278',
            }}
          >
            {approvedCharacters.size} characters · {approvedScenes.size} scenes approved
          </span>
          <div
            style={{
              width: '100%',
              maxWidth: '200px',
              height: '4px',
              backgroundColor: '#E8E2D5',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: '#C8402F',
                width: `${progressPct}%`,
                transition: 'width 300ms ease',
                borderRadius: '2px',
              }}
            />
          </div>
        </div>

        {/* Right: CTA button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {generateError && (
            <span
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '12px',
                color: '#C8402F',
              }}
            >
              {generateError}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={!allApproved || generating}
            style={{
              backgroundColor: allApproved ? '#C8402F' : '#E8E2D5',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 28px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: allApproved ? '#FFFFFF' : '#8A8278',
              cursor: allApproved && !generating ? 'pointer' : 'not-allowed',
              opacity: allApproved ? 1 : 0.5,
              transition: 'background-color 200ms ease, color 200ms ease, opacity 200ms ease',
            }}
          >
            {wizardMode ? 'Continue to Image Review →' : generating ? 'Opening…' : 'Continue to Visual Review →'}
          </button>
          <span
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '12px',
              color: '#8A8278',
            }}
          >
            ~15-20 min to generate your trailer
          </span>
        </div>
      </div>
    </div>
  )
}
