import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { VOICE_ROSTER } from '@/lib/voiceRoster'

export const runtime = 'nodejs'

// GET /api/audiobook/[bookId]/parse-status
//
// Polls the current parse state for a book's audiobook row.
// The frontend polls this every 5s while status='parsing'.
//
// Response shape:
//   { status: 'parsing' }
//   { status: 'parsed', segments, speakers, voiceMap, chapterMarkers,
//             wordCount, estimatedCredits, estimatedMinutes, chapterCount,
//             voiceRoster }
//   { status: 'parse_failed', error: string }
//   { status: 'not_found' }  (no row yet — shouldn't happen after kickoff)

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
    const { data: bookData } = await sb
      .from('books')
      .select('id, author_id')
      .eq('id', bookId)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const book = bookData as any
    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    // Fetch latest audiobook row for this book
    const { data: rowData } = await sb
      .from('audiobooks')
      .select(
        'id, status, segments_json, speakers_json, chapter_markers_json, ' +
        'voice_map_json, word_count, character_count, error_message'
      )
      .eq('book_id', bookId)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = rowData as any
    if (!row || !row.status) {
      // No row found — PGRST116 ("no rows returned") or row has no status
      return Response.json({ status: 'not_found' })
    }

    if (row.status === 'parsing') {
      return Response.json({ status: 'parsing' })
    }

    if (row.status === 'parse_failed') {
      return Response.json({
        status: 'parse_failed',
        error:  (row.error_message as string | null) || 'Parse failed — no details available.',
      })
    }

    if (row.status === 'parsed') {
      // Deserialise — the worker stores these as JSONB so Supabase returns them
      // already parsed, but fall back to JSON.parse if they come back as strings.
      const maybeJson = (v: unknown) => {
        if (!v) return v
        if (typeof v === 'string') { try { return JSON.parse(v) } catch { return v } }
        return v
      }

      const segments       = maybeJson(row.segments_json)        as Array<{ index: number; speaker: string; text: string }> | null
      const speakers       = maybeJson(row.speakers_json)        as string[] | null
      const chapterMarkers = maybeJson(row.chapter_markers_json) as Array<{ chapterIndex: number; title: string; startSegmentIndex: number }> | null
      const voiceMap       = maybeJson(row.voice_map_json)       as Record<string, string> | null
      const wordCount      = (row.word_count  as number | null) ?? 0
      const estimatedMins  = wordCount ? Math.round(wordCount / 150) : 0
      const chapterCount   = Array.isArray(chapterMarkers) ? chapterMarkers.length : null

      return Response.json({
        status:           'parsed',
        segments:         segments         ?? [],
        speakers:         speakers         ?? [],
        voiceMap:         voiceMap         ?? { NARRATOR: 'narrator' },
        chapterMarkers:   chapterMarkers   ?? [],
        voiceRoster:      VOICE_ROSTER,
        wordCount,
        estimatedCredits: 1500,
        estimatedMinutes: estimatedMins,
        chapterCount,
      })
    }

    // Any other status (pending/processing/complete/failed) — not a parse-status state.
    // Return the raw status so the client can decide what to do.
    return Response.json({ status: row.status as string })

  } catch (err) {
    console.error('[audiobook/parse-status] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
