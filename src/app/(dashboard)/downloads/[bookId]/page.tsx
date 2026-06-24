import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import DownloadsClient from '@/components/author/DownloadsClient'

export const dynamic = 'force-dynamic'

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: book } = await sb
    .from('books')
    .select('id, title, genre, cover_image_url, author_id')
    .eq('id', bookId)
    .single()

  if (!book || book.author_id !== user.id) redirect('/dashboard')

  const [{ data: audiobook }, { data: trailer }] = await Promise.all([
    sb
      .from('audiobooks')
      .select('id, status, audio_url, duration_seconds')
      .eq('book_id', bookId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    sb
      .from('trailers')
      .select('id, status, final_video_url, created_at')
      .eq('book_id', bookId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  return (
    <DownloadsClient
      bookId={bookId}
      title={book.title}
      genre={book.genre ?? undefined}
      coverUrl={book.cover_image_url ?? undefined}
      hasAudiobook={!!(audiobook?.audio_url)}
      audiobookDuration={audiobook?.duration_seconds ?? undefined}
      hasTrailer={!!(trailer?.final_video_url)}
      trailerDate={trailer?.created_at ?? undefined}
    />
  )
}
