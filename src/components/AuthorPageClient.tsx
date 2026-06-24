'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface AuthorBook {
  id:          string
  title:       string
  description: string | null
  genre:       string | null
  coverUrl:    string | null
  amazonLink:  string | null
  trailerUrl:  string | null
  thumbUrl:    string | null
}

interface AuthorProfile {
  id:          string
  displayName: string
  photoUrl:    string | null
  bookCount:   number
}

const red   = '#C8402F'
const dark  = '#0D0D0B'
const muted = '#8A8278'

export default function AuthorPageClient() {
  const params = useParams()
  const authorId = params.authorId as string

  const [author, setAuthor]   = useState<AuthorProfile | null>(null)
  const [books, setBooks]     = useState<AuthorBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!authorId) return
    fetch(`/api/author/${authorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setAuthor(d.author)
        setBooks(d.books)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [authorId])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2.5px solid rgba(200,64,47,0.25)`, borderTop: `2.5px solid ${red}`, animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, color: muted }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )

  if (error || !author) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 26, fontWeight: 700, color: dark, marginBottom: 12 }}>Author not found</h2>
        <Link href="/reel" style={{ color: red, fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>← Back to Reel</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Nav */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E8E2D5', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/reel" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 900, fontSize: 18, color: dark }}>Book</span>
            <span style={{ display: 'inline-block', width: 8, height: 8, border: `2px solid ${red}`, outline: `1px solid ${red}`, outlineOffset: 2, background: '#fff' }} />
            <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 900, fontSize: 18, color: red, fontStyle: 'italic' }}>Reel</span>
          </Link>
          <Link href="/reel" style={{ fontSize: 13, color: muted, textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to Reel
          </Link>
        </div>
      </header>

      {/* Author hero */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8E2D5', padding: '40px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Avatar */}
          {author.photoUrl ? (
            <img src={author.photoUrl} alt={author.displayName} style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #E8E2D5', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg, ${red} 0%, #8A1C10 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-playfair), serif', flexShrink: 0, border: '3px solid #E8E2D5' }}>
              {author.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: dark, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              {author.displayName}
            </h1>
            <p style={{ fontSize: 14, color: muted, margin: 0 }}>
              {author.bookCount === 1 ? '1 published book' : `${author.bookCount} published books`}
            </p>
          </div>
        </div>
      </div>

      {/* Books grid */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 20 }}>
          Books by {author.displayName}
        </p>

        {books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: muted }}>
            <p style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 20, fontStyle: 'italic' }}>No published books yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24 }}>
            {books.map(book => (
              <div key={book.id} style={{ background: '#fff', border: '1px solid #E8E2D5', borderRadius: 12, overflow: 'hidden' }}>
                {/* Cover */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: `linear-gradient(145deg, ${red} 0%, #8A1C10 100%)` }}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : book.thumbUrl ? (
                    <img src={book.thumbUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                  )}
                  {book.genre && (
                    <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(13,13,11,0.65)', color: '#FAFAF7', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-inter), sans-serif' }}>
                      {book.genre}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: 14 }}>
                  <h3 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: 15, fontWeight: 700, color: dark, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {book.title}
                  </h3>
                  {book.description && (
                    <p style={{ fontSize: 12, color: muted, margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {book.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {book.trailerUrl && (
                      <a href={`/watch/${book.id}`} style={{ display: 'block', textAlign: 'center', background: red, color: '#fff', padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
                        Watch Trailer
                      </a>
                    )}
                    {book.amazonLink && (
                      <a href={book.amazonLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', background: '#F4F1EB', color: dark, padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid #E8E2D5', fontFamily: 'var(--font-inter), sans-serif' }}>
                        Buy on Amazon
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
