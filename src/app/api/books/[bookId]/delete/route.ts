import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { getCreditState } from '@/lib/credits'

// GET  /api/books/[bookId]/delete  → preview: tells the UI what will be lost + credit status
// DELETE /api/books/[bookId]/delete → actually deletes the book and all related data

async function authAndOwn(bookId: string) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: book } = await supabase
    .from('books')
    .select('id, author_id, title')
    .eq('id', bookId)
    .single()

  if (!book || book.author_id !== user.id) {
    return { error: 'Book not found', status: 404 as const }
  }
  return { user, supabase, book }
}

// Preview what deletion costs the user
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params
  const ctx = await authAndOwn(bookId)
  if ('error' in ctx) return Response.json({ error: ctx.error }, { status: ctx.status })
  const { user, supabase, book } = ctx

  // Did this book already consume a trailer credit?
  const { data: trailer } = await supabase
    .from('trailers')
    .select('credit_consumed, status')
    .eq('book_id', bookId)
    .maybeSingle()

  const creditAlreadyUsed = trailer?.credit_consumed ?? false
  const creditState = await getCreditState(user.id)

  return Response.json({
    bookTitle: book.title,
    creditAlreadyUsed,
    currentCredits: creditState?.credits ?? 0,
    resetAt: creditState?.resetAt ?? null,
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params
  const ctx = await authAndOwn(bookId)
  if ('error' in ctx) return Response.json({ error: ctx.error }, { status: ctx.status })
  const { supabase } = ctx

  // Delete child rows first (in case cascade isn't configured), then the book.
  await supabase.from('scenes').delete().eq('book_id', bookId)
  await supabase.from('characters').delete().eq('book_id', bookId)
  await supabase.from('items').delete().eq('book_id', bookId)
  await supabase.from('trailers').delete().eq('book_id', bookId)

  const { error } = await supabase.from('books').delete().eq('id', bookId)

  if (error) {
    console.error('[delete-book] DB error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
