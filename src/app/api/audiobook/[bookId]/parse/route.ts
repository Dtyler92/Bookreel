import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { VOICE_ROSTER } from '@/lib/voiceRoster'

export const runtime = 'nodejs'

// Re-export so callers can still import VOICE_ROSTER from this module if needed
export { VOICE_ROSTER }

// ── Thin kickoff — all parse work now runs on the VPS worker ─────────────────
//
// POST /api/audiobook/[bookId]/parse
//   1. Auth + book ownership check
//   2. Upserts an audiobooks row with status='parsing'
//   3. Returns immediately — the VPS audiobook-worker picks it up via /api/audiobook/queue
//
// The heavy lifting (EPUB extraction, 80+ Claude calls) is done in the worker
// to avoid Vercel's function timeout.

export async function POST(
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

    // Fetch book + verify ownership
    const { data: book } = await sb
      .from('books')
      .select('id, title, author_id, pdf_url')
      .eq('id', bookId)
      .single()
    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    if (!book.pdf_url) {
      return Response.json(
        { error: 'No manuscript available. Please upload a manuscript file.' },
        { status: 400 }
      )
    }

    // Upsert audiobooks row with status='parsing'
    // If a row already exists for this book, reset it so the worker re-parses.
    const { data: existing } = await sb
      .from('audiobooks')
      .select('id')
      .eq('book_id', bookId)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let audiobookId: string

    if (existing?.id) {
      // Check current status — if already parsed, don't wipe it
      const { data: current } = await sb
        .from('audiobooks')
        .select('status, segments_json, speakers_json, voice_map_json, word_count, chapter_markers_json, character_count')
        .eq('id', existing.id)
        .single()

      if (current?.status === 'parsed' && current?.segments_json) {
        // Already parsed — return existing data so client can skip straight to voice assign
        const charCount = current.character_count ?? 0
        const estimatedCredits = charCount < 100_000 ? 800
          : charCount < 500_000 ? 1200
          : charCount < 1_000_000 ? 1500
          : 1700
        console.log(`[audiobook/parse] Already parsed — returning existing data for ${existing.id}`)
        return Response.json({
          status:    'parsed',
          audiobookId: existing.id,
          segments:  JSON.parse(current.segments_json || '[]'),
          speakers:  JSON.parse(current.speakers_json || '[]'),
          voiceMap:  JSON.parse(current.voice_map_json || '{}'),
          wordCount: current.word_count ?? 0,
          characterCount: charCount,
          estimatedCredits,
        })
      }

      // Reset existing row for re-parse
      const { error: updateErr } = await sb
        .from('audiobooks')
        .update({
          status:              'parsing',
          parse_started_at:    null,
          parse_completed_at:  null,
          segments_json:       null,
          speakers_json:       null,
          chapter_markers_json: null,
          voice_map_json:      null,
          word_count:          null,
          character_count:     null,
          error_message:       null,
        })
        .eq('id', existing.id)
      if (updateErr) throw updateErr
      audiobookId = existing.id
    } else {
      // Create new row
      const { data: inserted, error: insertErr } = await sb
        .from('audiobooks')
        .insert({
          book_id:        bookId,
          author_id:      user.id,
          status:         'parsing',
          narrator_voice: 'Daniel',
        })
        .select('id')
        .single()
      if (insertErr || !inserted) throw insertErr ?? new Error('Insert failed')
      audiobookId = inserted.id
    }

    console.log(`[audiobook/parse] Kickoff OK — audiobookId=${audiobookId} bookId=${bookId} status=parsing`)
    return Response.json({ status: 'parsing', audiobookId })

  } catch (err) {
    console.error('[audiobook/parse] kickoff error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
