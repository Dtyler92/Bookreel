import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // Auth check
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { fileName, bookId } = await request.json()

    if (!bookId || !fileName) {
      return NextResponse.json({ error: 'bookId and fileName are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify book ownership
    const { data: book } = await supabase.from('books').select('author_id').eq('id', bookId).single()
    if (!book || book.author_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Sanitize fileName to prevent path traversal
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')

    const filePath = `pdfs/${bookId}/${safeFileName}`

    const { data, error } = await supabase.storage
      .from('books')
      .createSignedUploadUrl(filePath)

    if (error) throw error

    return NextResponse.json({
      signedUrl: data.signedUrl,
      filePath,
      token: data.token
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
