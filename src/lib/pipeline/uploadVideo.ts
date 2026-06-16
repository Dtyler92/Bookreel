import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

export async function uploadFinalVideo(
  videoPath: string,
  bookId: string
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const videoBuffer = readFileSync(videoPath)
  const fileName = `trailers/${bookId}/final-trailer.mp4`

  const { error } = await supabase.storage
    .from('books')
    .upload(fileName, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from('books')
    .getPublicUrl(fileName)

  return data.publicUrl
}
