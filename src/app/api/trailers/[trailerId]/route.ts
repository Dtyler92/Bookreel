import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ trailerId: string }> }
) {
  try {
    const { trailerId } = await params

    // Auth check
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getServiceClient()

    // Verify trailer belongs to a book owned by this user
    const { data: trailer } = await supabase
      .from('trailers')
      .select('id, book_id, status, books!inner(author_id)')
      .eq('id', trailerId)
      .single()

    if (!trailer) return Response.json({ error: 'Trailer not found' }, { status: 404 })

    const book = trailer.books as unknown as { author_id: string }
    if (book.author_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't delete trailers that are actively processing
    if (trailer.status === 'pending' || trailer.status === 'processing' || trailer.status === 'generating') {
      return Response.json({ error: 'Cannot delete a trailer that is currently generating. Wait for it to complete or fail first.' }, { status: 409 })
    }

    const { error } = await supabase
      .from('trailers')
      .delete()
      .eq('id', trailerId)

    if (error) {
      console.error('Trailer delete error:', error)
      return Response.json({ error: 'Failed to delete trailer' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Delete trailer error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
