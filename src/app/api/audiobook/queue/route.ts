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

  // Fetch audiobooks that are 'pending', or stuck mid-processing for >30 min.
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: pendingJobs, error } = await supabase
    .from('audiobooks')
    .select('id, book_id, narrator_voice, segments_json, word_count, status, processing_started_at, created_at')
    .or(
      `status.eq.pending,` +
      `and(status.eq.processing,processing_started_at.lt.${thirtyMinutesAgo})`
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

  // Atomically claim jobs by updating status to 'processing' and setting processing_started_at
  const jobIds = pendingJobs.map(j => j.id)
  const now = new Date().toISOString()

  const { error: claimError } = await supabase
    .from('audiobooks')
    .update({ status: 'processing', processing_started_at: now })
    .in('id', jobIds)

  if (claimError) {
    console.error('[audiobook/queue] Claim error:', claimError)
    return Response.json({ error: claimError.message }, { status: 500 })
  }

  const jobs = pendingJobs.map(job => ({
    audiobookId: job.id,
    bookId: job.book_id,
    narratorVoice: job.narrator_voice,
    segmentsJson: job.segments_json,
    wordCount: job.word_count,
  }))

  return Response.json({ jobs })
}

export async function POST(request: Request) {
  if (!authorizeWorker(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    audiobookId: string
    status: 'processing' | 'complete' | 'failed'
    audioUrl?: string
    chaptersJson?: string
    durationSeconds?: number
    errorMessage?: string
  }

  const { audiobookId, status, audioUrl, chaptersJson, durationSeconds, errorMessage } = body

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
    if (chaptersJson !== undefined) update.chapters_json = chaptersJson
    if (durationSeconds !== undefined) update.duration_seconds = durationSeconds
  }

  if (status === 'failed' && errorMessage) {
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
