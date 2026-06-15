'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  'Reading your masterpiece...',
  'Identifying your characters...',
  'Writing the screenplay...',
  'Almost ready...',
]

type Step = 1 | 2 | 3

export default function UploadPage() {
  const router = useRouter()

  // Step state
  const [step, setStep] = useState<Step>(1)

  // Step 1 fields
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [amazonLink, setAmazonLink] = useState('')
  const [storeLink, setStoreLink] = useState('')

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

  // ── Step 1 helpers ──────────────────────────────────────────────────────────
  const handleStep1Next = () => {
    if (!title.trim()) return
    setStep(2)
  }

  // ── Step 2 helpers ──────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const handleDragLeave = () => setDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped)
      setUploadError(null)
    } else {
      setUploadError('Please upload a PDF file.')
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.type === 'application/pdf') {
      setFile(selected)
      setUploadError(null)
    } else if (selected) {
      setUploadError('Please upload a PDF file.')
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <span className="text-xl">🎬</span>
            <span className="font-bold text-lg">BookReel</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Step indicator */}
        <div className="mb-10 flex items-center gap-0">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-colors ${
                  step === s
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : step > s
                    ? 'border-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    step > s ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Book Details ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book Details</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tell us about your book before we analyze it.</p>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Book Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Name of the Wind"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Genre */}
            <div className="space-y-1">
              <label htmlFor="genre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Genre
              </label>
              <select
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select a genre…</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief synopsis of your book…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-right text-gray-400">{description.length}/500</p>
            </div>

            {/* Amazon Link */}
            <div className="space-y-1">
              <label htmlFor="amazon" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Amazon Link <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="amazon"
                type="url"
                value={amazonLink}
                onChange={(e) => setAmazonLink(e.target.value)}
                placeholder="https://amazon.com/dp/..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Author Store Link */}
            <div className="space-y-1">
              <label htmlFor="store" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Author Store Link <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="store"
                type="url"
                value={storeLink}
                onChange={(e) => setStoreLink(e.target.value)}
                placeholder="https://yourstore.com/..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleStep1Next}
              disabled={!title.trim()}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── STEP 2: Upload PDF ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Your PDF</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Drop your manuscript below. We&apos;ll extract characters and scenes automatically.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer p-12 transition-colors ${
                dragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : file
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                  : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-4xl">{file ? '📄' : '☁️'}</span>
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drag & drop your PDF here, or <span className="text-indigo-600 dark:text-indigo-400">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF only · Max 50 MB</p>
                </div>
              )}
            </div>

            {/* Error */}
            {uploadError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {uploadError}
              </div>
            )}

            {/* Loading message */}
            {uploading && (
              <div className="flex items-center gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3">
                <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium transition-all">
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                disabled={uploading}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-[2] rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {uploading ? 'Analyzing…' : 'Upload & Analyze'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ──────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-12 flex flex-col items-center text-center gap-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your book has been analyzed!</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We&apos;ve identified your characters and written the screenplay. Review everything before generating your trailer.
              </p>
            </div>

            <button
              onClick={() => {
                if (bookId) {
                  router.push(`/dashboard/review/${bookId}`)
                } else {
                  router.push('/dashboard')
                }
              }}
              className="mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Review Your Characters &amp; Scenes →
            </button>

            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Back to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
