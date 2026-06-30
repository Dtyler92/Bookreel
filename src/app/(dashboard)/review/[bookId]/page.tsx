import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlobalNav } from '@/components/shared/GlobalNav'
import { getCreditState } from '@/lib/credits'
import ReviewClient from '@/components/author/ReviewClient'
import type { Book, Character, Scene, Profile } from '@/types/database'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile for name + tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as Pick<Profile, 'full_name' | 'subscription_tier'> | null

  // Fetch book (verify ownership)
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('author_id', user.id)
    .single()

  if (bookError || !book) {
    redirect('/dashboard')
  }

  // Fetch characters and scenes in parallel
  const [{ data: characters }, { data: scenes }] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
    supabase
      .from('scenes')
      .select('*')
      .eq('book_id', bookId)
      .order('scene_number', { ascending: true }),
  ])

  const typedBook = book as Book
  const typedCharacters = (characters ?? []) as Character[]
  const typedScenes = (scenes ?? []) as Scene[]

  // Map subscription_tier to nav tier
  const navTier: 'free' | 'author' | 'pro' =
    typedProfile?.subscription_tier === 'pro'
      ? 'pro'
      : typedProfile?.subscription_tier === 'basic'
      ? 'author'
      : 'free'

  const creditState = await getCreditState(user.id)
  const credits = creditState?.credits ?? 0

  return (
    <>
      <GlobalNav
        userName={typedProfile?.full_name ?? undefined}
        userTier={navTier}
        credits={credits}
      />
      <ReviewClient
        bookId={bookId}
        bookTitle={typedBook.title}
        bookGenre={typedBook.genre}
        initialCharacters={typedCharacters}
        initialScenes={typedScenes}
      />
    </>
  )
}
