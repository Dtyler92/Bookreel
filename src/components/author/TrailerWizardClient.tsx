'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReviewClient from './ReviewClient'
import ReviewImagesClient from './ReviewImagesClient'

type WizardStep = 'screenplay' | 'images' | 'confirm'

interface Props {
  book: any
  trailer: any
  initialCharacters: any[]
  initialItems: any[]
  initialScenes: any[]
  userId: string
}

export default function TrailerWizardClient({
  book,
  trailer,
  initialCharacters,
  initialItems,
  initialScenes,
  userId,
}: Props) {
  const router = useRouter()

  const allScenesApproved =
    initialScenes.length > 0 && initialScenes.every((s: any) => s.author_approved)
  const allImagesApproved =
    initialCharacters.length > 0 && initialCharacters.every((c: any) => c.author_approved)

  const getInitialStep = (): WizardStep => {
    // Everything already approved — show confirm screen so author can actually trigger generation
    if (allScenesApproved && allImagesApproved) return 'confirm'
    if (allScenesApproved) return 'images'
    return 'screenplay'
  }

  const [step, setStep] = useState<WizardStep>(getInitialStep)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      // Mark images approved on trailer record
      await fetch('/api/books/mark-images-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      })
      // Kick off generation
      const res = await fetch('/api/books/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, ...(userId ? { userId } : {}) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data?.error ?? `Generation failed (${res.status})`)
      }
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.')
      setGenerating(false)
    }
  }

  const steps = [
    { key: 'screenplay', label: 'Screenplay', icon: '📝' },
    { key: 'images',     label: 'Characters',  icon: '👥' },
    { key: 'confirm',    label: 'Generate',    icon: '🎬' },
  ]
  const stepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Step indicator */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
            Trailer Creation Wizard
          </p>
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const isDone = i < stepIndex
              const isCurrent = i === stepIndex
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isDone    ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    isCurrent ? 'bg-red-600/20 text-red-400 border border-red-500/40' :
                                'bg-white/5 text-white/30 border border-white/10'
                  }`}>
                    {isDone ? '✓' : s.icon} {s.label}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-px w-6 ${i < stepIndex ? 'bg-green-500/50' : 'bg-white/10'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Screenplay step */}
      {step === 'screenplay' && (
        <ReviewClient
          bookId={book.id}
          bookTitle={book.title}
          initialScenes={initialScenes}
          initialCharacters={initialCharacters}
          wizardMode
          onWizardComplete={() => setStep('images')}
        />
      )}

      {/* Images step */}
      {step === 'images' && (
        <div>
          {allScenesApproved && (
            <div className="max-w-4xl mx-auto px-4 pt-4">
              <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                ✓ Screenplay approved — now review your character images before generating
              </div>
            </div>
          )}
          <ReviewImagesClient
            bookId={book.id}
            bookTitle={book.title}
            bookGenre={book.genre}
            initialCharacters={initialCharacters}
            initialItems={initialItems}
            userId={userId}
            wizardMode
            onWizardComplete={() => setStep('confirm')}
          />
        </div>
      )}

      {/* Confirm + generate step */}
      {step === 'confirm' && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 gap-6">
          {/* Green checkmarks */}
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-green-400 text-sm">
              <span>✓</span> Screenplay approved
            </div>
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-green-400 text-sm">
              <span>✓</span> Character images approved
            </div>
          </div>

          <div className="text-center max-w-sm">
            <h2 className="text-white text-2xl font-bold mb-2">Ready to generate</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Your screenplay and character images are approved. Our cinematic engine will craft your trailer — usually ready in 15–20 minutes.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center max-w-sm">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#C8402F] hover:bg-[#A8321F] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                Queuing your trailer…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                Generate Trailer
              </>
            )}
          </button>

          <button
            onClick={() => router.push(`/book/${book.id}`)}
            className="text-white/30 text-sm hover:text-white/50 transition-colors"
          >
            ← Back to Book Hub
          </button>
        </div>
      )}
    </div>
  )
}
