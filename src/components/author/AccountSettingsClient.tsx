'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  email: string
  fullName: string
  authorPhotoUrl: string | null
  penNames: string[]
  tier: string
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  hobbyist: 'Hobbyist',
  author: 'Author',
  publisher: 'Publisher',
}

export default function AccountSettingsClient({
  email,
  fullName,
  authorPhotoUrl,
  penNames,
  tier,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photoUrl, setPhotoUrl] = useState<string | null>(authorPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const initial = fullName?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || '?'

  const handlePhotoClick = () => fileInputRef.current?.click()

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploadSuccess(false)
    setUploading(true)

    // Preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPhotoUrl(objectUrl)

    const formData = new FormData()
    formData.append('photo', file)

    try {
      const res = await fetch('/api/profile/author-photo', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed')
        setPhotoUrl(authorPhotoUrl) // revert
      } else {
        setPhotoUrl(data.photoUrl)
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 3000)
        router.refresh()
      }
    } catch {
      setUploadError('Network error — please try again')
      setPhotoUrl(authorPhotoUrl)
    } finally {
      setUploading(false)
      e.target.value = '' // reset input
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2B2B2B] transition-colors mb-6"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-[#2B2B2B] mb-8" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          Account Settings
        </h1>

        {/* Author Photo */}
        <section className="bg-white rounded-2xl border border-[#E8E2D5] p-6 mb-6">
          <h2 className="text-base font-semibold text-[#2B2B2B] mb-4">Author Photo</h2>

          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div
              onClick={handlePhotoClick}
              className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer flex-shrink-0 group"
              style={{ border: '2px solid #E8E2D5' }}
            >
              {photoUrl ? (
                <>
                  <Image
                    src={photoUrl}
                    alt="Author photo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">Change</span>
                  </div>
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center group-hover:opacity-80 transition-opacity"
                  style={{ background: '#0D0D0B' }}
                >
                  <span
                    className="text-white text-2xl font-bold"
                    style={{ fontFamily: 'var(--font-playfair), serif' }}
                  >
                    {initial}
                  </span>
                </div>
              )}
            </div>

            {/* Info + button */}
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Your author photo appears on your profile and book pages. Use a clear, professional headshot.
              </p>
              <button
                onClick={handlePhotoClick}
                disabled={uploading}
                className="px-4 py-2 rounded-lg border border-[#E8E2D5] text-sm font-semibold text-[#2B2B2B] hover:border-[#2B2B2B] disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading…' : photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="text-xs text-gray-400 mt-2">JPEG, PNG or WebP · Max 5MB</p>

              {uploadError && (
                <p className="text-xs text-red-500 mt-2">{uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="text-xs text-green-600 mt-2 font-medium">✓ Photo updated!</p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </section>

        {/* Account Info */}
        <section className="bg-white rounded-2xl border border-[#E8E2D5] p-6 mb-6">
          <h2 className="text-base font-semibold text-[#2B2B2B] mb-4">Account Info</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
              <p className="text-sm text-[#2B2B2B] mt-1">{fullName || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
              <p className="text-sm text-[#2B2B2B] mt-1">{email}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</label>
              <p className="text-sm text-[#2B2B2B] mt-1">
                {TIER_LABELS[tier] ?? tier}
                <a href="/pricing" className="ml-3 text-xs text-[#C8402F] hover:underline font-medium">Upgrade →</a>
              </p>
            </div>
            {penNames && penNames.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pen Names</label>
                <p className="text-sm text-[#2B2B2B] mt-1">{penNames.join(', ')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Sign Out */}
        <section className="bg-white rounded-2xl border border-[#E8E2D5] p-6">
          <h2 className="text-base font-semibold text-[#2B2B2B] mb-4">Session</h2>
          <a
            href="/api/auth/signout"
            className="inline-block px-4 py-2 rounded-lg border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Sign Out
          </a>
        </section>

      </div>
    </main>
  )
}
