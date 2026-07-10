import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthedTrailer(trailerId: string, userId: string) {
  const supabase = getServiceClient()
  const { data: trailer } = await supabase
    .from('trailers')
    .select('id, book_id, status, books!inner(author_id)')
    .eq('id', trailerId)
    .single()
  if (!trailer) return { trailer: null, error: 'Trailer not found', status: 404 }
  const book = trailer.books as unknown as { author_id: string }
  if (book.author_id !== userId) return { trailer: null, error: 'Forbidden', status: 403 }
  return { trailer, error: null, status: 200 }
}

// PATCH /api/trailers/[trailerId] — clear the tiktok_url (delete just the clip)
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ trailerId: string }> }
) {
  try {
    const { trailerId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { trailer, error, status } = await getAuthedTrailer(trailerId, user.id)
    if (!trailer) return Response.json({ error }, { status })

    const supabase = getServiceClient()
    const { error: updateErr } = await supabase
      .from('trailers')
      .update({ tiktok_url: null })
      .eq('id', trailerId)

    if (updateErr) return Response.json({ error: 'Failed to delete clip' }, { status: 500 })
    return Response.json({ success: true })
  } catch (err) {
    console.error('Patch trailer error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ trailerId: string }> }
) {
  try {
    const { trailerId } = await params

    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { trailer, error, status } = await getAuthedTrailer(trailerId, user.id)
    if (!trailer) return Response.json({ error }, { status })

    // Don't delete trailers that are actively processing
    if (trailer.status === 'pending' || trailer.status === 'processing' || trailer.status === 'generating') {
      return Response.json({ error: 'Cannot delete a trailer that is currently generating. Wait for it to complete or fail first.' }, { status: 409 })
    }

    const supabase = getServiceClient()
    const { error: deleteErr } = await supabase
      .from('trailers')
      .delete()
      .eq('id', trailerId)

    if (deleteErr) {
      console.error('Trailer delete error:', deleteErr)
      return Response.json({ error: 'Failed to delete trailer' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Delete trailer error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
