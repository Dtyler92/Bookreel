import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// PATCH /api/books/[bookId]/scenes/[sceneId]
// Allows the book's author to edit a scene's description / screenplay text.
// Clears any prior moderation rejection so the scene can be regenerated.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; sceneId: string }> }
) {
  const { bookId, sceneId } = await params

  // Auth — must be the book's owner
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

  const body = await request.json() as {
    description?: string
    screenplay_text?: string
    title?: string
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the book belongs to this user
  const { data: book } = await supabase
    .from('books')
    .select('id, author_id')
    .eq('id', bookId)
    .single()

  if (!book || book.author_id !== user.id) {
    return Response.json({ error: 'Book not found' }, { status: 404 })
  }

  // Verify the scene belongs to this book
  const { data: scene } = await supabase
    .from('scenes')
    .select('id, book_id')
    .eq('id', sceneId)
    .single()

  if (!scene || scene.book_id !== bookId) {
    return Response.json({ error: 'Scene not found' }, { status: 404 })
  }

  const update: Record<string, unknown> = {
    author_edited: true,
    // Editing clears the prior moderation flag — give it a fresh chance
    moderation_status: null,
    moderation_reason: null,
    suggested_edit: null,
  }
  if (typeof body.description === 'string') update.description = body.description.trim()
  if (typeof body.screenplay_text === 'string') update.screenplay_text = body.screenplay_text.trim()
  if (typeof body.title === 'string') update.title = body.title.trim()

  const { error } = await supabase
    .from('scenes')
    .update(update)
    .eq('id', sceneId)

  if (error) {
    console.error('[scenes PATCH] DB error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
