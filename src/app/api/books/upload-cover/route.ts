import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const bookId = formData.get('bookId') as string | null

    if (!imageFile || !(imageFile instanceof File)) {
      return Response.json({ error: 'No image file provided' }, { status: 400 })
    }
    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    // Validate file type
    const mimeType = imageFile.type
    const fileName = imageFile.name.toLowerCase()
    const isImage =
      mimeType === 'image/jpeg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/webp' ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.webp')

    if (!isImage) {
      return Response.json(
        { error: 'File must be a JPG, PNG, or WebP image' },
        { status: 400 }
      )
    }

    // Validate file size (10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (imageFile.size > MAX_SIZE) {
      return Response.json({ error: 'Image must be under 10MB' }, { status: 400 })
    }

    // Auth check
    const supabase = getServiceClient()
    let authorId: string | null = null

    try {
      const serverClient = await createServerClient()
      const {
        data: { user },
      } = await serverClient.auth.getUser()
      if (user) authorId = user.id
    } catch {
      // silently ignore auth errors
    }

    if (!authorId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the book belongs to the author
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, author_id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }
    if (book.author_id !== authorId) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Upload image to Supabase Storage (books bucket)
    const fileExt = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg'
    const storagePath = `${authorId}/covers/${bookId}-${Date.now()}.${fileExt}`
    const fileBuffer = new Uint8Array(await imageFile.arrayBuffer())

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('books')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      console.error('[upload-cover] Storage upload error:', uploadError)
      return Response.json(
        { error: 'Failed to upload cover image', detail: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('books').getPublicUrl(uploadData.path)

    // Update books table with cover_image_url
    const { error: updateError } = await supabase
      .from('books')
      .update({ cover_image_url: publicUrl })
      .eq('id', bookId)

    if (updateError) {
      console.error('[upload-cover] DB update error:', updateError)
      return Response.json(
        { error: 'Failed to save cover URL', detail: updateError.message },
        { status: 500 }
      )
    }

    console.log('[upload-cover] Cover uploaded and saved for book:', bookId)
    return Response.json({ coverUrl: publicUrl })
  } catch (err) {
    console.error('[upload-cover] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
