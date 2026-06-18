import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlobalNav } from '@/components/shared/GlobalNav'
import ReviewImagesClient from '@/components/author/ReviewImagesClient'
import type { Book, Character, Item, Profile } from '@/types/database'

export default async function ReviewImagesPage({
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

  // Fetch characters and items in parallel
  const [{ data: characters }, { data: items }] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
    supabase
      .from('items')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
  ])

  const typedBook = book as Book
  const typedCharacters = (characters ?? []) as Character[]
  const typedItems = (items ?? []) as Item[]

  // Map subscription_tier to nav tier
  const navTier: 'free' | 'author' | 'pro' =
    typedProfile?.subscription_tier === 'pro'
      ? 'pro'
      : typedProfile?.subscription_tier === 'basic'
      ? 'author'
      : 'free'

  return (
    <>
      <GlobalNav
        userName={typedProfile?.full_name ?? undefined}
        userTier={navTier}
      />
      <ReviewImagesClient
        bookId={bookId}
        bookTitle={typedBook.title}
        bookGenre={typedBook.genre}
        initialCharacters={typedCharacters}
        initialItems={typedItems}
        userId={user.id}
      />
    </>
  )
}
