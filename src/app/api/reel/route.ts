import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/reel?cursor=<reel_added_at>&limit=10
 * Returns paginated list of in_reel trailers with book + author info.
 * Public endpoint — no auth required to browse.
 */
export async function GET(request: Request) {
  try {
    const url   = new URL(request.url)
    const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '10'), 30)
    const cursor = url.searchParams.get('cursor') // ISO timestamp

    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current user (optional — used to flag saved books)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let query = sb
      .from('trailers')
      .select(`
        id,
        final_video_url,
        thumbnail_url,
        reel_added_at,
        duration_seconds,
        book_id,
        books (
          id,
          title,
          description,
          genre,
          cover_image_url,
          amazon_link,
          author_id,
          profiles!books_author_id_fkey (
            id,
            full_name,
            author_photo_url,
            pen_names
          )
        )
      `)
      .eq('in_reel', true)
      .eq('status', 'complete')
      .order('reel_added_at', { ascending: false })
      .limit(limit + 1) // fetch one extra to determine hasMore

    if (cursor) {
      query = query.lt('reel_added_at', cursor)
    }

    const { data: trailers, error } = await query

    if (error) {
      console.error('[reel] fetch error:', error)
      return Response.json({ error: 'Failed to fetch reel' }, { status: 500 })
    }

    const hasMore = (trailers?.length ?? 0) > limit
    const items   = (trailers ?? []).slice(0, limit)

    // If logged in, fetch which books the user has already saved
    let savedBookIds = new Set<string>()
    if (user) {
      const { data: saved } = await sb
        .from('saved_books')
        .select('book_id')
        .eq('user_id', user.id)
        .in('book_id', items.map(t => t.book_id).filter(Boolean))

      savedBookIds = new Set((saved ?? []).map(s => s.book_id))
    }

    const feed = items.map(t => {
      // Supabase returns related rows as arrays even for FK relationships
      const booksRaw = t.books as unknown as Record<string, unknown>[] | Record<string, unknown> | null
      const book    = Array.isArray(booksRaw) ? (booksRaw[0] ?? null) : (booksRaw ?? null)
      const profilesRaw = book?.profiles as unknown as Record<string, unknown>[] | Record<string, unknown> | null
      const profile = Array.isArray(profilesRaw) ? (profilesRaw[0] ?? null) : (profilesRaw ?? null)
      const penNames: string[] = Array.isArray(profile?.pen_names) ? profile.pen_names as string[] : []
      const displayName = (penNames[0] as string | undefined) ?? (profile?.full_name as string | null) ?? 'Anonymous'

      return {
        trailerId:    t.id,
        videoUrl:     t.final_video_url,
        thumbnailUrl: t.thumbnail_url,
        reelAddedAt:  t.reel_added_at,
        bookId:       t.book_id,
        title:        book?.title ?? '',
        description:  book?.description ?? null,
        genre:        book?.genre ?? null,
        coverUrl:     book?.cover_image_url ?? null,
        amazonLink:   book?.amazon_link ?? null,
        authorId:     book?.author_id ?? null,
        authorName:   displayName,
        authorPhoto:  profile?.author_photo_url ?? null,
        isSaved:      savedBookIds.has(t.book_id),
      }
    })

    const nextCursor = hasMore ? items[items.length - 1].reel_added_at : null

    return Response.json({ feed, hasMore, nextCursor })

  } catch (err) {
    console.error('[reel] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
