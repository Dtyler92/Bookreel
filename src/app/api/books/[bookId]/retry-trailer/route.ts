import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params

  // Auth check — must be the book's owner
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role to update trailer status
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the book belongs to this user
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, author_id')
    .eq('id', bookId)
    .single()

  if (bookError || !book || book.author_id !== user.id) {
    return Response.json({ error: 'Book not found' }, { status: 404 })
  }

  // Reset the trailer status to pending so the worker picks it up
  const { error, count } = await supabase
    .from('trailers')
    .update({
      status: 'pending',
      error_message: null,
      processing_started_at: null,
      processing_completed_at: null,
    }, { count: 'exact' })
    .eq('book_id', bookId)

  if (error) {
    console.error('[retry-trailer] DB error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!count || count === 0) {
    console.error('[retry-trailer] No trailer row found for book:', bookId)
    return Response.json({ error: 'No trailer record found to retry' }, { status: 404 })
  }

  return Response.json({ success: true })
}
