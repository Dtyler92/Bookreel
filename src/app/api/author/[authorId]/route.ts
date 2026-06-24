import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/author/[authorId]
 * Returns author profile + all their published books with trailers.
 * Public endpoint.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ authorId: string }> }
) {
  try {
    const { authorId } = await params

    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Profile
    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .select('id, full_name, author_photo_url, pen_names')
      .eq('id', authorId)
      .single()

    if (profileErr || !profile) {
      return Response.json({ error: 'Author not found' }, { status: 404 })
    }

    // Published books with trailers
    const { data: books, error: booksErr } = await sb
      .from('books')
      .select(`
        id, title, description, genre, cover_image_url, amazon_link, created_at,
        trailers ( status, final_video_url, thumbnail_url )
      `)
      .eq('author_id', authorId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (booksErr) {
      return Response.json({ error: booksErr.message }, { status: 500 })
    }

    const penNames: string[] = Array.isArray(profile.pen_names) ? profile.pen_names : []
    const displayName = penNames[0] ?? profile.full_name ?? 'Anonymous'

    type TrailerRow = { status: string; final_video_url: string | null; thumbnail_url: string | null }
    type BookRow = { id: string; title: string; description: string | null; genre: string | null; cover_image_url: string | null; amazon_link: string | null; created_at: string; trailers: TrailerRow[] | null }

    const enrichedBooks = ((books ?? []) as BookRow[]).map(b => {
      const trailers = b.trailers ?? []
      const complete = trailers.find(t => t.status === 'complete')
      return {
        id:          b.id,
        title:       b.title,
        description: b.description,
        genre:       b.genre,
        coverUrl:    b.cover_image_url,
        amazonLink:  b.amazon_link,
        createdAt:   b.created_at,
        trailerUrl:  complete?.final_video_url ?? null,
        thumbUrl:    complete?.thumbnail_url   ?? null,
      }
    })

    return Response.json({
      author: {
        id:          profile.id,
        displayName,
        photoUrl:    profile.author_photo_url ?? null,
        bookCount:   enrichedBooks.length,
      },
      books: enrichedBooks,
    })

  } catch (err) {
    console.error('[author] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
