import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('photo') as File | null
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    // Validate type + size (max 5MB)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ error: 'Only JPEG, PNG, or WebP images are allowed' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `author-photos/${user.id}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Use service role for storage upload
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: uploadErr } = await service.storage
      .from('media')
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) {
      console.error('[author-photo] Upload error:', uploadErr)
      return Response.json({ error: 'Upload failed', detail: uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = service.storage.from('media').getPublicUrl(storagePath)
    const photoUrl = `${urlData.publicUrl}?t=${Date.now()}` // cache-bust

    const { error: updateErr } = await service
      .from('profiles')
      .update({ author_photo_url: urlData.publicUrl })
      .eq('id', user.id)

    if (updateErr) {
      return Response.json({ error: 'Profile update failed', detail: updateErr.message }, { status: 500 })
    }

    return Response.json({ success: true, photoUrl })
  } catch (err) {
    console.error('[author-photo] Unhandled error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
