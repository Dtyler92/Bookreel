import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ListenClient from '@/components/author/ListenClient'

interface ChapterEntry {
  index: number
  title: string
  startSeconds: number
  endSeconds?: number
}

export default async function ListenPage({ params }: { params: { bookId: string } }) {
  const { bookId } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify book ownership & fetch metadata
  const { data: book } = await sb
    .from('books')
    .select('id, title, genre, cover_image_url, author_id')
    .eq('id', bookId)
    .single()

  if (!book || book.author_id !== user.id) redirect('/dashboard')

  // Fetch latest complete audiobook
  const { data: audiobook } = await sb
    .from('audiobooks')
    .select('id, status, audio_url, chapters_json, duration_seconds')
    .eq('book_id', bookId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Redirect to creation page if no complete audiobook
  if (!audiobook || !audiobook.audio_url) {
    redirect(`/audiobook/${bookId}`)
  }

  const chapters: ChapterEntry[] = Array.isArray(audiobook.chapters_json)
    ? (audiobook.chapters_json as ChapterEntry[])
    : []

  return (
    <ListenClient
      bookId={bookId}
      title={book.title}
      genre={book.genre ?? undefined}
      coverUrl={book.cover_image_url ?? undefined}
      audioUrl={audiobook.audio_url}
      durationSeconds={audiobook.duration_seconds ?? undefined}
      chapters={chapters}
    />
  )
}
