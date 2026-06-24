import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    // Auth check
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { bookId: string }
    const { bookId } = body

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Verify book ownership
    const { data: book } = await supabase.from('books').select('author_id').eq('id', bookId).single()
    if (!book || book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('trailers')
      .update({ images_approved: true })
      .eq('book_id', bookId)

    if (error) {
      console.error('[mark-images-approved] Update error:', error)
      return Response.json({ error: 'Failed to update trailer', detail: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('[mark-images-approved] Unhandled error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
