import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Auth check
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const bookId = searchParams.get('bookId')

  if (!bookId) {
    return Response.json({ error: 'bookId is required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Verify book ownership
  const { data: book } = await supabase.from('books').select('author_id').eq('id', bookId).single()
  if (!book || book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: characters }, { data: items }] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
    supabase
      .from('items')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
  ])

  return Response.json({
    characters: characters ?? [],
    items: items ?? [],
  })
}
