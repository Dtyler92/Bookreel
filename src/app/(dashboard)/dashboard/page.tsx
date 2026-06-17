import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/author/DashboardClient'
import { getCreditState } from '@/lib/credits'
import type { TrailerStatus } from '@/types/database'

interface BookWithStatus {
  id: string
  title: string
  genre: string | null
  created_at: string
  trailerStatus: TrailerStatus | null
  viewCount: number
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

  const fullName = profile?.full_name ?? user.email ?? 'there'
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
    trailers: Array<{ status: TrailerStatus; view_count: number }> | null
  }

  const { data: booksRaw } = await supabase
    .from('books')
    .select('id, title, genre, created_at, trailers(status, view_count)')
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
      viewCount: latest?.view_count ?? 0,
    }
  })

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
