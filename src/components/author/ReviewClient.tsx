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

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string | null }) {
  const r = (role ?? '').toLowerCase()
  const styles =
    r === 'protagonist'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : r === 'antagonist'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles}`}>
      {role ?? 'Supporting'}
    </span>
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
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(character.name)
  const [role, setRole] = useState(character.role ?? '')
  const [description, setDescription] = useState(character.description ?? '')
  const [appearance, setAppearance] = useState(character.appearance_notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/books/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'character',
          id: character.id,
          name,
          role,
          description,
          appearance_notes: appearance,
        }),
      })
      if (res.ok) {
        onUpdate(character.id, { name, role, description, appearance_notes: appearance })
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

  return (
    <div
      className={`rounded-xl border bg-white dark:bg-gray-900 p-5 space-y-3 transition-colors ${
        approved
          ? 'border-green-300 dark:border-green-700'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="protagonist">Protagonist</option>
              <option value="antagonist">Antagonist</option>
              <option value="supporting">Supporting</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Appearance</label>
            <textarea
              rows={2}
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-white">{character.name}</h3>
                <RoleBadge role={character.role} />
              </div>
              {character.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{character.description}</p>
              )}
              {character.appearance_notes && (
                <p className="text-xs text-gray-500 dark:text-gray-500 italic">{character.appearance_notes}</p>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <input
              type="checkbox"
              id={`char-approve-${character.id}`}
              checked={approved}
              onChange={(e) => handleApproveChange(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor={`char-approve-${character.id}`}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer"
            >
              Approve character
            </label>
            {approved && <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">✓ Approved</span>}
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
      className={`rounded-xl border bg-white dark:bg-gray-900 p-5 space-y-3 transition-colors ${
        approved
          ? 'border-green-300 dark:border-green-700'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
          {scene.scene_number}
        </span>
        <div className="flex-1 min-w-0">
          {scene.title && (
            <h3 className="font-semibold text-gray-900 dark:text-white">{scene.title}</h3>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{scene.description}</p>
        </div>
      </div>

      {scene.screenplay_text && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
          >
            <span>{expanded ? '▲' : '▼'}</span>
            {expanded ? 'Hide screenplay' : 'View screenplay'}
          </button>
          {expanded && (
            <pre className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {scene.screenplay_text}
            </pre>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <input
          type="checkbox"
          id={`scene-approve-${scene.id}`}
          checked={approved}
          onChange={(e) => handleApproveChange(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label
          htmlFor={`scene-approve-${scene.id}`}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer"
        >
          Approve scene
        </label>
        {approved && <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">✓ Approved</span>}
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
      router.push(`/dashboard/review-images/${bookId}`)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to navigate.')
      setGenerating(false)
    }
  }

  const totalItems = characters.length + scenes.length
  const approvedItems = approvedCharacters.size + approvedScenes.size

  return (
    <div className="space-y-10 pb-32">
      {/* ── Characters ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your Characters
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({approvedCharacters.size}/{characters.length} approved)
              </span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              These are the characters we found in your manuscript. Confirm the ones you&apos;d like featured in your trailer.
            </p>
          </div>
        </div>
        {characters.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No characters found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
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

      {/* ── Scenes ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your Key Scenes
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({approvedScenes.size}/{scenes.length} approved)
              </span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              These are the moments from your book that we think will resonate most on screen. Keep the ones that feel right, swap any that don&apos;t.
            </p>
          </div>
        </div>
        {scenes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No scenes found.</p>
        ) : (
          <div className="space-y-4">
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

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          {/* Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {approvedItems} of {totalItems} items approved
              </span>
              {allApproved && (
                <span className="text-xs text-green-600 dark:text-green-400 font-semibold">All approved! 🎉</span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: totalItems > 0 ? `${(approvedItems / totalItems) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Generate button */}
          <div className="shrink-0 text-right">
            {generateError && (
              <p className="text-xs text-red-500 mb-1">{generateError}</p>
            )}
            <button
              onClick={handleGenerate}
              disabled={!allApproved || generating}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Opening…
                </span>
              ) : (
                'Continue to Visual Review →'
              )}
            </button>
            <p className="text-xs text-gray-400 mt-1">Your trailer usually takes 15–20 minutes to produce.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
