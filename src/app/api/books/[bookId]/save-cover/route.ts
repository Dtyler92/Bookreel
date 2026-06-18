import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const { coverUrl } = await request.json() as { coverUrl: string }

    if (!coverUrl) return Response.json({ error: 'coverUrl is required' }, { status: 400 })

    // Auth check
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify book belongs to this user
    const { data: book } = await supabase.from('books').select('author_id').eq('id', bookId).single()
    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await supabase.from('books').update({ cover_image_url: coverUrl }).eq('id', bookId)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
