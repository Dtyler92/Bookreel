import { createClient } from '@supabase/supabase-js'
import { generateVoiceoverScript } from './generateVoiceover'
import { generateSceneImage } from './generateImages'
import { generateVideoClip } from './generateVideo'
import { stitchVideoClips } from './stitchVideo'
import { uploadFinalVideo } from './uploadVideo'
import { getVideoConfig } from '../tierGate'

export async function runTrailerPipeline(bookId: string, authorTier: 'author' | 'pro') {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const videoConfig = getVideoConfig(authorTier)
  const tier = videoConfig.quality

  try {
    // Update status to processing
    await supabase.from('trailers')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .eq('book_id', bookId)

    // Fetch book, scenes, characters
    console.log(`[Pipeline:${bookId}] Fetching book data...`)
    const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single()
    const { data: scenes } = await supabase.from('scenes').select('*').eq('book_id', bookId).eq('author_approved', true).order('scene_number')
    const { data: characters } = await supabase.from('characters').select('*').eq('book_id', bookId).eq('author_approved', true)

    if (!book || !scenes || scenes.length === 0) {
      throw new Error('No approved scenes found')
    }
    console.log(`[Pipeline:${bookId}] Found book "${book.title}", ${scenes.length} scenes`)

    // Suppress unused variable warning — characters fetched for future use
    void characters

    // Step 1: Generate voiceover script
    console.log(`[Pipeline:${bookId}] 📝 Step 1: Generating voiceover script...`)
    let voiceoverScript: string | null = null
    try {
      voiceoverScript = await generateVoiceoverScript(
        book.title,
        scenes,
        book.genre || 'dramatic'
      )
      console.log(`[Pipeline:${bookId}] ✅ Voiceover script generated (${voiceoverScript?.length ?? 0} chars)`)
    } catch (voiceoverError) {
      // Voiceover is non-critical — log and continue
      console.error(`[Pipeline:${bookId}] ⚠️ Voiceover script generation failed (non-fatal):`, voiceoverError)
    }

    // Suppress unused variable warning — voiceoverScript stored for future ElevenLabs integration
    void voiceoverScript

    // Determine max scenes based on tier
    const maxScenes = tier === 'cinematic' ? 9 : 3
    const scenesToGenerate = scenes.slice(0, maxScenes)

    // Step 2: Generate scene images and video clips
    console.log(`[Pipeline:${bookId}] 🎬 Step 2: Generating video clips (${scenesToGenerate.length} scenes, max ${maxScenes} for ${tier} tier)...`)
    const clipUrls: string[] = []

    for (const scene of scenesToGenerate) { // tier-based scene limit
      console.log(`[Pipeline:${bookId}]   Generating image for scene ${scene.scene_number}...`)
      // Generate scene image
      const imageUrl = await generateSceneImage(
        scene.description,
        book.genre || 'dramatic',
        tier
      )
      console.log(`[Pipeline:${bookId}]   ✅ Image generated: ${imageUrl.substring(0, 80)}`)

      // Generate video clip from image
      console.log(`[Pipeline:${bookId}]   Generating video clip for scene ${scene.scene_number}...`)
      const clipUrl = await generateVideoClip(
        imageUrl,
        scene.description,
        videoConfig.sceneLength,
        tier
      )
      console.log(`[Pipeline:${bookId}]   ✅ Video clip generated: ${clipUrl.substring(0, 80)}`)

      clipUrls.push(clipUrl)

      // Update scene with video clip URL
      await supabase.from('scenes')
        .update({ video_clip_url: clipUrl })
        .eq('id', scene.id)
    }

    // Step 3: Stitch clips together
    console.log(`[Pipeline:${bookId}] ✂️ Step 3: Stitching ${clipUrls.length} clips together...`)
    const stitchedPath = await stitchVideoClips(clipUrls, bookId)
    console.log(`[Pipeline:${bookId}] ✅ Stitched video at: ${stitchedPath}`)

    // Step 4: Upload to Supabase
    console.log(`[Pipeline:${bookId}] ☁️ Step 4: Uploading final trailer...`)
    const finalVideoUrl = await uploadFinalVideo(stitchedPath, bookId)
    console.log(`[Pipeline:${bookId}] ✅ Upload complete: ${finalVideoUrl.substring(0, 80)}`)

    // Step 5: Update trailer record
    await supabase.from('trailers').update({
      status: 'complete',
      final_video_url: finalVideoUrl,
      processing_completed_at: new Date().toISOString(),
    }).eq('book_id', bookId)

    console.log(`[Pipeline:${bookId}] ✅ Trailer pipeline complete!`)
    return { success: true, videoUrl: finalVideoUrl }

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : undefined
    console.error(`[Pipeline:${bookId}] ❌ Pipeline error:`, errMsg)
    if (errStack) console.error(`[Pipeline:${bookId}] Stack:`, errStack)

    // Try to store error message (requires scripts/update-schema.sql migration to add error_message column)
    const { error: updateErr } = await supabase.from('trailers')
      .update({ status: 'failed', error_message: errMsg })
      .eq('book_id', bookId)

    if (updateErr) {
      // Fallback: column may not exist yet — update without error_message
      await supabase.from('trailers')
        .update({ status: 'failed' })
        .eq('book_id', bookId)
    }
    throw error
  }
}
