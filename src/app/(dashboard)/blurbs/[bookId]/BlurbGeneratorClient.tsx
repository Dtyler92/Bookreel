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
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const red    = '#C8402F'
const dark   = '#0D0D0B'
const muted  = '#8A8278'
const cream  = '#FAFAF7'
const border = '#E8E2D5'
const card   = '#FFFFFF'

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
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 11, fontWeight: 600,
        color: copied ? '#15803D' : muted,
        transition: 'all 150ms',
        flexShrink: 0,
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
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 11, fontWeight: 600, color: loading ? muted : red,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        transition: 'all 150ms', flexShrink: 0,
        opacity: loading ? 0.6 : 1,
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

function BlurbCard({
  label, sublabel, platform, children, copyText, accent, onRegenerate, regenLoading,
}: {
  label: string
  sublabel?: string
  platform?: string
  children: React.ReactNode
  copyText: string
  accent?: string
  onRegenerate: () => void
  regenLoading: boolean
}) {
  return (
    <div style={{
      background: card, border: `1px solid ${border}`,
      borderLeft: `3px solid ${accent || red}`,
      borderRadius: 12, padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: 15, color: dark }}>
              {label}
            </span>
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

export default function BlurbGeneratorClient({ bookId, bookTitle, genre }: Props) {
  const [blurbs, setBlurbs] = useState<Blurbs | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenLoading, setRegenLoading] = useState<Partial<Record<BlurbSection, boolean>>>({})
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})

  const generate = async () => {
    setLoading(true)
    setError(null)
    setEditing({})
    try {
      const res = await fetch(`/api/books/${bookId}/blurbs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
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
      // Update only that section in blurbs, clear its edits
      setBlurbs(prev => prev ? { ...prev, [section]: data.value } : prev)
      setEditing(prev => {
        const next = { ...prev }
        // Clear all keys belonging to this section
        Object.keys(next).forEach(k => {
          if (k === section || k.startsWith(`${section}_`) || k.startsWith(section.replace('Hooks', '_').replace('Thread', '_'))) {
            delete next[k]
          }
        })
        // Clear tiktok/tweet per-item keys
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
        </div>

        {/* Generate button — only shown before first run */}
        {!blurbs && (
          <button
            onClick={generate}
            disabled={loading}
            style={{
              background: loading ? '#E8E2D5' : red,
              color: loading ? muted : '#fff',
              border: 'none', borderRadius: 10, padding: '14px 28px',
              fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 36,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              transition: 'all 180ms',
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
            {/* ── Back Cover Blurb ── */}
            <BlurbCard
              label="Back Cover Blurb"
              sublabel="Use on Amazon, your website, or anywhere readers discover your book"
              accent={red}
              copyText={getEdited('backCover', blurbs.backCover)}
              onRegenerate={() => regenerateSection('backCover')}
              regenLoading={!!regenLoading.backCover}
            >
              <textarea
                value={getEdited('backCover', blurbs.backCover)}
                onChange={e => setEdit('backCover', e.target.value)}
                rows={6}
                style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, lineHeight: 1.75, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'vertical', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }}
              />
            </BlurbCard>

            {/* ── Short Hook ── */}
            <BlurbCard
              label="Short Hook"
              sublabel="One sentence for ads, email subject lines, or anywhere you need to grab attention fast"
              accent="#7C3AED"
              copyText={getEdited('shortHook', blurbs.shortHook)}
              onRegenerate={() => regenerateSection('shortHook')}
              regenLoading={!!regenLoading.shortHook}
            >
              <textarea
                value={getEdited('shortHook', blurbs.shortHook)}
                onChange={e => setEdit('shortHook', e.target.value)}
                rows={2}
                style={{ width: '100%', fontFamily: 'var(--font-playfair), serif', fontSize: 16, lineHeight: 1.6, color: dark, fontStyle: 'italic', border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'none', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }}
              />
            </BlurbCard>

            {/* ── TikTok Hooks ── */}
            <BlurbCard
              label="TikTok Hooks"
              platform="TikTok / Reels"
              sublabel="4 opening hooks — use as captions or read them to camera on your book trailer"
              accent="#000000"
              copyText={blurbs.tiktokHooks.map((h, i) => `${i + 1}. ${getEdited(`tiktok_${i}`, h)}`).join('\n\n')}
              onRegenerate={() => regenerateSection('tiktokHooks')}
              regenLoading={!!regenLoading.tiktokHooks}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blurbs.tiktokHooks.map((hook, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, color: muted, paddingTop: 10, flexShrink: 0, width: 18 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={getEdited(`tiktok_${i}`, hook)}
                        onChange={e => setEdit(`tiktok_${i}`, e.target.value)}
                        rows={2}
                        style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.6, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', resize: 'none', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }}
                      />
                    </div>
                    <CopyButton text={getEdited(`tiktok_${i}`, hook)} />
                  </div>
                ))}
              </div>
            </BlurbCard>

            {/* ── Instagram Caption ── */}
            <BlurbCard
              label="Instagram Caption"
              platform="Instagram"
              sublabel="Ready-to-post caption with hashtags"
              accent="#E1306C"
              copyText={getEdited('instagramCaption', blurbs.instagramCaption)}
              onRegenerate={() => regenerateSection('instagramCaption')}
              regenLoading={!!regenLoading.instagramCaption}
            >
              <textarea
                value={getEdited('instagramCaption', blurbs.instagramCaption)}
                onChange={e => setEdit('instagramCaption', e.target.value)}
                rows={5}
                style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.75, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'vertical', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }}
              />
            </BlurbCard>

            {/* ── Tweet Thread ── */}
            <BlurbCard
              label="Tweet Thread"
              platform="X / Twitter"
              sublabel="4-tweet thread to announce your book"
              accent="#1DA1F2"
              copyText={blurbs.tweetThread.map((t, i) => `${i + 1}/${blurbs.tweetThread.length} ${getEdited(`tweet_${i}`, t)}`).join('\n\n')}
              onRegenerate={() => regenerateSection('tweetThread')}
              regenLoading={!!regenLoading.tweetThread}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blurbs.tweetThread.map((tweet, i) => {
                  const val = getEdited(`tweet_${i}`, tweet)
                  const overLimit = val.length > 280
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 700, color: muted, paddingTop: 10, flexShrink: 0, width: 28 }}>{i + 1}/4</span>
                      <div style={{ flex: 1 }}>
                        <textarea
                          value={val}
                          onChange={e => setEdit(`tweet_${i}`, e.target.value)}
                          rows={3}
                          style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, lineHeight: 1.6, color: dark, border: `1px solid ${overLimit ? '#FECACA' : border}`, borderRadius: 8, padding: '8px 12px', resize: 'none', outline: 'none', background: overLimit ? '#FEF2F2' : '#FAFAF7', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, color: overLimit ? '#DC2626' : muted }}>{val.length}/280</span>
                        </div>
                      </div>
                      <CopyButton text={val} />
                    </div>
                  )
                })}
              </div>
            </BlurbCard>

            {/* ── Goodreads Blurb ── */}
            <BlurbCard
              label="Goodreads Blurb"
              platform="Goodreads"
              sublabel="Third-person present tense — paste directly into your Goodreads book description"
              accent="#553B08"
              copyText={getEdited('goodreadsBlurb', blurbs.goodreadsBlurb)}
              onRegenerate={() => regenerateSection('goodreadsBlurb')}
              regenLoading={!!regenLoading.goodreadsBlurb}
            >
              <textarea
                value={getEdited('goodreadsBlurb', blurbs.goodreadsBlurb)}
                onChange={e => setEdit('goodreadsBlurb', e.target.value)}
                rows={5}
                style={{ width: '100%', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, lineHeight: 1.75, color: dark, border: `1px solid ${border}`, borderRadius: 8, padding: 14, resize: 'vertical', outline: 'none', background: '#FAFAF7', boxSizing: 'border-box' }}
              />
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
    </div>
  )
}
