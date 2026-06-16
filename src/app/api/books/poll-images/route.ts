import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookId = searchParams.get('bookId')

  if (!bookId) {
    return Response.json({ error: 'bookId is required' }, { status: 400 })
  }

  const supabase = getServiceClient()

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
