import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/voice-preview?voice=Daniel
// Returns a cached MP3 URL for the given voice name.
// Generates on first request, serves from Supabase storage forever after.

const PREVIEW_SCRIPT: Record<string, string> = {
  Daniel:    'In the shadow of the old manor, something ancient stirs. Not every story has a happy ending.',
  Charlotte: 'She had one chance to uncover the truth before it buried her. Love and danger rarely travel alone.',
  George:    'Some men are forged by war. Others are broken by it. He was about to find out which kind he was.',
  Liam:      'I never meant for any of this to happen. But once you know the secret, there is no going back.',
  Alice:     'The letter arrived on a Tuesday. By Friday, her entire world had changed. Some choices cannot be unmade.',
  Matilda:   'Nobody believed her. That was their first mistake. She was done waiting for someone to save her.',
  Bill:      'Forty years I kept that secret. Then one day a stranger knocked on my door, and I knew it was over.',
}

const VOICE_NAMES = Object.keys(PREVIEW_SCRIPT)

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
  const voice = searchParams.get('voice')

  if (!voice || !VOICE_NAMES.includes(voice)) {
    return Response.json({ error: `Invalid voice. Must be one of: ${VOICE_NAMES.join(', ')}` }, { status: 400 })
  }

  const supabase = getServiceClient()
  const storagePath = `voice-previews/${voice.toLowerCase()}.mp3`

  // Check if already cached in Supabase storage
  const { data: existing } = await supabase.storage
    .from('media')
    .list('voice-previews', { search: `${voice.toLowerCase()}.mp3` })

  if (existing && existing.length > 0) {
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
    return Response.json({ url: urlData.publicUrl, cached: true })
  }

  // Not cached — generate via fal.ai ElevenLabs
  const falKey = process.env.FAL_API_KEY
  if (!falKey) return Response.json({ error: 'TTS not configured' }, { status: 500 })

  try {
    const script = PREVIEW_SCRIPT[voice]

    const ttsRes = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: script,
        voice,
        stability: 0.5,
        output_format: 'mp3_44100_128',
      }),
    })

    if (!ttsRes.ok) {
      const err = await ttsRes.text()
      return Response.json({ error: `TTS failed: ${err.substring(0, 200)}` }, { status: 500 })
    }

    const ttsData = await ttsRes.json()
    const audioUrl = ttsData.audio?.url || ttsData.url
    if (!audioUrl) return Response.json({ error: 'TTS returned no audio URL' }, { status: 500 })

    // Download the MP3
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) return Response.json({ error: 'Audio download failed' }, { status: 500 })
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

    // Upload to Supabase storage (permanent cache)
    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

    if (uploadErr) {
      return Response.json({ error: `Cache upload failed: ${uploadErr.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
    return Response.json({ url: urlData.publicUrl, cached: false })

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
