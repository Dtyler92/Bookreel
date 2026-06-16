import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: trailer, error } = await supabase
      .from('trailers')
      .select('id, status, final_video_url, thumbnail_url, created_at')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !trailer) {
      return Response.json({ status: null, trailerUrl: null, errorMessage: null })
    }

    return Response.json({
      status: trailer.status ?? null,
      trailerUrl: trailer.final_video_url ?? null,
      errorMessage: trailer.status === 'failed' ? 'Trailer generation failed. Please try again.' : null,
    })
  } catch (err) {
    console.error('[books/[bookId]/status] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
