import { createClient } from '@supabase/supabase-js'

// Audiobook Queue API
// GET  /api/audiobook/queue  - returns pending audiobook jobs for VPS worker to pick up
// POST /api/audiobook/queue  - worker reports progress/completion
//
// Required Vercel env vars:
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PIPELINE_WORKER_SECRET

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorizeWorker(request: Request): boolean {
  const workerSecret = process.env.PIPELINE_WORKER_SECRET
  // If no secret configured, deny all access to prevent unauthorized reads
  if (!workerSecret || workerSecret === '***' || workerSecret === 'xxx') return false
  const authHeader = request.headers.get('Authorization')
  return authHeader === `Bearer ${workerSecret}`
}

export async function GET(request: Request) {
  if (!authorizeWorker(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  // Fetch audiobooks that are:
  //   - 'pending'   (generate jobs waiting to start)
  //   - 'processing' stuck >30 min (generate recovery)
  //   - 'parsing'   (parse jobs waiting to start)
  //   - 'parsing' stuck >5 min   (parse recovery)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const fiveMinutesAgo   = new Date(Date.now() -  5 * 60 * 1000).toISOString()

  const { data: pendingJobs, error } = await supabase
    .from('audiobooks')
    .select('id, book_id, narrator_voice, segments_json, word_count, status, processing_started_at, parse_started_at, created_at')
    .or(
      `status.eq.pending,` +
      `and(status.eq.processing,processing_started_at.lt.${thirtyMinutesAgo}),` +
      `and(status.eq.parsing,parse_started_at.is.null),` +
      `and(status.eq.parsing,parse_started_at.lt.${fiveMinutesAgo})`
    )
    .order('created_at', { ascending: true })
    .limit(3)

  if (error) {
    console.error('[audiobook/queue] DB error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    return Response.json({ jobs: [] })
  }

  // Separate parse jobs from generate jobs
  const parseJobs    = pendingJobs.filter(j => j.status === 'parsing')
  const generateJobs = pendingJobs.filter(j => j.status === 'pending' || j.status === 'processing')

  const now = new Date().toISOString()

  // Claim generate jobs → 'processing'
  if (generateJobs.length > 0) {
    const generateIds = generateJobs.map(j => j.id)
    const { error: claimErr } = await supabase
      .from('audiobooks')
      .update({ status: 'processing', processing_started_at: now })
      .in('id', generateIds)
    if (claimErr) {
      console.error('[audiobook/queue] Claim error (generate):', claimErr)
      return Response.json({ error: claimErr.message }, { status: 500 })
    }
  }

  // Claim parse jobs → stamp parse_started_at (keep status='parsing')
  if (parseJobs.length > 0) {
    const parseIds = parseJobs.map(j => j.id)
    const { error: claimErr } = await supabase
      .from('audiobooks')
      .update({ parse_started_at: now })
      .in('id', parseIds)
    if (claimErr) {
      console.error('[audiobook/queue] Claim error (parse):', claimErr)
      return Response.json({ error: claimErr.message }, { status: 500 })
    }
  }

  const jobs = pendingJobs.map(job => {
    const isParseJob = job.status === 'parsing'
    if (isParseJob) {
      return {
        audiobookId: job.id,
        bookId:      job.book_id,
        jobType:     'parse' as const,
      }
    }
    return {
      audiobookId:  job.id,
      bookId:       job.book_id,
      narratorVoice: job.narrator_voice,
      segmentsJson:  job.segments_json,
      wordCount:     job.word_count,
      ttsModel:      'eleven_turbo_v2_5',
      jobType:       'generate' as const,
    }
  })

  return Response.json({ jobs })
}

export async function POST(request: Request) {
  if (!authorizeWorker(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    audiobookId: string
    status: 'processing' | 'complete' | 'failed' | 'parsed' | 'parse_failed'
    audioUrl?: string
    m4bUrl?: string | null
    mp3Url?: string | null
    chaptersJson?: string
    durationSeconds?: number
    errorMessage?: string
    // Parse-specific fields
    segmentsJson?: string
    speakersJson?: string
    wordCount?: number
    characterCount?: number
    chapterMarkersJson?: string
    voiceMapJson?: string
  }

  const {
    audiobookId, status,
    audioUrl, m4bUrl, mp3Url, chaptersJson, durationSeconds, errorMessage,
    segmentsJson, speakersJson, wordCount, characterCount,
    chapterMarkersJson, voiceMapJson,
  } = body

  if (!audiobookId || !status) {
    return Response.json({ error: 'audiobookId and status required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const update: Record<string, unknown> = { status }

  if (status === 'processing') {
    update.processing_started_at = new Date().toISOString()
  }

  if (status === 'complete') {
    update.processing_completed_at = new Date().toISOString()
    if (audioUrl) update.audio_url = audioUrl
    if (m4bUrl !== undefined) update.m4b_url = m4bUrl
    if (mp3Url !== undefined) update.mp3_url = mp3Url
    if (chaptersJson !== undefined) update.chapters_json = chaptersJson
    if (durationSeconds !== undefined) update.duration_seconds = durationSeconds
  }

  if (status === 'parsed') {
    update.parse_completed_at = new Date().toISOString()
    if (segmentsJson !== undefined)      update.segments_json       = segmentsJson
    if (speakersJson !== undefined)      update.speakers_json        = speakersJson
    if (wordCount !== undefined)         update.word_count           = wordCount
    if (characterCount !== undefined)    update.character_count      = characterCount
    if (chapterMarkersJson !== undefined) update.chapter_markers_json = chapterMarkersJson
    if (voiceMapJson !== undefined)      update.voice_map_json       = voiceMapJson
  }

  if ((status === 'failed' || status === 'parse_failed') && errorMessage) {
    update.error_message = errorMessage
  }

  const { error } = await supabase
    .from('audiobooks')
    .update(update)
    .eq('id', audiobookId)

  if (error) {
    console.error('[audiobook/queue] Update error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
