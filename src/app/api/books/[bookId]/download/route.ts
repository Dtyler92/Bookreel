import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/books/[bookId]/download?asset=cover|audiobook|trailer
 * Creates a signed Supabase URL with Content-Disposition: attachment
 * and redirects the browser to it — forces a real file download.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookId } = await params
    const asset = new URL(request.url).searchParams.get('asset') ?? ''

    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify book ownership
    const { data: book } = await sb
      .from('books')
      .select('id, author_id, title, cover_image_url')
      .eq('id', bookId)
      .single()

    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    const safeTitle = (book.title ?? 'book').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')

    // Helper: extract storage path from a full Supabase public URL
    // URL pattern: .../object/public/media/{path}
    function extractPath(url: string): string | null {
      const marker = '/object/public/media/'
      const idx = url.indexOf(marker)
      if (idx === -1) return null
      return url.slice(idx + marker.length).split('?')[0]
    }

    let storagePath: string | null = null
    let filename = 'download'

    if (asset === 'cover') {
      storagePath = extractPath(book.cover_image_url ?? '')
      const ext = storagePath?.split('.').pop() ?? 'jpg'
      filename = `${safeTitle}-cover.${ext}`

    } else if (asset === 'audiobook' || asset === 'audiobook_mp3' || asset === 'audiobook_m4b') {
      const { data: ab } = await sb
        .from('audiobooks')
        .select('audio_url')
        .eq('book_id', bookId)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!ab?.audio_url) {
        return Response.json({ error: 'Audiobook not ready' }, { status: 404 })
      }

      let url = ab.audio_url
      // If they asked for a specific format, swap the extension
      if (asset === 'audiobook_mp3') url = url.replace(/\.(m4b|wav)$/i, '.mp3')
      if (asset === 'audiobook_m4b') url = url.replace(/\.(mp3|wav)$/i, '.m4b')

      storagePath = extractPath(url)
      const ext = storagePath?.split('.').pop() ?? 'mp3'
      filename = `${safeTitle}.${ext}`

    } else if (asset === 'trailer') {
      const { data: tr } = await sb
        .from('trailers')
        .select('final_video_url')
        .eq('book_id', bookId)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!tr?.final_video_url) {
        return Response.json({ error: 'Trailer not ready' }, { status: 404 })
      }

      storagePath = extractPath(tr.final_video_url)
      filename = `${safeTitle}-trailer.mp4`

    } else {
      return Response.json({ error: 'Invalid asset type' }, { status: 400 })
    }

    if (!storagePath) {
      return Response.json({ error: 'Asset URL not available' }, { status: 404 })
    }

    // Create a signed URL with download header (60 min expiry)
    const { data: signed, error: signErr } = await sb.storage
      .from('media')
      .createSignedUrl(storagePath, 3600, { download: filename })

    if (signErr || !signed?.signedUrl) {
      console.error('[download] Signed URL error:', signErr)
      return Response.json({ error: 'Could not generate download link' }, { status: 500 })
    }

    return Response.redirect(signed.signedUrl, 302)

  } catch (err) {
    console.error('[download] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
