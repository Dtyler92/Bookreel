'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GlobalNav } from '@/components/shared/GlobalNav'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { PrimaryButton } from '@/components/shared/PrimaryButton'

const GENRES = [
  'Fantasy',
  'Romance',
  'Thriller',
  'Sci-Fi',
  'Mystery',
  'Horror',
  'Literary Fiction',
  'Historical Fiction',
  'Young Adult',
  'Other',
]

const LOADING_MESSAGES = [
  'Turning pages into frames…',
  'Meeting your characters…',
  'Crafting your story\'s arc…',
  'Almost ready to roll…',
]

type Step = 1 | 2 | 3

const STEPS = [
  { label: 'Book Details' },
  { label: 'Upload PDF' },
  { label: 'Processing' },
]

// ─── Shared input style ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FAFAF7',
  border: '1.5px solid #E8E2D5',
  borderRadius: '8px',
  padding: '12px 14px',
  fontFamily: 'var(--font-inter), sans-serif',
  fontSize: '15px',
  color: '#1A1A18',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-inter), sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#8A8278',
  marginBottom: '6px',
}

const fieldStyle: React.CSSProperties = {
  marginBottom: '20px',
}

// ─── Focus management ────────────────────────────────────────────────────────

function useFocusStyle() {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#C8402F'
    e.target.style.boxShadow = '0 0 0 3px rgba(200,64,47,0.10)'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#E8E2D5'
    e.target.style.boxShadow = 'none'
  }
  return { onFocus: handleFocus, onBlur: handleBlur }
}

export default function UploadPage() {
  const router = useRouter()
  const focusHandlers = useFocusStyle()

  // Step state
  const [step, setStep] = useState<Step>(1)

  // Step 1 fields
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [amazonLink, setAmazonLink] = useState('')
  const [storeLink, setStoreLink] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  // Author name + pen names
  const [authorName, setAuthorName] = useState('')
  const [penNames, setPenNames] = useState<string[]>([])
  const [showAddPenName, setShowAddPenName] = useState(false)
  const [newPenName, setNewPenName] = useState('')
  const [savingPenName, setSavingPenName] = useState(false)

  // Fetch user's real name + pen names on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, pen_names')
        .eq('id', user.id)
        .single()
      const fullName = profile?.full_name ?? (user.user_metadata?.full_name as string) ?? ''
      setAuthorName(fullName)
      setPenNames(profile?.pen_names ?? [])
    }
    fetchProfile()
  }, [])

  const handleAddPenName = async () => {
    const trimmed = newPenName.trim()
    if (!trimmed) return
    setSavingPenName(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const updated = [...penNames, trimmed]
      await supabase.from('profiles').update({ pen_names: updated }).eq('id', user.id)
      setPenNames(updated)
      setAuthorName(trimmed)
      setNewPenName('')
      setShowAddPenName(false)
    } finally {
      setSavingPenName(false)
    }
  }

  // Step 2 fields
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [bookId, setBookId] = useState<string | null>(null)

  // Rotating loading messages
  useEffect(() => {
    if (!uploading) return
    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [uploading])

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const handleStep1Next = () => {
    if (!title.trim()) return
    setStep(2)
  }

  // ── Cover handlers ────────────────────────────────────────────────────────
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setCoverError('File must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCoverPreview(reader.result as string)
      setCoverError(null)
    }
    reader.readAsDataURL(f)
  }

  const handleGenerateCover = async () => {
    if (!title.trim()) {
      setCoverError('Enter a book title first')
      return
    }
    setGeneratingCover(true)
    setCoverError(null)
    try {
      const res = await fetch('/api/books/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, genre: genre || 'Fiction', description }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to generate cover')
      }
      const data = await res.json()
      setCoverPreview(data.imageUrl)
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : 'Failed to generate cover')
    } finally {
      setGeneratingCover(false)
    }
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const handleDragLeave = () => setDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    const droppedName = dropped?.name.toLowerCase()
    const isAccepted = dropped && (
      dropped.type === 'application/pdf' ||
      dropped.type === 'application/epub+zip' ||
      dropped.type === 'application/epub' ||
      dropped.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      dropped.type === 'application/rtf' ||
      dropped.type === 'text/rtf' ||
      dropped.type === 'text/plain' ||
      dropped.type === 'text/txt' ||
      droppedName?.endsWith('.pdf') ||
      droppedName?.endsWith('.epub') ||
      droppedName?.endsWith('.docx') ||
      droppedName?.endsWith('.rtf') ||
      droppedName?.endsWith('.txt')
    )
    if (isAccepted) {
      setFile(dropped)
      setUploadError(null)
    } else {
      setUploadError('Please upload a PDF, EPUB, DOCX, RTF, or plain text (.txt) file.')
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    const selectedName = selected?.name.toLowerCase()
    const isAccepted = selected && (
      selected.type === 'application/pdf' ||
      selected.type === 'application/epub+zip' ||
      selected.type === 'application/epub' ||
      selected.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      selected.type === 'application/rtf' ||
      selected.type === 'text/rtf' ||
      selected.type === 'text/plain' ||
      selected.type === 'text/txt' ||
      selectedName?.endsWith('.pdf') ||
      selectedName?.endsWith('.epub') ||
      selectedName?.endsWith('.docx') ||
      selectedName?.endsWith('.rtf') ||
      selectedName?.endsWith('.txt')
    )
    if (isAccepted) {
      setFile(selected)
      setUploadError(null)
    } else if (selected) {
      setUploadError('Please upload a PDF, EPUB, DOCX, RTF, or plain text (.txt) file.')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setLoadingMsgIndex(0)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('genre', genre)
      formData.append('description', description)
      formData.append('amazon_link', amazonLink)
      formData.append('store_link', storeLink)
      formData.append('pdf', file)

      const res = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Upload failed (${res.status})`)
      }

      const data = await res.json()
      const newBookId = data.bookId ?? data.id ?? null
      setBookId(newBookId)
      // Go straight to book hub — no intermediate success screen needed
      if (newBookId) {
        router.push(`/book/${newBookId}`)
      } else {
        setStep(3)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7' }}>
      <GlobalNav />

      {/* Loading Overlay */}
      {uploading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(250,250,247,0.95)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
        }}>
          <BrandLogo size={32} />

          {/* Progress bar */}
          <div style={{
            width: 'min(280px, 80vw)',
            height: '4px',
            background: '#E8E2D5',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: '#C8402F',
              borderRadius: '4px',
              animation: 'progressFill 8s ease-in-out infinite',
            }} />
          </div>

          {/* Message */}
          <p style={{
            fontFamily: 'var(--font-playfair), serif',
            fontStyle: 'italic',
            fontSize: '18px',
            color: '#8A8278',
            margin: 0,
            transition: 'opacity 0.5s ease',
          }}>
            {LOADING_MESSAGES[loadingMsgIndex]}
          </p>

          <style>{`
            @keyframes progressFill {
              0% { width: 0%; }
              20% { width: 30%; }
              50% { width: 60%; }
              80% { width: 85%; }
              95% { width: 92%; }
              100% { width: 96%; }
            }
          `}</style>
        </div>
      )}

      <main style={{
        paddingTop: '88px',
        maxWidth: '680px',
        margin: '0 auto',
        padding: '88px 24px 48px',
      }}>
        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          marginBottom: '40px',
        }}>
          {STEPS.map((s, i) => {
            const stepNum = (i + 1) as Step
            const isActive = step === stepNum
            const isCompleted = step > stepNum

            const circleStyle: React.CSSProperties = {
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              flexShrink: 0,
              ...(isActive ? {
                background: '#C8402F',
                color: '#FAFAF7',
                border: 'none',
                boxShadow: '0 0 0 4px rgba(200,64,47,0.15)',
              } : isCompleted ? {
                background: '#FAFAF7',
                color: '#C8402F',
                border: '2px solid #C8402F',
              } : {
                background: '#EDE9E0',
                color: '#8A8278',
                border: '2px solid #E8E2D5',
              }),
            }

            return (
              <div key={stepNum} style={{ display: 'flex', alignItems: 'flex-start', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={circleStyle}>
                    {isCompleted ? '✓' : stepNum}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: isActive ? '#C8402F' : '#8A8278',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    height: '2px',
                    flex: 1,
                    background: isCompleted ? '#C8402F' : '#E8E2D5',
                    marginTop: '17px',
                    marginLeft: '8px',
                    marginRight: '8px',
                    transition: 'background 300ms ease',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Book Details ─────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: '12px',
            padding: '28px 20px',
          }}>
            <h1 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '24px',
              color: '#0D0D0B',
              margin: '0 0 8px',
            }}>
              Tell us about your book.
            </h1>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              color: '#8A8278',
              margin: '0 0 28px',
            }}>
              A few quick details help us shape your trailer.
            </p>

            {/* Book Title */}
            <div style={fieldStyle}>
              <label htmlFor="title" style={labelStyle}>
                Book Title <span style={{ color: '#C8402F' }}>*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Name of the Wind"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>

            {/* Author Name */}
            <div style={fieldStyle}>
              <label htmlFor="author_name" style={labelStyle}>
                Author Name <span style={{ color: '#C8402F' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  id="author_name"
                  value={authorName}
                  onChange={(e) => {
                    if (e.target.value === '__add__') { setShowAddPenName(true) }
                    else { setAuthorName(e.target.value); setShowAddPenName(false) }
                  }}
                  style={{ ...inputStyle, appearance: 'auto', flex: 1 }}
                  {...focusHandlers}
                >
                  {authorName && <option value={authorName}>{authorName}</option>}
                  {penNames.filter(p => p !== authorName).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="__add__">+ Add a pen name…</option>
                </select>
              </div>
              {/* Inline pen name input */}
              {showAddPenName && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newPenName}
                    onChange={(e) => setNewPenName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPenName() } }}
                    placeholder="e.g. J.K. Rowling"
                    style={{ ...inputStyle, flex: 1 }}
                    autoFocus
                    {...focusHandlers}
                  />
                  <button
                    type="button"
                    onClick={handleAddPenName}
                    disabled={savingPenName || !newPenName.trim()}
                    style={{
                      background: '#C8402F', color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '12px 18px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                      opacity: savingPenName || !newPenName.trim() ? 0.5 : 1,
                    }}
                  >
                    {savingPenName ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddPenName(false); setNewPenName('') }}
                    style={{
                      background: 'none', border: '1.5px solid #E8E2D5',
                      borderRadius: '8px', padding: '12px 14px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '14px', color: '#8A8278', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: '#8A8278', marginTop: '6px' }}>
                This will appear on your book cover and trailer.
              </p>
            </div>

            {/* Genre */}
            <div style={fieldStyle}>
              <label htmlFor="genre" style={labelStyle}>
                Genre
              </label>
              <select
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                style={{ ...inputStyle, appearance: 'auto' }}
                {...focusHandlers}
              >
                <option value="">Select a genre…</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div style={fieldStyle}>
              <label htmlFor="description" style={labelStyle}>
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief synopsis of your book…"
                style={{ ...inputStyle, resize: 'none' }}
                {...focusHandlers}
              />
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '12px',
                color: '#8A8278',
                textAlign: 'right',
                marginTop: '4px',
              }}>
                {description.length}/500
              </p>
            </div>

            {/* Amazon Link */}
            <div style={fieldStyle}>
              <label htmlFor="amazon" style={labelStyle}>
                Amazon Link <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                id="amazon"
                type="url"
                value={amazonLink}
                onChange={(e) => setAmazonLink(e.target.value)}
                placeholder="https://amazon.com/dp/..."
                style={inputStyle}
                {...focusHandlers}
              />
            </div>

            {/* Author Store Link */}
            <div style={{ ...fieldStyle, marginBottom: '28px' }}>
              <label htmlFor="store" style={labelStyle}>
                Author Store Link <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                id="store"
                type="url"
                value={storeLink}
                onChange={(e) => setStoreLink(e.target.value)}
                placeholder="https://yourstore.com/..."
                style={inputStyle}
                {...focusHandlers}
              />
            </div>

            <PrimaryButton
              fullWidth
              onClick={handleStep1Next}
              disabled={!title.trim()}
            >
              Continue →
            </PrimaryButton>
          </div>
        )}

        {/* ── STEP 2: Upload PDF ───────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: '12px',
            padding: '28px 20px',
          }}>
            <h1 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '24px',
              color: '#0D0D0B',
              margin: '0 0 8px',
            }}>
              Upload your manuscript.
            </h1>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              color: '#8A8278',
              margin: '0 0 24px',
            }}>
              Only your manuscript is used — nothing else.
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2.5px dashed ${dragging ? '#C8402F' : '#E8E2D5'}`,
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                background: dragging ? 'rgba(200,64,47,0.03)' : '#FAFAF7',
                cursor: 'pointer',
                transition: 'border-color 150ms ease, background 150ms ease',
                marginBottom: '20px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.epub,.docx,.rtf,.txt,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,text/plain"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ fontSize: '40px', color: '#8A8278', marginBottom: '12px' }}>
                {file ? '📄' : '⬆'}
              </div>
              {file ? (
                <div>
                  <p style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: '20px',
                    color: '#0D0D0B',
                    margin: '0 0 4px',
                    fontWeight: 700,
                  }}>
                    {file.name}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '14px',
                    color: '#8A8278',
                    margin: '0 0 8px',
                  }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '13px',
                      color: '#C8402F',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '10px 8px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#0D0D0B',
                    margin: '0 0 6px',
                  }}>
                    Tap or click to upload your manuscript
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '13px',
                    color: '#B0A898',
                    margin: '0 0 4px',
                    fontStyle: 'italic',
                  }}>
                    Drag &amp; drop also works on desktop
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '14px',
                    color: '#8A8278',
                    margin: '0 0 6px',
                  }}>
                    PDF or TXT up to 50MB
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '12px',
                    color: '#B0A898',
                    margin: 0,
                    fontStyle: 'italic',
                  }}>
                    Tip: Export directly from Word or Google Docs for best results
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {uploadError && (
              <div style={{
                borderRadius: '8px',
                background: 'rgba(200,64,47,0.06)',
                border: '1px solid rgba(200,64,47,0.25)',
                padding: '12px 16px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                color: '#C8402F',
                marginBottom: '16px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}>
                <span style={{ flexShrink: 0, fontSize: '16px' }}>⚠️</span>
                <span>{uploadError}</span>
              </div>
            )}

            {/* Back + Upload buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStep(1)}
                disabled={uploading}
                style={{
                  flex: 1,
                  background: '#FAFAF7',
                  border: '1.5px solid #E8E2D5',
                  borderRadius: '8px',
                  padding: '14px 24px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  color: '#1A1A18',
                  cursor: 'pointer',
                  opacity: uploading ? 0.55 : 1,
                  minHeight: '44px',
                }}
              >
                ← Back
              </button>
              <PrimaryButton
                style={{ flex: 2, minHeight: '44px' }}
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                Upload &amp; Build My Trailer
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: '12px',
            padding: '28px 20px',
            textAlign: 'center',
          }}>
            {/* Checkmark circle */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(200,64,47,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 28px',
            }}>
              <span style={{
                color: '#C8402F',
                fontSize: '36px',
                lineHeight: 1,
              }}>
                ✓
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '28px',
              color: '#0D0D0B',
              margin: '0 0 12px',
            }}>
              Your manuscript is ready.
            </h1>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              color: '#8A8278',
              margin: '0 0 32px',
              maxWidth: '360px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              We&apos;ve analyzed your book and found your key characters and scenes.
            </p>

            <PrimaryButton
              fullWidth
              onClick={() => {
                if (bookId) {
                  router.push(`/book/${bookId}`)
                } else {
                  router.push('/dashboard')
                }
              }}
            >
              Go to My Book →
            </PrimaryButton>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => {
                  if (bookId) {
                    router.push(`/review/${bookId}`)
                  } else {
                    router.push('/dashboard')
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '14px',
                  color: '#8A8278',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '12px 0',
                }}
              >
                Skip — Review My Story →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

