/**
 * Kling 2.1 two-scene test
 * Scene A: neutral / safe (candlelit library)
 * Scene B: dark Gothic / Dracula-style (what was failing on Runway)
 *
 * Uses raw fal.ai queue REST API — same auth pattern as the existing worker.
 */

import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('/root/bookreel/.env.local', 'utf8')
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const FAL_KEY = getEnv('FAL_API_KEY')
const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')

if (!FAL_KEY) { console.error('FATAL: FAL_API_KEY not set'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Helpers ────────────────────────────────────────────────────────────────────

async function generateImage(prompt) {
  console.log(`  Generating image: "${prompt.substring(0, 60)}..."`)
  const res = await fetch('https://fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `${prompt}, cinematic composition, dramatic atmospheric lighting, film still, photorealistic, no text`,
      negative_prompt: 'text, words, letters, watermark, nudity, nude, explicit',
      image_size: 'landscape_16_9',
      num_images: 1,
      num_inference_steps: 28,
      enable_safety_checker: false
    })
  })
  if (!res.ok) throw new Error(`Image gen failed ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const falUrl = data.images?.[0]?.url
  if (!falUrl) throw new Error('No image URL returned')

  // Download + re-upload to Supabase (so URL doesn't expire for Kling)
  const imgRes = await fetch(falUrl)
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  const storagePath = `scene-images/kling-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const { error } = await supabase.storage.from('media').upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Supabase upload failed: ${error.message}`)
  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
  console.log(`  Image uploaded: ${urlData.publicUrl.substring(0, 80)}`)
  return urlData.publicUrl
}

async function submitKling(imageUrl, prompt) {
  console.log(`  Submitting to Kling: "${prompt.substring(0, 60)}..."`)
  const res = await fetch('https://queue.fal.run/fal-ai/kling-video/v2.1/standard/image-to-video', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
      duration: '5',
      aspect_ratio: '16:9',
      negative_prompt: 'text, watermark, nudity, explicit, low quality, blur',
      cfg_scale: 0.5
    })
  })
  if (!res.ok) throw new Error(`Kling submit failed ${res.status}: ${await res.text()}`)
  const data = await res.json()
  console.log(`  Kling submit response:`, JSON.stringify(data))
  // fal.ai returns status_url, result_url in the queue response
  return {
    request_id: data.request_id,
    status_url: data.status_url,
    result_url: data.response_url || data.result_url
  }
}

async function pollKling(submitData, label) {
  const { request_id, status_url, result_url } = submitData

  // fal.ai queue: status_url is provided in submit response
  const pollUrl = status_url ||
    `https://queue.fal.run/fal-ai/kling-video/v2.1/standard/image-to-video/requests/${request_id}/status`
  const fetchUrl = result_url ||
    `https://queue.fal.run/fal-ai/kling-video/v2.1/standard/image-to-video/requests/${request_id}`

  console.log(`  Polling URL: ${pollUrl}`)

  for (let i = 1; i <= 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const res = await fetch(pollUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } })
    if (!res.ok) {
      const body = await res.text()
      console.log(`  [${label}] Poll ${i}: status check failed ${res.status}: ${body.substring(0, 100)}`)
      continue
    }
    const status = await res.json()
    console.log(`  [${label}] Poll ${i}: ${status.status}`)
    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(fetchUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } })
      const result = await resultRes.json()
      const videoUrl = result.video?.url || result.output?.[0] || null
      return { success: true, videoUrl }
    }
    if (status.status === 'FAILED') {
      return { success: false, error: JSON.stringify(status).substring(0, 300) }
    }
  }
  return { success: false, error: 'Timeout (5 min)' }
}

// ── Test scenes ────────────────────────────────────────────────────────────────

const scenes = [
  {
    label: 'NEUTRAL (candlelit library)',
    imagePrompt: 'a warm candlelit Victorian library, leather armchairs, towering bookshelves, soft golden light, peaceful and inviting',
    videoPrompt: 'gentle candlelight flickers, pages softly rustle in warm golden library light, peaceful atmosphere'
  },
  {
    label: 'DARK GOTHIC (Dracula-style)',
    imagePrompt: 'a gaunt pale vampire count in a shadowy castle throne room, dramatic moonlight through arched windows, Gothic atmosphere, dark and foreboding',
    videoPrompt: 'the vampire count slowly rises from his throne, cape billowing, moonlight casting long shadows across the stone floor, ominous and cinematic'
  }
]

const results = []

for (const scene of scenes) {
  console.log(`\n═══ Scene: ${scene.label} ═══`)
  try {
    const imageUrl = await generateImage(scene.imagePrompt)
    const submitData = await submitKling(imageUrl, scene.videoPrompt)
    console.log(`  Polling (up to 5 min)...`)
    const result = await pollKling(submitData, scene.label)
    if (result.success) {
      console.log(`  ✅ SUCCESS — video: ${result.videoUrl}`)
    } else {
      console.log(`  ❌ FAILED — ${result.error}`)
    }
    results.push({ label: scene.label, ...result })
  } catch (err) {
    console.log(`  ❌ ERROR — ${err.message}`)
    results.push({ label: scene.label, success: false, error: err.message })
  }
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log('\n\n══════════════ TEST RESULTS ══════════════')
for (const r of results) {
  const icon = r.success ? '✅' : '❌'
  console.log(`${icon} ${r.label}`)
  if (r.success) console.log(`   Video URL: ${r.videoUrl}`)
  else console.log(`   Failure: ${r.error}`)
}
writeFileSync('/tmp/kling-test-results.json', JSON.stringify(results, null, 2))
console.log('\nResults saved to /tmp/kling-test-results.json')
