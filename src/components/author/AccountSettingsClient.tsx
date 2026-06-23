'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#E8E2D5] p-6 mb-5">
      <h2 className="text-base font-semibold text-[#2B2B2B] mb-5">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-[#E8E2D5] px-3 py-2.5 text-sm text-[#2B2B2B] bg-white focus:outline-none focus:border-[#C8402F] transition-colors placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-50 ${props.className ?? ''}`}
    />
  )
}

function SaveButton({ loading, saved, onClick, label = 'Save Changes' }: { loading: boolean; saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mt-4 px-5 py-2.5 rounded-lg bg-[#0D0D0B] text-white text-sm font-semibold hover:bg-[#2B2B2B] disabled:opacity-50 transition-colors"
    >
      {loading ? 'Saving…' : saved ? '✓ Saved!' : label}
    </button>
  )
}

export default function AccountSettingsClient({
  userId,
  email,
  fullName,
  authorPhotoUrl,
  penNames: initialPenNames,
  tier,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Author Photo ──
  const [photoUrl, setPhotoUrl] = useState<string | null>(authorPhotoUrl)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoSuccess, setPhotoSuccess] = useState(false)
  const initial = fullName?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || '?'

  // ── Profile ──
  const [firstName, setFirstName] = useState(fullName?.split(' ')[0] ?? '')
  const [lastName, setLastName] = useState(fullName?.split(' ').slice(1).join(' ') ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // ── Email ──
  const [newEmail, setNewEmail] = useState(email)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // ── Password ──
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // ── Pen Names ──
  const [penNames, setPenNames] = useState<string[]>(initialPenNames ?? [])
  const [newPenName, setNewPenName] = useState('')
  const [penNameSaving, setPenNameSaving] = useState(false)
  const [penNameSaved, setPenNameSaved] = useState(false)
  const [penNameError, setPenNameError] = useState<string | null>(null)

  // ── Delete Account ──
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Photo Upload ──
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    setPhotoSuccess(false)
    setPhotoUploading(true)
    const objectUrl = URL.createObjectURL(file)
    setPhotoUrl(objectUrl)
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const res = await fetch('/api/profile/author-photo', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setPhotoError(data.error ?? 'Upload failed'); setPhotoUrl(authorPhotoUrl) }
      else { setPhotoUrl(data.photoUrl); setPhotoSuccess(true); setTimeout(() => setPhotoSuccess(false), 3000); router.refresh() }
    } catch { setPhotoError('Network error — please try again'); setPhotoUrl(authorPhotoUrl) }
    finally { setPhotoUploading(false); e.target.value = '' }
  }

  // ── Save Profile ──
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileError(null)
    setProfileSaved(false)
    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { error } = await supabase.from('profiles').update({ full_name }).eq('id', userId)
      if (error) { setProfileError(error.message) }
      else { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); router.refresh() }
    } catch { setProfileError('Failed to save — please try again') }
    finally { setProfileSaving(false) }
  }

  // ── Save Email ──
  const handleSaveEmail = async () => {
    if (!newEmail.trim() || newEmail === email) return
    setEmailSaving(true)
    setEmailError(null)
    setEmailSaved(false)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) { setEmailError(error.message) }
      else { setEmailSaved(true); setTimeout(() => setEmailSaved(false), 5000) }
    } catch { setEmailError('Failed to update email') }
    finally { setEmailSaving(false) }
  }

  // ── Change Password ──
  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match'); return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters'); return
    }
    setPasswordSaving(true)
    setPasswordError(null)
    setPasswordSaved(false)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) { setPasswordError(error.message) }
      else {
        setPasswordSaved(true)
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
        setTimeout(() => setPasswordSaved(false), 3000)
      }
    } catch { setPasswordError('Failed to update password') }
    finally { setPasswordSaving(false) }
  }

  // ── Pen Names ──
  const handleAddPenName = () => {
    const name = newPenName.trim()
    if (!name || penNames.includes(name)) return
    setPenNames(prev => [...prev, name])
    setNewPenName('')
  }
  const handleRemovePenName = (name: string) => setPenNames(prev => prev.filter(n => n !== name))
  const handleSavePenNames = async () => {
    setPenNameSaving(true)
    setPenNameError(null)
    setPenNameSaved(false)
    try {
      const { error } = await supabase.from('profiles').update({ pen_names: penNames }).eq('id', userId)
      if (error) { setPenNameError(error.message) }
      else { setPenNameSaved(true); setTimeout(() => setPenNameSaved(false), 3000) }
    } catch { setPenNameError('Failed to save pen names') }
    finally { setPenNameSaving(false) }
  }

  // ── Delete Account ──
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/profile/delete-account', { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setDeleteError(d.error ?? 'Failed to delete account') }
      else { await supabase.auth.signOut(); router.push('/') }
    } catch { setDeleteError('Failed to delete account') }
    finally { setDeleting(false) }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2B2B2B] transition-colors mb-6">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-[#2B2B2B] mb-8" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          Account Settings
        </h1>

        {/* ── Author Photo ── */}
        <SectionCard title="Author Photo">
          <div className="flex items-center gap-5">
            <div onClick={() => fileInputRef.current?.click()} className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer flex-shrink-0 group" style={{ border: '2px solid #E8E2D5' }}>
              {photoUrl ? (
                <>
                  <Image src={photoUrl} alt="Author photo" fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">Change</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center group-hover:opacity-80 transition-opacity" style={{ background: '#0D0D0B' }}>
                  <span className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>{initial}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-3 leading-relaxed">Appears on your profile and book pages. Use a clear, professional headshot.</p>
              <button onClick={() => fileInputRef.current?.click()} disabled={photoUploading} className="px-4 py-2 rounded-lg border border-[#E8E2D5] text-sm font-semibold text-[#2B2B2B] hover:border-[#2B2B2B] disabled:opacity-50 transition-colors">
                {photoUploading ? 'Uploading…' : photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1.5">JPEG, PNG or WebP · Max 5MB</p>
              {photoError && <p className="text-xs text-red-500 mt-2">{photoError}</p>}
              {photoSuccess && <p className="text-xs text-green-600 mt-2 font-medium">✓ Photo updated!</p>}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
        </SectionCard>

        {/* ── Profile ── */}
        <SectionCard title="Profile">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
            </Field>
            <Field label="Last Name">
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
            </Field>
          </div>
          {profileError && <p className="text-xs text-red-500 mt-3">{profileError}</p>}
          <SaveButton loading={profileSaving} saved={profileSaved} onClick={handleSaveProfile} />
        </SectionCard>

        {/* ── Email ── */}
        <SectionCard title="Email Address">
          <Field label="Email">
            <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="your@email.com" />
          </Field>
          {emailSaved && <p className="text-xs text-green-600 mt-3 font-medium">✓ Check your inbox to confirm the new email address.</p>}
          {emailError && <p className="text-xs text-red-500 mt-3">{emailError}</p>}
          <SaveButton loading={emailSaving} saved={emailSaved} onClick={handleSaveEmail} label="Update Email" />
        </SectionCard>

        {/* ── Password ── */}
        <SectionCard title="Change Password">
          <div className="space-y-3">
            <Field label="Current Password">
              <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </Field>
            <Field label="New Password">
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
            </Field>
            <Field label="Confirm New Password">
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
            </Field>
          </div>
          {passwordError && <p className="text-xs text-red-500 mt-3">{passwordError}</p>}
          {passwordSaved && <p className="text-xs text-green-600 mt-3 font-medium">✓ Password updated!</p>}
          <SaveButton loading={passwordSaving} saved={passwordSaved} onClick={handleChangePassword} label="Change Password" />
        </SectionCard>

        {/* ── Pen Names ── */}
        <SectionCard title="Pen Names">
          <p className="text-sm text-gray-500 mb-4">Add author names you publish under. These appear as options when generating covers.</p>
          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
            {penNames.map(name => (
              <span key={name} className="flex items-center gap-1.5 bg-[#F0EDE6] text-[#2B2B2B] text-sm font-medium px-3 py-1 rounded-full">
                {name}
                <button onClick={() => handleRemovePenName(name)} className="text-gray-400 hover:text-red-500 transition-colors leading-none text-base">×</button>
              </span>
            ))}
            {penNames.length === 0 && <p className="text-sm text-gray-400 italic">No pen names added yet.</p>}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPenName}
              onChange={e => setNewPenName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPenName() } }}
              placeholder="Add a pen name…"
              className="flex-1"
            />
            <button onClick={handleAddPenName} disabled={!newPenName.trim()} className="px-4 py-2.5 rounded-lg bg-[#F0EDE6] text-sm font-semibold text-[#2B2B2B] hover:bg-[#E8E2D5] disabled:opacity-40 transition-colors flex-shrink-0">
              Add
            </button>
          </div>
          {penNameError && <p className="text-xs text-red-500 mt-3">{penNameError}</p>}
          <SaveButton loading={penNameSaving} saved={penNameSaved} onClick={handleSavePenNames} label="Save Pen Names" />
        </SectionCard>

        {/* ── Plan ── */}
        <SectionCard title="Subscription Plan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#2B2B2B]">{TIER_LABELS[tier] ?? tier} Plan</p>
              <p className="text-xs text-gray-500 mt-0.5">Manage your subscription and credits</p>
            </div>
            <a href="/pricing" className="px-4 py-2 rounded-lg border border-[#C8402F] text-sm font-semibold text-[#C8402F] hover:bg-[#C8402F] hover:text-white transition-colors">
              {tier === 'free' ? 'Upgrade →' : 'Manage Plan →'}
            </a>
          </div>
        </SectionCard>

        {/* ── Sign Out ── */}
        <SectionCard title="Session">
          <a href="/api/auth/signout" className="inline-block px-4 py-2 rounded-lg border border-[#E8E2D5] text-sm font-semibold text-[#2B2B2B] hover:border-[#2B2B2B] transition-colors">
            Sign Out
          </a>
        </SectionCard>

        {/* ── Danger Zone ── */}
        <section className="bg-white rounded-2xl border border-red-200 p-6 mb-5">
          <h2 className="text-base font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Permanently delete your account and all associated books, trailers, and data. This cannot be undone.
          </p>
          <Field label='Type "DELETE" to confirm'>
            <Input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="max-w-xs"
            />
          </Field>
          {deleteError && <p className="text-xs text-red-500 mt-3">{deleteError}</p>}
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== 'DELETE' || deleting}
            className="mt-4 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete My Account'}
          </button>
        </section>

      </div>
    </main>
  )
}
