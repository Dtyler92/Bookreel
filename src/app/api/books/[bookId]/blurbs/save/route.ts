import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// PATCH /api/books/[bookId]/blurbs/save
// Persists the author's edited blurbs_json back to the books table.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { blurbs?: object }
    if (!body.blurbs || typeof body.blurbs !== 'object') {
      return Response.json({ error: 'blurbs must be an object' }, { status: 400 })
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify ownership
    const { data: book } = await supabase
      .from('books')
      .select('author_id')
      .eq('id', bookId)
      .single()

    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('books')
      .update({ blurbs_json: body.blurbs })
      .eq('id', bookId)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ success: true })
  } catch (err) {
    console.error('[blurbs/save]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
