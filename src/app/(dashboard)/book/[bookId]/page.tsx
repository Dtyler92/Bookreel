import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlobalNav } from '@/components/shared/GlobalNav'
import BookHubClient from '@/components/author/BookHubClient'

export default async function BookHubPage({
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier')
    .eq('id', user.id)
    .single()

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('author_id', user.id)
    .single()

  if (!book) {
    redirect('/dashboard')
  }

  // Check what assets exist
  const { data: trailer } = await supabase
    .from('trailers')
    .select('id, status, video_url, quality_tier')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, image_url, author_approved')
    .eq('book_id', bookId)

  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, scene_number, description, screenplay_text')
    .eq('book_id', bookId)
    .order('scene_number')

  const { data: audiobook } = await supabase
    .from('audiobooks')
    .select('id, status, audio_url')
    .eq('book_id', bookId)
    .maybeSingle()

  return (
    <>
      <GlobalNav
        userName={profile?.full_name ?? user.email ?? ''}
        userTier={profile?.subscription_tier ?? 'free'}
      />
      <BookHubClient
        book={book}
        trailer={trailer ?? null}
        characters={characters ?? []}
        scenes={scenes ?? []}
        audiobook={audiobook ?? null}
        userName={profile?.full_name ?? user.email ?? ''}
      />
    </>
  )
}
