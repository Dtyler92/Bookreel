import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// GET /api/audiobook/[bookId]/status
// Returns current audiobook status for a book (used by UI polling).

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

    // Verify book ownership
    const { data: book } = await sb
      .from('books')
      .select('id, author_id')
      .eq('id', bookId)
      .single()

    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    // Fetch latest audiobook record for this book
    const { data: audiobook, error } = await sb
      .from('audiobooks')
      .select('id, status, audio_url, chapters_json, duration_seconds, processing_started_at, processing_completed_at, created_at, error_message')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !audiobook) {
      return Response.json({ status: 'none' })
    }

    // Estimate progress (0–100) based on status and elapsed time
    let progress = 0
    if (audiobook.status === 'pending') {
      progress = 0
    } else if (audiobook.status === 'processing') {
      if (audiobook.processing_started_at) {
        const elapsed = Date.now() - new Date(audiobook.processing_started_at).getTime()
        // Audiobooks typically take ~15 minutes; cap estimate at 90% until complete
        const ESTIMATED_DURATION_MS = 15 * 60 * 1000
        progress = Math.min(90, Math.round((elapsed / ESTIMATED_DURATION_MS) * 90))
      } else {
        progress = 5
      }
    } else if (audiobook.status === 'complete') {
      progress = 100
    } else if (audiobook.status === 'failed') {
      progress = 0
    }

    return Response.json({
      status: audiobook.status,
      audioUrl: audiobook.audio_url ?? null,
      chaptersJson: audiobook.chapters_json ?? null,
      durationSeconds: audiobook.duration_seconds ?? null,
      errorMessage: audiobook.error_message ?? null,
      progress,
    })
  } catch (err) {
    console.error('[audiobook/status] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
