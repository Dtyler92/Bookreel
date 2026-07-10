import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import StoreClient from './StoreClient'

interface ChapterEntry {
  index: number
  title: string
  startSeconds: number
}

interface PageProps {
  params: Promise<{ bookId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId } = await params

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: book } = await sb
    .from('books')
    .select('title, description, cover_image_url')
    .eq('id', bookId)
    .single()

  if (!book) {
    return { title: 'Audiobook — BookReel' }
  }

  return {
    title: `${book.title} — BookReel Audiobook`,
    description: book.description ?? `Listen to ${book.title} as a full audiobook on BookReel.`,
    openGraph: {
      title: `${book.title} — BookReel Audiobook`,
      description: book.description ?? undefined,
      images: book.cover_image_url ? [{ url: book.cover_image_url }] : [],
    },
  }
}

export default async function StorePage({ params }: PageProps) {
  const { bookId } = await params

  // Service-role client for all reads (public store — no RLS restrictions needed)
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch book metadata
  const { data: book } = await sb
    .from('books')
    .select('id, title, genre, description, cover_image_url, author_id')
    .eq('id', bookId)
    .single()

  if (!book) return notFound()

  // Fetch author profile
  const { data: authorProfile } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', book.author_id)
    .single()

  // Fetch latest complete audiobook that is for sale
  const { data: audiobook } = await sb
    .from('audiobooks')
    .select('id, status, audio_url, duration_seconds, chapters_json, for_sale, price_cents, m4b_url, mp3_url')
    .eq('book_id', bookId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Not available: no complete audiobook or not marked for sale
  if (!audiobook || !audiobook.for_sale) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#FAFAF7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-inter), sans-serif',
          padding: '2rem',
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D5',
            borderRadius: 12,
            padding: '3rem 2rem',
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>📚</div>
          <h1
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#0D0D0B',
              marginBottom: '0.75rem',
            }}
          >
            Not Available
          </h1>
          <p style={{ color: '#8A8278', fontSize: '0.95rem', lineHeight: 1.6 }}>
            This audiobook is not currently available for purchase. Check back later.
          </p>
        </div>
      </main>
    )
  }

  // Check if current user (if logged in) has already purchased this book
  let hasPurchased = false
  let isLoggedIn = false

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      isLoggedIn = true
      const { data: purchase } = await sb
        .from('audiobook_purchases')
        .select('id')
        .eq('book_id', bookId)
        .eq('buyer_user_id', user.id)
        .limit(1)
        .single()
      hasPurchased = !!purchase
    }
  } catch {
    // Not logged in — safe to ignore
  }

  // Parse chapters
  const chapters: ChapterEntry[] = Array.isArray(audiobook.chapters_json)
    ? (audiobook.chapters_json as ChapterEntry[])
    : []

  return (
    <StoreClient
      bookId={bookId}
      title={book.title}
      genre={book.genre ?? undefined}
      description={book.description ?? undefined}
      coverUrl={book.cover_image_url ?? undefined}
      authorName={authorProfile?.full_name ?? 'Unknown Author'}
      durationSeconds={audiobook.duration_seconds ?? undefined}
      chapters={chapters}
      priceCents={audiobook.price_cents ?? 999}
      hasPurchased={hasPurchased}
      previewAudioUrl={audiobook.audio_url ?? undefined}
      isLoggedIn={isLoggedIn}
      m4bUrl={audiobook.m4b_url ?? undefined}
      mp3Url={audiobook.mp3_url ?? undefined}
    />
  )
}
