import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// POST /api/audiobook/[bookId]/generate
// Saves voice assignments + segments, deducts 1500 credits, queues the audiobook job.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookId } = await params
    const body = await request.json() as {
      segments: Array<{ index: number; speaker: string; text: string }>
      voiceMap: Record<string, string>      // speaker → voice_key
      narratorVoice: string                 // e.g. 'Daniel'
      wordCount: number
      ttsModel?: string                     // 'eleven_turbo_v2_5' | 'eleven_multilingual_v2'
    }

    const { segments, voiceMap, narratorVoice = 'Daniel', wordCount, ttsModel = 'eleven_turbo_v2_5' } = body
    if (!segments?.length) {
      return Response.json({ error: 'No segments provided' }, { status: 400 })
    }

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

    // Deduct 1500 credits for audiobook
    const AUDIOBOOK_CREDITS = 1500
    const { data: profile } = await sb
      .from('profiles')
      .select('trailer_credits')
      .eq('id', user.id)
      .single()

    const currentCredits = profile?.trailer_credits ?? 0
    if (currentCredits < AUDIOBOOK_CREDITS) {
      return Response.json({
        error: `Insufficient credits. Audiobook requires ${AUDIOBOOK_CREDITS} credits. You have ${currentCredits}.`
      }, { status: 402 })
    }

    // Deduct credits
    await sb
      .from('profiles')
      .update({ trailer_credits: currentCredits - AUDIOBOOK_CREDITS })
      .eq('id', user.id)

    await sb.from('credit_ledger').insert({
      user_id: user.id,
      delta: -AUDIOBOOK_CREDITS,
      reason: 'audiobook_generated',
      book_id: bookId,
      balance_after: currentCredits - AUDIOBOOK_CREDITS,
    })

    // Save voice assignments back to characters table
    const speakers = Object.keys(voiceMap).filter(s => s !== 'NARRATOR')
    for (const speaker of speakers) {
      await sb
        .from('characters')
        .update({ voice_key: voiceMap[speaker] })
        .eq('book_id', bookId)
        .eq('name', speaker)
    }

    // Annotate segments with voice_key for the pipeline
    const annotatedSegments = segments.map(seg => ({
      ...seg,
      voice_key: seg.speaker === 'NARRATOR'
        ? 'narrator'
        : (voiceMap[seg.speaker] || 'default'),
      voice_name: voiceNameFor(seg.speaker === 'NARRATOR' ? 'narrator' : (voiceMap[seg.speaker] || 'default')),
    }))

    // Create the audiobook record
    const { data: audiobook, error: abErr } = await sb
      .from('audiobooks')
      .insert({
        book_id: bookId,
        author_id: user.id,
        status: 'pending',
        narrator_voice: narratorVoice,
        segments_json: annotatedSegments,
        word_count: wordCount,
        character_count: speakers.length,
        credit_consumed: true,
        tts_model: ttsModel,
      })
      .select('id')
      .single()

    if (abErr) {
      return Response.json({ error: abErr.message }, { status: 500 })
    }

    return Response.json({ success: true, audiobookId: audiobook.id })
  } catch (err) {
    console.error('[audiobook/generate] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

// Mirror of pipeline-worker.mjs voiceNameFor
const CHARACTER_VOICES: Record<string, string> = {
  narrator:     'Daniel',
  deep_male:    'George',
  male:         'Liam',
  old_male:     'Bill',
  female:       'Charlotte',
  young_female: 'Alice',
  default:      'Charlie',
}
function voiceNameFor(key: string): string {
  return CHARACTER_VOICES[key?.toLowerCase()?.trim()] || CHARACTER_VOICES.default
}
