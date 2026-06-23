'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReviewClient from './ReviewClient'
import ReviewImagesClient from './ReviewImagesClient'

type WizardStep = 'screenplay' | 'images' | 'generating'

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
  const allScenesApproved =
    initialScenes.length > 0 && initialScenes.every((s: any) => s.author_approved)
  const allImagesApproved =
    initialCharacters.length > 0 && initialCharacters.every((c: any) => c.author_approved)

  const getInitialStep = (): WizardStep => {
    if (allScenesApproved && allImagesApproved) return 'generating'
    if (allScenesApproved) return 'images'
    return 'screenplay'
  }

  const router = useRouter()
  const [step, setStep] = useState<WizardStep>(getInitialStep)

  const steps = [
    { key: 'screenplay', label: 'Screenplay', icon: '📝' },
    { key: 'images', label: 'Character Images', icon: '👥' },
    { key: 'generating', label: 'Generate Trailer', icon: '🎬' },
  ]

  const stepIndex = steps.findIndex((s) => s.key === step)

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
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isDone
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : isCurrent
                        ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                        : 'bg-white/5 text-white/30 border border-white/10'
                    }`}
                  >
                    {isDone ? '✓' : s.icon} {s.label}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`h-px w-6 ${i < stepIndex ? 'bg-green-500/50' : 'bg-white/10'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
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
            onWizardComplete={() => router.push('/dashboard')}
          />
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <div className="text-6xl">🎬</div>
          <h2 className="text-2xl font-bold text-white">Everything looks great!</h2>
          <p className="text-white/60 text-center max-w-md">
            Screenplay and character images are approved. Your trailer is being created by our
            cinematic engine.
          </p>
          <div className="animate-pulse text-red-400 text-sm">Generating your trailer…</div>
          <a
            href={`/book/${book.id}`}
            className="text-white/40 text-sm hover:text-white/60 underline"
          >
            ← Back to Book Hub
          </a>
        </div>
      )}
    </div>
  )
}
