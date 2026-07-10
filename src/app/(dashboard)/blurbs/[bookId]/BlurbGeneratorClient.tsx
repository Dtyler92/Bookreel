'use client'

import { useState } from 'react'

interface Blurbs {
  backCover: string
  shortHook: string
  tiktokHooks: string[]
  instagramCaption: string
  tweetThread: string[]
  goodreadsBlurb: string
}

type BlurbSection = keyof Blurbs

interface Props {
  bookId: string
  bookTitle: string
  genre?: string | null
  savedBlurbs?: Blurbs | null
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const cream  = '#FAFAF7'
const border = '#E8E2D5'
const card   = '#FFFFFF'

// ── Best practices per section ────────────────────────────────────────────────
const BEST_PRACTICES: Record<string, { title: string; tips: string[] }> = {
  'Back Cover Blurb': {
    title: 'Back Cover Blurb — Best Practices',
    tips: [
      "🎯 Lead with your protagonist's biggest problem or desire — not backstory.",
      '⚡ Keep sentences short and punchy. Long sentences lose readers fast.',
      '❓ End with a question or unresolved tension — never reveal the ending.',
      '🎭 Match the tone to your genre: thrillers feel urgent, romance feels warm, fantasy feels epic.',
      '📏 Aim for 150-200 words. Under 100 feels thin; over 250 loses attention.',
      '🔁 Paste it into Amazon KDP, your author website, and Goodreads for maximum visibility.',
      '💡 Pro tip: Read it out loud. If it sounds awkward spoken, rewrite it.',
    ],
  },
  'Short Hook': {
    title: 'Short Hook — Best Practices',
    tips: [
      '⚡ This is your 5-second elevator pitch. Every word must earn its place.',
      '🎯 Lead with conflict or stakes — what does your hero stand to lose?',
      '🚫 Avoid "a story about" or "follows the journey of" — too generic.',
      '📣 Use this as your ad headline, email subject line, or bio tagline.',
      '🔄 Test 2-3 variations on social media and see which gets the most engagement.',
      "💡 Pro tip: The best hooks create a question in the reader's mind they need answered.",
    ],
  },
  'TikTok Hooks': {
    title: 'TikTok / Reels Hooks — Best Practices',
    tips: [
      '▶️ The first 2 seconds decide everything — start mid-action or mid-emotion.',
      '📱 Use these as text overlays on your trailer clip or read them directly to camera.',
      '🔢 Test all 4 hooks as separate posts over a week — see which performs best.',
      '🏷️ Add #BookTok, #BookRecommendations, and your genre hashtags to every post.',
      '🎵 Always use trending audio — it gets pushed to more feeds.',
      '👁️ POV hooks ("POV: you just found your new favorite book") consistently outperform plain descriptions.',
      "💡 Pro tip: Post at 7-9am or 7-9pm your audience's timezone for peak reach.",
    ],
  },
  'Instagram Caption': {
    title: 'Instagram Caption — Best Practices',
    tips: [
      '📸 Pair with your book cover photo, a flat lay, or a mood-matching aesthetic image.',
      '🔗 "Link in bio" is your CTA — make sure your bio link goes to your store or Amazon.',
      '📏 Front-load the important text — Instagram truncates after 2 lines without tapping.',
      '#️⃣ Use 5-8 hashtags max. More looks spammy; less limits reach.',
      '🗓️ Best posting times: Tuesday–Friday, 11am–1pm or 7–9pm.',
      '💬 Ask a question at the end to drive comments — the algorithm rewards engagement.',
      '💡 Pro tip: Mix genre hashtags (#FantasyBooks) with community tags (#Bookstagram, #BookLovers).',
    ],
  },
  'Tweet Thread': {
    title: 'Tweet Thread — Best Practices',
    tips: [
      '🧵 Pin your best-performing thread to your profile — new followers see it first.',
      '📊 Tweet 1 is the most important — it determines if anyone reads the rest.',
      '⏱️ Post threads Tuesday–Thursday between 9am–3pm for best visibility.',
      '🔁 End tweet should always include a direct link to buy or follow.',
      '📏 Stay under 260 characters per tweet — leaves room for retweets with comment.',
      '💬 Reply to your own thread with a book cover image — images boost impressions 3x.',
      '💡 Pro tip: Quote-tweet an already-viral book post in your genre as the opener.',
    ],
  },
  'Goodreads Blurb': {
    title: 'Goodreads Blurb — Best Practices',
    tips: [
      '📖 Goodreads readers are serious — they want specificity, not vague promises.',
      '🎭 Name your protagonist and their core conflict clearly in the first sentence.',
      '⚠️ Add a content warning at the bottom if your book has mature themes.',
      '🏷️ Make sure your Goodreads genre tags match the tone of your blurb.',
      '⭐ Ask early readers to leave a review after rating — blurbs with reviews convert better.',
      '🔗 Link your author profile to your website and other social media.',
      "💡 Pro tip: Goodreads powers Amazon's \"Customers Also Bought\" — a strong blurb here drives discovery.",
    ],
  },
}

// ── Info modal ────────────────────────────────────────────────────────────────
function InfoModal({ section, onClose }: { section: string; onClose: () => void }) {
  const content = BEST_PRACTICES[section]
  if (!content) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(13,13,11,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 16, padding: '32px',
          maxWidth: 520, width: '100%',
          boxShadow: '0 24px 64px rgba(13,13,11,0.18)',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: 20, color: dark, margin: 0, lineHeight: 1.3 }}>
            {content.title}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 20, lineHeight: 1, padding: 2, flexShrink: 0 }}>
            ✕
          </button>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {content.tips.map((tip, i) => (
            <li key={i} style={{
              fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.65, color: dark,
              background: '#FAFAF7', border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px',
            }}>
              {tip}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          style={{
            marginTop: 20, width: '100%', background: red, color: '#fff',
            border: 'none', borderRadius: 8, padding: '11px 0',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ── Reusable buttons ──────────────────────────────────────────────────────────
function InfoButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Best practices"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '1px 2px', lineHeight: 1, display: 'inline-flex', alignItems: 'center',
        color: hovered ? red : '#C4BBB0', transition: 'color 150ms',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </button>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? '#F0FDF4' : '#F4F1EB',
        border: `1px solid ${copied ? '#BBF7D0' : border}`,
        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
        fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600,
        color: copied ? '#15803D' : muted, transition: 'all 150ms', flexShrink: 0,
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function RegenerateButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Regenerate this section"
      style={{
        background: loading ? '#F4F1EB' : 'transparent',
        border: `1px solid ${border}`,
        borderRadius: 6, padding: '4px 9px', cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600,
        color: loading ? muted : red,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        transition: 'all 150ms', flexShrink: 0, opacity: loading ? 0.6 : 1,
      }}
    >
      {loading
        ? <span style={{ display: 'inline-block', width: 10, height: 10, border: `1.5px solid ${muted}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        : '↺'
      }
      {loading ? '' : 'Redo'}
    </button>
  )
}

// ── BlurbCard ─────────────────────────────────────────────────────────────────
function BlurbCard({
  label, sublabel, platform, children, copyText, accent, onRegenerate, regenLoading, onInfo,
}: {
  label: string
  sublabel?: string
  platform?: string
  children: React.ReactNode
  copyText: string
  accent?: string
  onRegenerate: () => void
  regenLoading: boolean
  onInfo: () => void
}) {
  return (
    <div style={{
      background: card, border: `1px solid ${border}`,
      borderLeft: `3px solid ${accent || red}`,
      borderRadius: 12, padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: 15, color: dark }}>
              {label}
            </span>
            <InfoButton onClick={onInfo} />
            {platform && (
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: '#F4F1EB', border: `1px solid ${border}`,
                color: muted, borderRadius: 100, padding: '2px 8px',
              }}>
                {platform}
              </span>
            )}
          </div>
          {sublabel && (
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: muted, margin: 0 }}>
              {sublabel}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <RegenerateButton onClick={onRegenerate} loading={regenLoading} />
          <CopyButton text={copyText} />
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BlurbGeneratorClient({ bookId, bookTitle, genre, savedBlurbs }: Props) {
  const [blurbs, setBlurbs] = useState<Blurbs | null>(savedBlurbs ?? null)
  const [loading, setLoading] = useState(false)
  const [regenLoading, setRegenLoading] = useState<Partial<Record<BlurbSection, boolean>>>({})
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [infoModal, setInfoModal] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Persist inline edits to DB on blur (when author clicks away from a textarea)
  const saveEdits = async (updatedBlurbs: Blurbs) => {
    setSaveStatus('saving')
    try {
      await fetch(`/api/books/${bookId}/blurbs/save`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blurbs: updatedBlurbs }),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('idle')
    }
  }

  // Merge current edits into blurbs object and save
  const handleBlur = () => {
    if (!blurbs) return
    const merged: Blurbs = {
      backCover:        editing.backCover        ?? blurbs.backCover,
      shortHook:        editing.shortHook        ?? blurbs.shortHook,
      tiktokHooks:      blurbs.tiktokHooks.map((h, i) => editing[`tiktok_${i}`] ?? h),
      instagramCaption: editing.instagramCaption ?? blurbs.instagramCaption,
      tweetThread:      blurbs.tweetThread.map((t, i) => editing[`tweet_${i}`] ?? t),
      goodreadsBlurb:   editing.goodreadsBlurb   ?? blurbs.goodreadsBlurb,
    }
    saveEdits(merged)
  }

  const generate = async () => {
    setLoading(true)
    setError(null)
    setEditing({})
    try {
      const res = await fetch(`/api/books/${bookId}/blurbs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Generation failed'); return }
      setBlurbs(data.blurbs)
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const regenerateSection = async (section: BlurbSection) => {
    setRegenLoading(prev => ({ ...prev, [section]: true }))
    try {
      const res = await fetch(`/api/books/${bookId}/blurbs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Regeneration failed'); return }
      setBlurbs(prev => prev ? { ...prev, [section]: data.value } : prev)
      setEditing(prev => {
        const next = { ...prev }
        delete next[section as string]
        if (section === 'tiktokHooks') [0,1,2,3].forEach(i => delete next[`tiktok_${i}`])
        if (section === 'tweetThread') [0,1,2,3].forEach(i => delete next[`tweet_${i}`])
        return next
      })
    } catch {
      setError('Regeneration failed — please try again.')
    } finally {
      setRegenLoading(prev => ({ ...prev, [section]: false }))
    }
  }

  const getEdited = (key: string, fallback: string) =>
    editing[key] !== undefined ? editing[key] : fallback
  const setEdit = (key: string, val: string) =>
    setEditing(prev => ({ ...prev, [key]: val }))

  return (
    <div style={{ minHeight: '100vh', background: cream, paddingTop: 80 }}>
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: red, margin: '0 0 8px' }}>
            Marketing Copy
          </p>
          <h1 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, color: dark, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Blurbs for <em>{bookTitle}</em>
          </h1>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, color: muted, margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
            Cinematically generated marketing copy tailored to your book&apos;s genre, scenes, and narrator script.
            Edit any section inline, then copy and paste wherever you need it.
          </p>
          {saveStatus !== 'idle' && (
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: saveStatus === 'saved' ? '#16A34A' : muted, margin: '8px 0 0', fontWeight: 600 }}>
              {saveStatus === 'saving' ? '⏳ Saving…' : '✓ Saved'}
            </p>
          )}
        </div>

        {/* Generate button — only shown before first run */}
        {!blurbs && (
          <button
            onClick={generate}
            disabled={loading}
            style={{
              background: loading ? '#E8E2D5' : red, color: loading ? muted : '#fff',
              border: 'none', borderRadius: 10, padding: '14px 28px',
              fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 36,
              display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'all 180ms',
              boxShadow: loading ? 'none' : '0 2px 12px rgba(200,64,47,0.25)',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: `2px solid ${muted}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Generating your copy…
              </>
            ) : '✨ Generate Marketing Copy'}
          </button>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: '#DC2626' }}>
            ⚠ {error}
          </div>
        )}

        {/* Results */}
        {blurbs && (
          <>
            {/* Back Cover Blurb */}
            <BlurbCard
              label="Back Cover Blurb"
              sublabel="Use on Amazon, your website, or anywhere readers discover your book"
              accent={red}
              copyText={getEdited('backCover', blurbs.backCover)}
              onRegenerate={() => regenerateSection('backCover')}
              regenLoading={!!regenLoading.backCover}
              onInfo={() => setInfoModal('Back Cover Blurb')}
            >
              <textarea value={getEdited('backCover', blurbs.backCover)} onChange={e => setEdit('backCover', e.target.value)} onBlur={handleBlur} rows={6}
                style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, lineHeight: 1.75, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'vertical', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }} />
            </BlurbCard>

            {/* Short Hook */}
            <BlurbCard
              label="Short Hook"
              sublabel="One sentence for ads, email subject lines, or anywhere you need to grab attention fast"
              accent="#7C3AED"
              copyText={getEdited('shortHook', blurbs.shortHook)}
              onRegenerate={() => regenerateSection('shortHook')}
              regenLoading={!!regenLoading.shortHook}
              onInfo={() => setInfoModal('Short Hook')}
            >
              <textarea value={getEdited('shortHook', blurbs.shortHook)} onChange={e => setEdit('shortHook', e.target.value)} onBlur={handleBlur} rows={2}
                style={{ width: '100%', fontFamily: 'var(--font-playfair), serif', fontSize: 16, lineHeight: 1.6, color: dark, fontStyle: 'italic', border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'none', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }} />
            </BlurbCard>

            {/* TikTok Hooks */}
            <BlurbCard
              label="TikTok Hooks"
              platform="TikTok / Reels"
              sublabel="4 opening hooks — use as captions or read them to camera on your book trailer"
              accent="#000000"
              copyText={blurbs.tiktokHooks.map((h, i) => `${i + 1}. ${getEdited(`tiktok_${i}`, h)}`).join('\n\n')}
              onRegenerate={() => regenerateSection('tiktokHooks')}
              regenLoading={!!regenLoading.tiktokHooks}
              onInfo={() => setInfoModal('TikTok Hooks')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blurbs.tiktokHooks.map((hook, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, color: muted, paddingTop: 10, flexShrink: 0, width: 18 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <textarea value={getEdited(`tiktok_${i}`, hook)} onChange={e => setEdit(`tiktok_${i}`, e.target.value)} onBlur={handleBlur} rows={2}
                        style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.6, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', resize: 'none', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }} />
                    </div>
                    <CopyButton text={getEdited(`tiktok_${i}`, hook)} />
                  </div>
                ))}
              </div>
            </BlurbCard>

            {/* Instagram Caption */}
            <BlurbCard
              label="Instagram Caption"
              platform="Instagram"
              sublabel="Ready-to-post caption with hashtags"
              accent="#E1306C"
              copyText={getEdited('instagramCaption', blurbs.instagramCaption)}
              onRegenerate={() => regenerateSection('instagramCaption')}
              regenLoading={!!regenLoading.instagramCaption}
              onInfo={() => setInfoModal('Instagram Caption')}
            >
              <textarea value={getEdited('instagramCaption', blurbs.instagramCaption)} onChange={e => setEdit('instagramCaption', e.target.value)} onBlur={handleBlur} rows={5}
                style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.75, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'vertical', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }} />
            </BlurbCard>

            {/* Tweet Thread */}
            <BlurbCard
              label="Tweet Thread"
              platform="X / Twitter"
              sublabel="4-tweet thread to announce your book"
              accent="#1DA1F2"
              copyText={blurbs.tweetThread.map((t, i) => `${i + 1}/${blurbs.tweetThread.length} ${getEdited(`tweet_${i}`, t)}`).join('\n\n')}
              onRegenerate={() => regenerateSection('tweetThread')}
              regenLoading={!!regenLoading.tweetThread}
              onInfo={() => setInfoModal('Tweet Thread')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blurbs.tweetThread.map((tweet, i) => {
                  const val = getEdited(`tweet_${i}`, tweet)
                  const over = val.length > 280
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, color: muted, paddingTop: 10, flexShrink: 0, width: 28 }}>{i + 1}/4</span>
                      <div style={{ flex: 1 }}>
                        <textarea value={val} onChange={e => setEdit(`tweet_${i}`, e.target.value)} onBlur={handleBlur} rows={3}
                          style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.6, color: dark, border: `1px solid ${over ? '#FECACA' : border}`, borderRadius: 8, padding: '8px 12px', resize: 'none', outline: 'none', background: over ? '#FEF2F2' : '#FAFAF7', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, color: over ? '#DC2626' : muted }}>{val.length}/280</span>
                        </div>
                      </div>
                      <CopyButton text={val} />
                    </div>
                  )
                })}
              </div>
            </BlurbCard>

            {/* Goodreads Blurb */}
            <BlurbCard
              label="Goodreads Blurb"
              platform="Goodreads"
              sublabel="Third-person present tense — paste directly into your Goodreads book description"
              accent="#553B08"
              copyText={getEdited('goodreadsBlurb', blurbs.goodreadsBlurb)}
              onRegenerate={() => regenerateSection('goodreadsBlurb')}
              regenLoading={!!regenLoading.goodreadsBlurb}
              onInfo={() => setInfoModal('Goodreads Blurb')}
            >
              <textarea value={getEdited('goodreadsBlurb', blurbs.goodreadsBlurb)} onChange={e => setEdit('goodreadsBlurb', e.target.value)} onBlur={handleBlur} rows={5}
                style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, lineHeight: 1.75, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'vertical', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }} />
            </BlurbCard>

            {/* Copy all */}
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <CopyButton text={[
                `BACK COVER\n${getEdited('backCover', blurbs.backCover)}`,
                `SHORT HOOK\n${getEdited('shortHook', blurbs.shortHook)}`,
                `TIKTOK HOOKS\n${blurbs.tiktokHooks.map((h, i) => `${i+1}. ${getEdited(`tiktok_${i}`, h)}`).join('\n')}`,
                `INSTAGRAM\n${getEdited('instagramCaption', blurbs.instagramCaption)}`,
                `TWEET THREAD\n${blurbs.tweetThread.map((t, i) => `${i+1}/4 ${getEdited(`tweet_${i}`, t)}`).join('\n\n')}`,
                `GOODREADS\n${getEdited('goodreadsBlurb', blurbs.goodreadsBlurb)}`,
              ].join('\n\n---\n\n')} />
            </div>
          </>
        )}

        {/* Empty state */}
        {!blurbs && !loading && (
          <div style={{ background: card, border: `1px dashed ${border}`, borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✍️</div>
            <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: 20, color: dark, margin: '0 0 10px' }}>
              Ready to write your blurbs
            </h2>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, color: muted, margin: '0 0 4px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              Click the button above to generate back cover copy, TikTok hooks, Instagram captions, tweets, and a Goodreads blurb — all tailored to <strong>{bookTitle}</strong>.
            </p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: muted, margin: '12px 0 0' }}>
              Everything is editable. Copy individual sections or grab them all at once.
            </p>
          </div>
        )}

      </main>

      {/* Info modal */}
      {infoModal && <InfoModal section={infoModal} onClose={() => setInfoModal(null)} />}
    </div>
  )
}
