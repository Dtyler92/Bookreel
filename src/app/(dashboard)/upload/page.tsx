'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

type Step = 1 | 2 | 3 | 4

const STEPS = [
  { label: 'Book Details' },
  { label: 'Upload PDF' },
  { label: 'Processing' },
  { label: 'Book Cover' },
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

  // Step 2 fields
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [bookId, setBookId] = useState<string | null>(null)

  // Step 4 — Book Cover
  const [step4CoverPreview, setStep4CoverPreview] = useState<string | null>(null)
  const [step4Generating, setStep4Generating] = useState(false)
  const [step4Uploading, setStep4Uploading] = useState(false)
  const [step4Error, setStep4Error] = useState<string | null>(null)
  const [step4DragOver, setStep4DragOver] = useState(false)
  const step4FileInputRef = useRef<HTMLInputElement>(null)

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
      dropped.type === 'text/plain' ||
      dropped.type === 'text/txt' ||
      droppedName?.endsWith('.pdf') ||
      droppedName?.endsWith('.txt')
    )
    if (isAccepted) {
      setFile(dropped)
      setUploadError(null)
    } else {
      setUploadError('Please upload a PDF or plain text (.txt) file.')
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    const selectedName = selected?.name.toLowerCase()
    const isAccepted = selected && (
      selected.type === 'application/pdf' ||
      selected.type === 'text/plain' ||
      selected.type === 'text/txt' ||
      selectedName?.endsWith('.pdf') ||
      selectedName?.endsWith('.txt')
    )
    if (isAccepted) {
      setFile(selected)
      setUploadError(null)
    } else if (selected) {
      setUploadError('Please upload a PDF or plain text (.txt) file.')
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
      setBookId(data.bookId ?? data.id ?? null)
      setStep(3)
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
            width: '280px',
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
              width: '36px',
              height: '36px',
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
            padding: '36px 40px',
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

            {/* Book Cover */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Book Cover <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={generatingCover}
                  style={{
                    background: '#F4F1EB',
                    border: '1.5px solid #E8E2D5',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#2B2B2B',
                    cursor: 'pointer',
                  }}
                >
                  📁 Upload your cover
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCover}
                  disabled={generatingCover || !title.trim()}
                  style={{
                    background: generatingCover ? '#F4F1EB' : '#C8402F',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: generatingCover ? '#8A8278' : '#FFFFFF',
                    cursor: generatingCover ? 'not-allowed' : 'pointer',
                  }}
                >
                  {generatingCover ? 'Generating…' : '✨ Generate one for me'}
                </button>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  style={{ display: 'none' }}
                  onChange={handleCoverFileChange}
                />
              </div>
              {coverError && (
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: '#C8402F', marginTop: '6px' }}>
                  {coverError}
                </p>
              )}
              {generatingCover && (
                <div style={{ width: '100%', height: 3, background: '#E8E2D5', borderRadius: 2, overflow: 'hidden', marginTop: '8px', position: 'relative' }}>
                  <style>{`@keyframes indBar{0%{left:-60%;width:60%}60%{left:100%;width:60%}100%{left:100%;width:60%}}`}</style>
                  <div style={{ position: 'absolute', height: '100%', background: '#C8402F', borderRadius: 2, animation: 'indBar 1.4s ease-in-out infinite' }} />
                </div>
              )}
              {coverPreview && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Cover preview" style={{ width: 100, height: 150, objectFit: 'cover', borderRadius: '6px', border: '1px solid #E8E2D5', boxShadow: '0 2px 8px rgba(13,13,11,0.1)' }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: '#16A34A', fontWeight: 500, margin: '0 0 6px' }}>✓ Cover selected</p>
                    <button
                      type="button"
                      onClick={() => setCoverPreview(null)}
                      style={{ background: 'none', border: 'none', fontFamily: 'var(--font-inter), sans-serif', fontSize: '12px', color: '#8A8278', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', color: '#8A8278', marginTop: '6px' }}>
                .jpg, .png, .webp — max 5MB
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
            padding: '36px 40px',
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
                padding: '60px 40px',
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
                accept=".pdf,.txt,application/pdf,text/plain"
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
                      padding: 0,
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
                    Drop your manuscript here
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '14px',
                    color: '#8A8278',
                    margin: '0 0 6px',
                  }}>
                    PDF or TXT up to 50MB — or click to browse
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
            <div style={{ display: 'flex', gap: '12px' }}>
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
                }}
              >
                ← Back
              </button>
              <PrimaryButton
                style={{ flex: 2 }}
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
            padding: '56px 40px',
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
                setStep(4)
              }}
            >
              Add a Cover →
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
                }}
              >
                Skip — Review My Story →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Book Cover ──────────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: '12px',
            padding: '40px',
          }}>
            <h1 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '28px',
              color: '#0D0D0B',
              margin: '0 0 10px',
            }}>
              Add a cover for your book.
            </h1>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              color: '#8A8278',
              margin: '0 0 32px',
            }}>
              Readers see this in the discovery feed. Make it count.
            </p>

            {step4Error && (
              <div style={{
                background: 'rgba(200,64,47,0.06)',
                border: '1px solid rgba(200,64,47,0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                color: '#C8402F',
                marginBottom: '20px',
              }}>
                {step4Error}
              </div>
            )}

            {/* Preview */}
            {step4CoverPreview && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step4CoverPreview}
                  alt="Cover preview"
                  style={{
                    width: 140,
                    height: 210,
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #E8E2D5',
                    boxShadow: '0 8px 24px rgba(13,13,11,0.12)',
                  }}
                />
              </div>
            )}

            {/* Two options side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

              {/* Option A — Upload */}
              <div style={{
                border: '1.5px dashed #E8E2D5',
                borderRadius: '12px',
                padding: '24px 20px',
                textAlign: 'center',
                background: step4DragOver ? 'rgba(200,64,47,0.03)' : '#FAFAF7',
                borderColor: step4DragOver ? '#C8402F' : '#E8E2D5',
                transition: 'all 150ms ease',
                cursor: 'pointer',
              }}
                onDragOver={(e) => { e.preventDefault(); setStep4DragOver(true) }}
                onDragLeave={() => setStep4DragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault()
                  setStep4DragOver(false)
                  const droppedFile = e.dataTransfer.files[0]
                  if (!droppedFile) return
                  if (droppedFile.size > 10 * 1024 * 1024) {
                    setStep4Error('File must be under 10MB')
                    return
                  }
                  const reader = new FileReader()
                  reader.onload = () => { setStep4CoverPreview(reader.result as string); setStep4Error(null) }
                  reader.readAsDataURL(droppedFile)
                }}
                onClick={() => step4FileInputRef.current?.click()}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
                <p style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: '#0D0D0B',
                  margin: '0 0 6px',
                }}>
                  Upload your cover
                </p>
                <p style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  color: '#8A8278',
                  margin: '0 0 16px',
                }}>
                  JPG, PNG, WebP — max 10MB
                </p>
                <button
                  type="button"
                  disabled={step4Uploading || step4Generating}
                  style={{
                    background: '#F4F1EB',
                    border: '1.5px solid #E8E2D5',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#2B2B2B',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => { e.stopPropagation(); step4FileInputRef.current?.click() }}
                >
                  Browse files
                </button>
                <input
                  ref={step4FileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.size > 10 * 1024 * 1024) { setStep4Error('File must be under 10MB'); return }
                    const reader = new FileReader()
                    reader.onload = () => { setStep4CoverPreview(reader.result as string); setStep4Error(null) }
                    reader.readAsDataURL(f)
                  }}
                />
              </div>

              {/* Option B — Generate */}
              <div style={{
                border: '1.5px solid #E8E2D5',
                borderRadius: '12px',
                padding: '24px 20px',
                textAlign: 'center',
                background: '#FAFAF7',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
                <p style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: '#0D0D0B',
                  margin: '0 0 6px',
                }}>
                  Design one for me
                </p>
                <p style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '12px',
                  color: '#8A8278',
                  margin: '0 0 16px',
                }}>
                  Our studio will craft a unique cover based on your book.
                </p>
                <button
                  type="button"
                  disabled={step4Generating || step4Uploading}
                  onClick={async () => {
                    setStep4Generating(true)
                    setStep4Error(null)
                    try {
                      const res = await fetch('/api/books/generate-cover', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          bookId: bookId ?? undefined,
                          title,
                          genre: genre || 'Fiction',
                          description,
                        }),
                      })
                      if (!res.ok) {
                        const d = await res.json().catch(() => ({}))
                        throw new Error((d as { error?: string }).error ?? 'Failed to generate cover')
                      }
                      const data = await res.json() as { imageUrl?: string; coverUrl?: string }
                      setStep4CoverPreview(data.imageUrl ?? data.coverUrl ?? null)
                    } catch (err) {
                      setStep4Error(err instanceof Error ? err.message : 'Failed to generate cover')
                    } finally {
                      setStep4Generating(false)
                    }
                  }}
                  style={{
                    background: step4Generating ? '#F4F1EB' : '#C8402F',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: step4Generating ? '#8A8278' : '#FFFFFF',
                    cursor: step4Generating ? 'not-allowed' : 'pointer',
                    width: '100%',
                  }}
                >
                  {step4Generating ? 'Designing your cover…' : 'Design My Cover'}
                </button>
                {step4Generating && (
                  <div style={{ width: '100%', height: 3, background: '#E8E2D5', borderRadius: 2, overflow: 'hidden', marginTop: '10px', position: 'relative' }}>
                    <style>{`@keyframes s4IndBar{0%{left:-60%;width:60%}60%{left:100%;width:60%}100%{left:100%;width:60%}}`}</style>
                    <div style={{ position: 'absolute', height: '100%', background: '#C8402F', borderRadius: 2, animation: 's4IndBar 1.4s ease-in-out infinite' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {step4CoverPreview ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      setStep4Uploading(true)
                      setStep4Error(null)
                      try {
                        // If the preview is a data URL (uploaded file), upload it via API
                        if (step4CoverPreview.startsWith('data:') && bookId) {
                          // Convert data URL to blob and upload
                          const res = await fetch(step4CoverPreview)
                          const blob = await res.blob()
                          const formData = new FormData()
                          formData.append('image', blob, 'cover.jpg')
                          formData.append('bookId', bookId)
                          const uploadRes = await fetch('/api/books/upload-cover', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include',
                          })
                          if (!uploadRes.ok) {
                            const d = await uploadRes.json().catch(() => ({}))
                            throw new Error((d as { error?: string }).error ?? 'Upload failed')
                          }
                        }
                        // Navigate to review page
                        if (bookId) {
                          router.push(`/review/${bookId}`)
                        } else {
                          router.push('/dashboard')
                        }
                      } catch (err) {
                        setStep4Error(err instanceof Error ? err.message : 'Failed to save cover')
                        setStep4Uploading(false)
                      }
                    }}
                    disabled={step4Uploading}
                    style={{
                      flex: 2,
                      background: step4Uploading ? '#F4F1EB' : '#C8402F',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '14px 24px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      color: step4Uploading ? '#8A8278' : '#FFFFFF',
                      cursor: step4Uploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {step4Uploading ? 'Saving…' : 'Use This Cover →'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep4CoverPreview(null); setStep4Error(null) }}
                    disabled={step4Uploading}
                    style={{
                      flex: 1,
                      background: '#FAFAF7',
                      border: '1.5px solid #E8E2D5',
                      borderRadius: '8px',
                      padding: '14px 24px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontWeight: 500,
                      fontSize: '15px',
                      color: '#8A8278',
                      cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (bookId) {
                      router.push(`/review/${bookId}`)
                    } else {
                      router.push('/dashboard')
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: '1.5px solid #E8E2D5',
                    borderRadius: '8px',
                    padding: '14px 24px',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: '#8A8278',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  Skip for now — Review My Story →
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

