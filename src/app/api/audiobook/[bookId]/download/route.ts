import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const format = request.nextUrl.searchParams.get('format') ?? 'mp3'
    if (!['m4b', 'mp3'].includes(format)) {
      return Response.json({ error: 'Invalid format. Use m4b or mp3.' }, { status: 400 })
    }

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch book to check authorship
    const { data: book } = await supabase
      .from('books')
      .select('author_id')
      .eq('id', bookId)
      .single()

    if (!book) return new Response('Not found', { status: 404 })

    // Authors always have free access
    const isAuthor = book.author_id === user.id

    if (!isAuthor) {
      // Check purchase
      const { data: purchase } = await supabase
        .from('audiobook_purchases')
        .select('id')
        .eq('book_id', bookId)
        .eq('buyer_user_id', user.id)
        .maybeSingle()

      if (!purchase) {
        return new Response('Purchase required to download', { status: 403 })
      }
    }

    // Fetch audiobook URLs
    const { data: audiobook } = await supabase
      .from('audiobooks')
      .select('m4b_url, mp3_url, audio_url')
      .eq('book_id', bookId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!audiobook) return new Response('Audiobook not found', { status: 404 })

    const fileUrl = format === 'm4b'
      ? (audiobook.m4b_url || audiobook.audio_url)
      : (audiobook.mp3_url || audiobook.audio_url)

    if (!fileUrl) {
      return new Response(`${format.toUpperCase()} file not available`, { status: 404 })
    }

    // Redirect to the actual file URL (Supabase public URL)
    return Response.redirect(fileUrl, 302)
  } catch (err) {
    console.error('[audiobook/download] Error:', err)
    return new Response('Internal server error', { status: 500 })
  }
}
