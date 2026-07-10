import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// PATCH /api/audiobook/[bookId]/listing
// Author toggles for_sale and sets price_cents on their audiobook.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { for_sale?: boolean; price_cents?: number }

    if (typeof body.for_sale !== 'boolean') {
      return Response.json({ error: 'for_sale must be a boolean' }, { status: 400 })
    }
    if (body.price_cents !== undefined) {
      if (typeof body.price_cents !== 'number' || body.price_cents < 99 || body.price_cents > 99900) {
        return Response.json({ error: 'price_cents must be between 99 and 99900' }, { status: 400 })
      }
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify book ownership
    const { data: book } = await supabase
      .from('books')
      .select('author_id')
      .eq('id', bookId)
      .single()

    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // Find latest complete audiobook for this book
    const { data: audiobook } = await supabase
      .from('audiobooks')
      .select('id, status')
      .eq('book_id', bookId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!audiobook) {
      return Response.json({ error: 'No complete audiobook found for this book' }, { status: 404 })
    }

    const update: Record<string, unknown> = { for_sale: body.for_sale }
    if (body.price_cents !== undefined) update.price_cents = body.price_cents

    const { error } = await supabase
      .from('audiobooks')
      .update(update)
      .eq('id', audiobook.id)

    if (error) {
      console.error('[listing] Update error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, for_sale: body.for_sale, price_cents: body.price_cents })
  } catch (err) {
    console.error('[listing] Unhandled error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
