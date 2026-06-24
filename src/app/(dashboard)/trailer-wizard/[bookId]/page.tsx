import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrailerWizardClient from '@/components/author/TrailerWizardClient'

export default async function TrailerWizardPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: book },
    { data: trailers },
    { data: characters },
    { data: items },
    { data: scenes },
  ] = await Promise.all([
    supabase.from('books').select('*').eq('id', bookId).eq('author_id', user.id).single(),
    supabase.from('trailers').select('id, status').eq('book_id', bookId),
    supabase
      .from('characters')
      .select(
        'id, name, description, appearance_notes, image_url, image_url_front, image_url_back, image_url_left, reference_image_url, author_approved, author_feedback'
      )
      .eq('book_id', bookId),
    supabase
      .from('items')
      .select('id, name, description, image_url, author_approved, author_feedback')
      .eq('book_id', bookId),
    supabase
      .from('scenes')
      .select('*')
      .eq('book_id', bookId)
      .order('scene_number', { ascending: true }),
  ])

  if (!book) redirect('/dashboard')

  // isRegenerate = author has at least one existing trailer (complete or failed)
  const hasExistingTrailer = (trailers ?? []).some(
    t => t.status === 'complete' || t.status === 'failed'
  )
  // Latest trailer record for the wizard (keep backward compat)
  const trailer = trailers && trailers.length > 0 ? trailers[trailers.length - 1] : null

  return (
    <TrailerWizardClient
      book={book}
      trailer={trailer ?? null}
      initialCharacters={characters ?? []}
      initialItems={items ?? []}
      initialScenes={scenes ?? []}
      userId={user.id}
      isRegenerate={hasExistingTrailer}
    />
  )
}
