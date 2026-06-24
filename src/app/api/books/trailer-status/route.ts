import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    // Auth check
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const bookId = url.searchParams.get('bookId')

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Verify book ownership
    const { data: book } = await supabase.from('books').select('author_id').eq('id', bookId).single()
    if (!book || book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const { data: trailer, error } = await supabase
      .from('trailers')
      .select('status, final_video_url, thumbnail_url')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return Response.json({ status: null })
    }

    return Response.json({ status: trailer?.status ?? null, videoUrl: trailer?.final_video_url ?? null })
  } catch (err) {
    console.error('[trailer-status] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
