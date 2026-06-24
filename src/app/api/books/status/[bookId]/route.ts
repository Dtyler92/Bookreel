import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // Auth check
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookId } = await params

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Verify book ownership
    const { data: book } = await supabase.from('books').select('author_id').eq('id', bookId).single()
    if (!book || book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const { data: trailer, error } = await supabase
      .from('trailers')
      .select('id, status, final_video_url, thumbnail_url, images_approved, created_at, updated_at')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !trailer) {
      return Response.json({ status: null, progress: null })
    }

    const isGenerating =
      trailer.status === 'processing' || trailer.status === 'generating'

    // Estimate progress based on elapsed time (15-20 min average)
    let estimatedProgress: number | null = null
    if (isGenerating && trailer.created_at) {
      const elapsedMs = Date.now() - new Date(trailer.created_at).getTime()
      const elapsedMin = elapsedMs / 60000
      // Assume ~17.5 min average, cap at 95%
      estimatedProgress = Math.min(95, Math.round((elapsedMin / 17.5) * 100))
    } else if (trailer.status === 'complete') {
      estimatedProgress = 100
    }

    return Response.json({
      status: trailer.status ?? null,
      progress: estimatedProgress,
      videoUrl: trailer.final_video_url ?? null,
      thumbnailUrl: trailer.thumbnail_url ?? null,
      imagesApproved: trailer.images_approved ?? false,
    })
  } catch (err) {
    console.error('[books/status] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
