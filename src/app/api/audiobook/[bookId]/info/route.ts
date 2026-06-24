import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/audiobook/[bookId]/info
 * Returns basic book metadata needed by the audiobook page:
 *   { title, hasPdfUrl }
 * hasPdfUrl is true when book.pdf_url is set — the client uses this to decide
 * whether to show a file-upload step before parsing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookId } = await params

    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: book } = await sb
      .from('books')
      .select('id, title, author_id, pdf_url')
      .eq('id', bookId)
      .single()

    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    return Response.json({
      title: book.title ?? '',
      hasPdfUrl: !!book.pdf_url,
    })
  } catch (err) {
    console.error('[audiobook/info] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
