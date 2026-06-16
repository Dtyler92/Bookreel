import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'BookReel — Read them before everyone else does.',
  description: 'Watch trailers from independent and emerging authors. Find your next obsession before the rest of the world does.',
}

const GENRES = [
  'All',
  'Fantasy',
  'Romance',
  'Thriller',
  'Sci-Fi',
  'Mystery',
  'Horror',
  'Literary Fiction',
  'Historical Fiction',
  'Young Adult',
]

interface BookWithTrailer {
  id: string
  title: string
  genre: string | null
  description: string | null
  cover_image_url: string | null
  author_id: string
  trailerUrl: string | null
  thumbnailUrl: string | null
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>
}) {
  const { genre: selectedGenre } = await searchParams
  const activeGenre = selectedGenre ?? 'All'

  const supabase = await createClient()

  // Fetch published books with complete trailers
  type BookRow = {
    id: string
    title: string
    genre: string | null
    description: string | null
    cover_image_url: string | null
    author_id: string
    trailers: Array<{ status: string; final_video_url: string | null; thumbnail_url: string | null }> | null
  }

  let query = supabase
    .from('books')
    .select('id, title, genre, description, cover_image_url, author_id, trailers(status, final_video_url, thumbnail_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (activeGenre !== 'All') {
    query = query.eq('genre', activeGenre)
  }

  const { data: booksRaw } = await query

  const books: BookWithTrailer[] = ((booksRaw ?? []) as BookRow[])
    .map((b) => {
      const trailers = b.trailers ?? []
      const complete = trailers.find((t) => t.status === 'complete')
      return {
        id: b.id,
        title: b.title,
        genre: b.genre,
        description: b.description,
        cover_image_url: b.cover_image_url,
        author_id: b.author_id,
        trailerUrl: complete?.final_video_url ?? null,
        thumbnailUrl: complete?.thumbnail_url ?? null,
      }
    })
    // Only show books that have a completed trailer
    .filter((b) => b.trailerUrl)

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Nav */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E8E2D5', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 900, fontSize: '20px', color: '#0D0D0B' }}>Book</span>
            <span style={{ display: 'inline-block', width: '9px', height: '9px', border: '2px solid #C8402F', outline: '1px solid #C8402F', outlineOffset: '2px', background: '#FFFFFF' }} />
            <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 900, fontSize: '20px', color: '#C8402F', fontStyle: 'italic' }}>Reel</span>
          </Link>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link href="/login" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#8A8278', textDecoration: 'none' }}>Sign In</Link>
            <Link href="/signup" style={{ background: '#C8402F', color: '#FFFFFF', padding: '8px 18px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
              For Authors →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: '#FFFFFF', padding: '64px 24px 48px', textAlign: 'center', borderBottom: '1px solid #E8E2D5' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 900,
            fontSize: 'clamp(32px, 5vw, 56px)',
            color: '#0D0D0B',
            lineHeight: 1.1,
            marginBottom: '20px',
            letterSpacing: '-0.02em',
          }}>
            They&rsquo;re not famous yet. That&rsquo;s the point.
          </h1>
          <p style={{
            fontFamily: 'var(--font-playfair), serif',
            fontStyle: 'italic',
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: '#5C564E',
            lineHeight: 1.65,
            maxWidth: '560px',
            margin: '0 auto',
          }}>
            Watch trailers from independent and emerging authors. Find your next obsession before the rest of the world does.
          </p>
        </div>
      </section>

      {/* Genre filter */}
      <section style={{ background: '#FFFFFF', padding: '0 24px', borderBottom: '1px solid #E8E2D5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '16px' }}>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#8A8278',
            marginBottom: '12px',
            marginTop: '16px',
          }}>
            Find Your Next Discovery
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {GENRES.map((g) => (
              <Link
                key={g}
                href={g === 'All' ? '/browse' : `/browse?genre=${encodeURIComponent(g)}`}
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontWeight: 500,
                  textDecoration: 'none',
                  background: activeGenre === g ? '#C8402F' : '#F4F1EB',
                  color: activeGenre === g ? '#FFFFFF' : '#5C564E',
                  border: `1.5px solid ${activeGenre === g ? '#C8402F' : '#E8E2D5'}`,
                  transition: 'all 150ms ease',
                }}
              >
                {g}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Book grid */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '28px',
              color: '#0D0D0B',
              marginBottom: '16px',
            }}>
              Nothing here yet — but great taste is patient.
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '16px',
              color: '#8A8278',
              maxWidth: '400px',
              margin: '0 auto',
              lineHeight: 1.65,
            }}>
              This genre is still filling up. The authors who&rsquo;ll define it are uploading right now.
            </p>
            <Link
              href="/browse"
              style={{
                display: 'inline-block',
                marginTop: '32px',
                background: '#C8402F',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'var(--font-inter), sans-serif',
                textDecoration: 'none',
              }}
            >
              Browse all genres
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '28px',
          }}>
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E8E2D5', background: '#FFFFFF', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-playfair), serif',
          fontStyle: 'italic',
          fontSize: '15px',
          color: '#8A8278',
          margin: 0,
        }}>
          BookReel — Find them before everyone else does.
        </p>
      </footer>
    </div>
  )
}

function BookCard({ book }: { book: BookWithTrailer }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E8E2D5',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'box-shadow 150ms ease',
    }}>
      {/* Cover image */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: 'linear-gradient(145deg, #C8402F 0%, #8A1C10 100%)' }}>
        {book.cover_image_url || book.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_image_url ?? book.thumbnailUrl ?? ''}
            alt={book.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', opacity: 0.3 }}>
            📖
          </div>
        )}
        {/* Genre badge */}
        {book.genre && (
          <span style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(13,13,11,0.65)',
            color: '#FAFAF7',
            fontSize: '10px',
            fontWeight: 600,
            fontFamily: 'var(--font-inter), sans-serif',
            padding: '3px 8px',
            borderRadius: '100px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {book.genre}
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '16px' }}>
        <h3 style={{
          fontFamily: 'var(--font-playfair), serif',
          fontWeight: 700,
          fontSize: '16px',
          color: '#0D0D0B',
          margin: '0 0 8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {book.title}
        </h3>
        {book.description && (
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '13px',
            color: '#8A8278',
            margin: '0 0 14px',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {book.description}
          </p>
        )}
        <Link
          href={`/watch/${book.id}`}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            background: '#C8402F',
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'var(--font-inter), sans-serif',
            textDecoration: 'none',
          }}
        >
          Discover This Book →
        </Link>
      </div>
    </div>
  )
}
