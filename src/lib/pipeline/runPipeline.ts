import { createClient } from '@supabase/supabase-js'
import { generateVoiceoverScript } from './generateVoiceover'
import { generateSceneImage } from './generateImages'
import { generateVideoClip } from './generateVideo'
import { stitchVideoClips } from './stitchVideo'
import { uploadFinalVideo } from './uploadVideo'

export async function runTrailerPipeline(bookId: string, authorTier: 'author' | 'pro') {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tier = authorTier === 'pro' ? 'cinematic' : 'standard'

  try {
    // Update status to processing
    await supabase.from('trailers')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .eq('book_id', bookId)

    // Fetch book, scenes, characters
    const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single()
    const { data: scenes } = await supabase.from('scenes').select('*').eq('book_id', bookId).eq('author_approved', true).order('scene_number')
    const { data: characters } = await supabase.from('characters').select('*').eq('book_id', bookId).eq('author_approved', true)

    if (!book || !scenes || scenes.length === 0) {
      throw new Error('No approved scenes found')
    }

    // Suppress unused variable warning — characters fetched for future use
    void characters

    // Step 1: Generate voiceover script
    console.log('📝 Generating voiceover script...')
    const voiceoverScript = await generateVoiceoverScript(
      book.title,
      scenes,
      book.genre || 'dramatic'
    )

    // Suppress unused variable warning — voiceoverScript stored for future ElevenLabs integration
    void voiceoverScript

    // Step 2: Generate scene images and video clips
    console.log('🎬 Generating video clips...')
    const clipUrls: string[] = []

    for (const scene of scenes.slice(0, 6)) { // max 6 scenes
      // Generate scene image
      const imageUrl = await generateSceneImage(
        scene.description,
        book.genre || 'dramatic',
        tier
      )

      // Generate video clip from image
      const clipUrl = await generateVideoClip(
        imageUrl,
        scene.description,
        scene.duration_seconds || 10,
        tier
      )

      clipUrls.push(clipUrl)

      // Update scene with video clip URL
      await supabase.from('scenes')
        .update({ video_clip_url: clipUrl })
        .eq('id', scene.id)
    }

    // Step 3: Stitch clips together
    console.log('✂️ Stitching clips together...')
    const stitchedPath = await stitchVideoClips(clipUrls, bookId)

    // Step 4: Upload to Supabase
    console.log('☁️ Uploading final trailer...')
    const finalVideoUrl = await uploadFinalVideo(stitchedPath, bookId)

    // Step 5: Update trailer record
    await supabase.from('trailers').update({
      status: 'complete',
      final_video_url: finalVideoUrl,
      processing_completed_at: new Date().toISOString(),
    }).eq('book_id', bookId)

    console.log('✅ Trailer pipeline complete!')
    return { success: true, videoUrl: finalVideoUrl }

  } catch (error) {
    console.error('Pipeline error:', error)
    await supabase.from('trailers')
      .update({ status: 'failed' })
      .eq('book_id', bookId)
    throw error
  }
}
