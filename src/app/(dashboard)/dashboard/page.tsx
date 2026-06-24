import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/author/DashboardClient'
import { getCreditState } from '@/lib/credits'
import type { TrailerStatus } from '@/types/database'

// Always render fresh — never serve a cached dashboard. Trailer status changes
// while the pipeline runs, so stale data makes finished trailers look unrendered.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BookWithStatus {
  id: string
  title: string
  genre: string | null
  created_at: string
  trailerStatus: TrailerStatus | null
  trailerVideoUrl: string | null
  viewCount: number
  coverImageUrl: string | null
  audiobookStatus: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier')
    .eq('id', user.id)
    .single()

  const fullName = profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'there'
  const firstName = fullName.split(' ')[0]
  const rawTier = profile?.subscription_tier ?? 'free'
  // Map subscription tiers to GlobalNav-compatible tier values
  const tierMap: Record<string, 'free' | 'author' | 'pro'> = {
    free: 'free',
    basic: 'author',
    pro: 'pro',
  }
  const userTier: 'free' | 'author' | 'pro' = tierMap[rawTier] ?? 'free'

  // Fetch books with trailer data (status + view_count)
  type BookRow = {
    id: string
    title: string
    genre: string | null
    created_at: string
    cover_image_url: string | null
    trailers: Array<{ status: TrailerStatus; view_count: number; final_video_url: string | null }> | null
  }

  const { data: booksRaw } = await supabase
    .from('books')
    .select('id, title, genre, created_at, cover_image_url, trailers(status, view_count, final_video_url)')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  const books: BookWithStatus[] = ((booksRaw ?? []) as BookRow[]).map((b) => {
    const trailers = b.trailers ?? []
    const latest = trailers.length > 0 ? trailers[trailers.length - 1] : null
    return {
      id: b.id,
      title: b.title,
      genre: b.genre,
      created_at: b.created_at,
      trailerStatus: latest?.status ?? null,
      trailerVideoUrl: latest?.final_video_url ?? null,
      viewCount: latest?.view_count ?? 0,
      coverImageUrl: b.cover_image_url ?? null,
      audiobookStatus: null, // filled in below
    }
  })

  // Fetch latest audiobook status for each book in one query
  const bookIds = books.map(b => b.id)
  if (bookIds.length > 0) {
    const { data: audiobooks } = await supabase
      .from('audiobooks')
      .select('book_id, status, created_at')
      .in('book_id', bookIds)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
    if (audiobooks) {
      // Keep only the latest row per book
      const latestByBook = new Map<string, string>()
      for (const ab of audiobooks) {
        if (!latestByBook.has(ab.book_id)) latestByBook.set(ab.book_id, ab.status)
      }
      for (const book of books) {
        book.audiobookStatus = latestByBook.get(book.id) ?? null
      }
    }
  }

  // Compute stats
  const trailersGenerated = books.filter((b) => b.trailerStatus === 'complete').length
  const totalViews = books.reduce((sum, b) => sum + b.viewCount, 0)

  // Trailer credits (auto-grants monthly allotment if due)
  const creditState = await getCreditState(user.id)
  const trailerCredits = creditState?.credits ?? 0
  const creditsResetAt = creditState?.resetAt ?? null

  return (
    <DashboardClient
      firstName={firstName}
      userTier={userTier}
      userName={fullName}
      books={books}
      trailersGenerated={trailersGenerated}
      totalViews={totalViews}
      trailerCredits={trailerCredits}
      creditsResetAt={creditsResetAt}
    />
  )
}
