import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET  /api/saved-books          — list all saved books for current user
 * POST /api/saved-books          — save a book  { bookId }
 * DELETE /api/saved-books?bookId — unsave a book
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('saved_books')
      .select(`
        id,
        created_at,
        book_id,
        books (
          id, title, description, genre, cover_image_url, amazon_link, author_id,
          trailers ( status, final_video_url, thumbnail_url )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ saved: data ?? [] })

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookId } = await request.json()
    if (!bookId) return Response.json({ error: 'bookId required' }, { status: 400 })

    const { error } = await supabase
      .from('saved_books')
      .upsert({ user_id: user.id, book_id: bookId }, { onConflict: 'user_id,book_id' })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ saved: true })

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const bookId = new URL(request.url).searchParams.get('bookId')
    if (!bookId) return Response.json({ error: 'bookId required' }, { status: 400 })

    const { error } = await supabase
      .from('saved_books')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ saved: false })

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
