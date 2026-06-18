import { createClient } from '@supabase/supabase-js'

// Pipeline Queue API
// GET  /api/pipeline/queue  - returns pending/generating jobs for VPS worker to pick up
// POST /api/pipeline/queue  - updates trailer status (called by VPS worker)
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

  // Fetch trailers with status 'pending' or stuck in 'generating' for >10 min
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { data: pendingJobs, error } = await supabase
    .from('trailers')
    .select('id, book_id, quality_tier, status, processing_started_at, created_at')
    .or(`status.eq.pending,and(status.eq.generating,processing_started_at.lt.${tenMinutesAgo})`)
    .order('created_at', { ascending: true })
    .limit(5)

  if (error) {
    console.error('[pipeline/queue] DB error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Map quality_tier to author/pro pipeline tier
  const jobs = (pendingJobs || []).map(job => ({
    trailerId: job.id,
    bookId: job.book_id,
    tier: (job.quality_tier === 'pro' || job.quality_tier === 'cinematic' ? 'pro' : 'author') as 'author' | 'pro',
    status: job.status,
    stuckSince: job.processing_started_at
  }))

  return Response.json({ jobs })
}

export async function POST(request: Request) {
  if (!authorizeWorker(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    bookId: string
    status: 'processing' | 'complete' | 'failed'
    videoUrl?: string
    errorMessage?: string
  }

  const { bookId, status, videoUrl, errorMessage } = body

  if (!bookId || !status) {
    return Response.json({ error: 'bookId and status required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const update: Record<string, unknown> = { status }

  if (status === 'processing') {
    update.processing_started_at = new Date().toISOString()
  }
  if (status === 'complete' && videoUrl) {
    update.final_video_url = videoUrl
    update.processing_completed_at = new Date().toISOString()
  }
  if (status === 'failed' && errorMessage) {
    update.error_message = errorMessage
  }

  const { error } = await supabase
    .from('trailers')
    .update(update)
    .eq('book_id', bookId)

  if (error) {
    console.error('[pipeline/queue] Update error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
