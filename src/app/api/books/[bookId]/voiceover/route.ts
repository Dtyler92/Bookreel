import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { voiceover?: string }
    if (typeof body.voiceover !== 'string') {
      return Response.json({ error: 'voiceover must be a string' }, { status: 400 })
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
      .update({ voiceover: body.voiceover })
      .eq('id', bookId)

    if (error) {
      console.error('[voiceover] Update error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('[voiceover] Unhandled error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
