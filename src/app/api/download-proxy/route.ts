import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/download-proxy?url=<encoded_url>&filename=<filename>
 *
 * Proxies a video/audio file through the server so the browser gets
 * Content-Disposition: attachment and saves it to the device instead
 * of opening it. Required because cross-origin `download` attribute
 * is ignored by browsers.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const url = searchParams.get('url')
  const filename = searchParams.get('filename') || 'bookreel-video.mp4'

  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  // Only allow proxying from trusted domains
  const allowed = [
    'pvhnatwhhwnhwmqghlce.supabase.co',
    'files.evolink.ai',
    'fal.media',
    'storage.googleapis.com',
  ]
  let parsed: URL
  try { parsed = new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
  if (!allowed.some(d => parsed.hostname.endsWith(d))) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
  }

  const upstream = await fetch(url)
  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') || 'video/mp4'
  const headers = new Headers({
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  })
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)

  return new NextResponse(upstream.body, { status: 200, headers })
}
