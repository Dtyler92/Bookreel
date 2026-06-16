import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { fileName, bookId } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const filePath = `pdfs/${bookId}/${fileName}`

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
