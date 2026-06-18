#!/usr/bin/env node
/**
 * BookReel VPS Pipeline Worker
 *
 * Polls /api/pipeline/queue every 30s, picks up pending jobs, and runs the
 * full trailer pipeline locally — no Vercel 60s timeout issues.
 *
 * Usage:
 *   node /root/bookreel/scripts/pipeline-worker.mjs
 *
 * Setup as systemd service or screen session:
 *   screen -S pipeline-worker -dm node /root/bookreel/scripts/pipeline-worker.mjs
 *   # or: pm2 start /root/bookreel/scripts/pipeline-worker.mjs --name pipeline-worker
 *
 * Required env vars (loaded from /root/bookreel/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PIPELINE_WORKER_SECRET  (must match what's set in Vercel)
 *   NEXT_PUBLIC_APP_URL     (e.g. https://bookreel-five.vercel.app)
 *   FAL_API_KEY             (image gen via flux/dev + video via Kling 2.1)
 *   ANTHROPIC_API_KEY or OPENROUTER_API_KEY
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Load env from .env.local ────────────────────────────────────────────────
const envPath = new URL('../.env.local', import.meta.url).pathname
const envFile = readFileSync(envPath, 'utf8')
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')
const PIPELINE_WORKER_SECRET = getEnv('PIPELINE_WORKER_SECRET')
const APP_URL = getEnv('NEXT_PUBLIC_APP_URL') || 'https://bookreel-five.vercel.app'
const FAL_API_KEY = getEnv('FAL_API_KEY')
const ANTHROPIC_API_KEY = getEnv('ANTHROPIC_API_KEY')
const OPENROUTER_API_KEY = getEnv('OPENROUTER_API_KEY')

// Expose to child process environment (for imported SDK modules)
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY
process.env.FAL_API_KEY = FAL_API_KEY
process.env.FAL_KEY = FAL_API_KEY
process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY
process.env.OPENROUTER_API_KEY = OPENROUTER_API_KEY

const POLL_INTERVAL_MS = 30_000

function isPlaceholder(v) {
  return !v || ['***', 'xxx', 'placeholder'].includes(v) || v.length < 10
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[worker] FATAL: SUPABASE_URL or SERVICE_ROLE_KEY not set in .env.local')
  process.exit(1)
}
if (isPlaceholder(PIPELINE_WORKER_SECRET)) {
  console.error('[worker] FATAL: PIPELINE_WORKER_SECRET not set — set it in .env.local AND Vercel env vars')
  process.exit(1)
}
if (isPlaceholder(FAL_API_KEY)) {
  console.error('[worker] FATAL: FAL_API_KEY not set')
  process.exit(1)
}

console.log('[worker] BookReel Pipeline Worker starting...')

// ── Content-safety helpers ────────────────────────────────────────────────────
// Soften potentially policy-violating wording so fal.ai images and Runway video
// clear automated content moderation. Keeps the dramatic intent, removes triggers.
const IMAGE_NEGATIVE_PROMPT = 'text, words, letters, captions, subtitles, title, watermark, logo, signature, writing, typography, numbers, labels, nudity, nude, naked, sexual, explicit, pornographic, nsfw, genitalia, exposed breasts, sex act, gore, blood, graphic violence, dismemberment, wound, corpse, mutilation, self-harm, drug use, disturbing, horror gore'

const SOFTEN_MAP = [
  [/\b(blood|bloody|bleeding|gore|gory)\b/gi, 'dark crimson shadows'],
  [/\b(murder|murdered|killing|kill|slain|slaughter)\b/gi, 'a fateful confrontation'],
  [/\b(stab|stabbed|stabbing|knife to|slashed|slashing)\b/gi, 'a glint of steel'],
  [/\b(corpse|dead body|dead bodies|mutilated|dismember\w*)\b/gi, 'a still figure in shadow'],
  [/\b(naked|nude|nudity|topless)\b/gi, 'silhouetted form'],
  [/\b(sex|sexual|making love|intercourse|erotic)\b/gi, 'an intimate, charged moment'],
  [/\b(wound|wounded|injury|gash|gunshot)\b/gi, 'a marked, weary figure'],
  [/\b(torture|tortured|brutal|brutally)\b/gi, 'tense and harrowing'],
  [/\b(suicide|self-harm|hang\w* (himself|herself|themselves))\b/gi, 'a moment of despair'],
  // Violence against a person/child (trampling, beating, striking) — softened to implied menace
  [/\b(knock\w* down|trampl\w*|walk\w* over|stomp\w*|beat\w* (up|down)|struck down|assault\w*)\b.{0,40}?\b(girl|boy|child|children|woman|man|victim|her|him|them)\b/gi, 'looms menacingly over a frightened bystander in the shadows'],
  [/\b(young girl|young boy|child|children)\b.{0,30}?\b(knocked|trampled|struck|hurt|harmed|attacked)\b/gi, 'a frightened child shrinks back from a sinister figure'],
  [/\b(victim|body)\b.{0,20}?\b(on the (ground|floor|street))\b/gi, 'a shaken figure in the street'],
]

function softenForModeration(text) {
  if (!text) return text
  let out = text
  for (const [pattern, replacement] of SOFTEN_MAP) {
    out = out.replace(pattern, replacement)
  }
  return out
}

console.log('[worker] App URL:', APP_URL)
console.log('[worker] Anthropic key available:', !isPlaceholder(ANTHROPIC_API_KEY))
console.log('[worker] Video engine: Kling 2.1 Pro via fal.ai')

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── Poll queue endpoint ──────────────────────────────────────────────────────
async function fetchQueue() {
  const res = await fetch(`${APP_URL}/api/pipeline/queue`, {
    headers: { Authorization: `Bearer ${PIPELINE_WORKER_SECRET}` }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Queue fetch failed ${res.status}: ${text.substring(0, 200)}`)
  }
  const data = await res.json()
  return data.jobs || []
}

async function updateTrailerStatus(bookId, status, extra = {}) {
  const res = await fetch(`${APP_URL}/api/pipeline/queue`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PIPELINE_WORKER_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bookId, status, ...extra })
  })
  if (!res.ok) {
    console.error(`[worker] Failed to update status for ${bookId}:`, await res.text())
  }
}

// ── Image generation (fal.ai) ────────────────────────────────────────────────
async function generateSceneImage(sceneDescription, genre) {
  const safeDescription = softenForModeration(sceneDescription)
  // Cinematic photorealism prompt — written for flux-pro/v1.1-ultra raw mode
  const prompt = `${safeDescription}, ${genre} mood, cinematic film still, shot on ARRI Alexa, anamorphic lens, shallow depth of field, dramatic atmospheric lighting, ultra-realistic, photorealistic, 8K, no text, no watermarks, no logos, tasteful, general audience`

  // flux-pro/v1.1-ultra: highest-quality Flux tier, raw=true = photographic realism
  // (raw bypasses aesthetic post-processing for true photographic output)
  const res = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '16:9',
      num_images: 1,
      output_format: 'jpeg',
      raw: true,          // photographic realism — less AI-processed look
      safety_tolerance: '6' // most permissive; we enforce content policy at prompt level
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`fal.ai image gen failed ${res.status}: ${err.substring(0, 200)}`)
  }

  const data = await res.json()
  const falImageUrl = data.images?.[0]?.url
  if (!falImageUrl) throw new Error('fal.ai returned no image URL')

  // Download and re-upload to Supabase so URL doesn't expire before Kling uses it
  const imgRes = await fetch(falImageUrl)
  if (!imgRes.ok) throw new Error(`Failed to download fal.ai image: ${imgRes.status}`)
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

  const storagePath = `scene-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: false })

  if (uploadErr) throw new Error(`Supabase image upload failed: ${uploadErr.message}`)

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
  console.log(`[worker]   Image uploaded to Supabase: ${urlData.publicUrl.substring(0, 80)}`)
  return urlData.publicUrl
}

// ── Video generation (Kling 2.1 via fal.ai) ───────────────────────────────────
// Replaced Runway gen4_turbo: Runway's post-generation safety filter consistently
// rejected dark/Gothic/thriller content (INTERNAL.BAD_OUTPUT.CODE01). Kling 2.1
// standard on fal.ai passes the same content cleanly, has no daily tier walls,
// and costs ~$0.035/s (similar economics to Runway).
async function generateVideoClip(imageUrl, sceneDescription, durationSeconds = 5) {
  const klingDuration = durationSeconds >= 8 ? '10' : '5'
  const safePromptText = softenForModeration(sceneDescription)

  // Submit to Kling queue
  const submitRes = await fetch('https://queue.fal.run/fal-ai/kling-video/v2.1/pro/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: safePromptText,
      image_url: imageUrl,
      duration: klingDuration,
      aspect_ratio: '16:9',
      negative_prompt: 'text, words, letters, watermark, nudity, explicit, low quality, blur, distortion',
      cfg_scale: 0.5
    })
  })

  if (!submitRes.ok) {
    const errText = await submitRes.text()
    const err = new Error(`Kling submit failed ${submitRes.status}: ${errText.substring(0, 200)}`)
    if (submitRes.status === 429) err.isRateLimit = true
    throw err
  }

  const submitData = await submitRes.json()
  const statusUrl = submitData.status_url
  const resultUrl = submitData.response_url
  console.log(`[worker]   Kling task: ${submitData.request_id}`)

  // Poll for up to 5 minutes (60 attempts × 5s)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))

    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` }
    })

    if (!statusRes.ok) {
      console.error(`[worker]   Kling status check failed: ${statusRes.status}`)
      continue
    }

    const status = await statusRes.json()
    console.log(`[worker]   Kling poll ${i+1}: ${status.status}`)

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_API_KEY}` }
      })
      const result = await resultRes.json()
      const videoUrl = result.video?.url || result.output?.[0] || null
      if (!videoUrl) throw new Error('Kling returned no video URL')
      return videoUrl
    }

    if (status.status === 'FAILED') {
      const detail = JSON.stringify(status).substring(0, 300)
      console.error(`[worker]   ❌ Kling FAILED — ${detail}`)
      const err = new Error(`Kling generation failed: ${status.error || detail}`)
      // Flag content-moderation failures distinctly
      if (/content|moderation|safety|policy|inappropriate|nsfw/i.test(detail)) {
        err.isModeration = true
      }
      throw err
    }
  }

  throw new Error('Kling generation timed out after 5 minutes')
}

// ── Video stitching (ffmpeg) ──────────────────────────────────────────────────
import { execSync } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, createWriteStream } from 'fs'
import { join } from 'path'
import https from 'https'
import http from 'http'

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath)
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })
}

// Escape a string for safe use inside an ffmpeg drawtext textfile (none needed — we use textfile=)
function buildTitleCard(tmpDir, width, height, fps, title, authorName) {
  const cardPath = join(tmpDir, 'endcard.mp4')
  const titleTxt = join(tmpDir, 'title.txt')
  const authorTxt = join(tmpDir, 'author.txt')

  // Write text to files so we never have to escape quotes/colons for drawtext
  writeFileSync(titleTxt, (title || 'Untitled').toUpperCase())
  const hasAuthor = authorName && authorName.length > 0
  if (hasAuthor) writeFileSync(authorTxt, `by ${authorName}`)

  // Font sizes scale with video height (tuned for 720p, scales up/down)
  const titleSize = Math.round(height * 0.085)   // ~61px at 720p
  const authorSize = Math.round(height * 0.040)  // ~29px at 720p
  const dur = 4.0
  const fontBold = '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf'
  const fontReg = '/usr/share/fonts/truetype/freefont/FreeSerif.ttf'

  // Title sits just above vertical center; author just below
  const titleY = hasAuthor ? '(h/2)-text_h-12' : '(h-text_h)/2'
  let vf = `drawtext=fontfile=${fontBold}:textfile=${titleTxt}:fontcolor=white:fontsize=${titleSize}:x=(w-text_w)/2:y=${titleY}`
  if (hasAuthor) {
    vf += `,drawtext=fontfile=${fontReg}:textfile=${authorTxt}:fontcolor=0xCFC9BE:fontsize=${authorSize}:x=(w-text_w)/2:y=(h/2)+16`
  }
  // Gentle fade in/out for a cinematic feel
  vf += `,fade=t=in:st=0:d=0.6,fade=t=out:st=${dur - 0.6}:d=0.6`

  execSync(
    `ffmpeg -f lavfi -i color=c=black:s=${width}x${height}:d=${dur}:r=${fps} ` +
    `-vf "${vf}" -c:v libx264 -pix_fmt yuv420p -t ${dur} ${cardPath} -y 2>&1`
  )
  console.log('[worker]   End card generated:', cardPath)
  return cardPath
}

async function stitchAndUpload(clipUrls, bookId, title, authorName, voiceoverAudioPath = null) {
  const tmpDir = `/tmp/bookreel-${bookId}`
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  const clipPaths = []
  for (let i = 0; i < clipUrls.length; i++) {
    const clipPath = join(tmpDir, `clip-${i}.mp4`)
    console.log(`[worker]   Downloading clip ${i+1}/${clipUrls.length}...`)
    await downloadFile(clipUrls[i], clipPath)
    clipPaths.push(clipPath)
  }

  // Probe the first clip for resolution + fps so the end card matches exactly
  let width = 1280, height = 720, fps = 24
  try {
    const probe = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 ${clipPaths[0]}`
    ).toString().trim()
    const [w, h, rate] = probe.split(',')
    if (w && h) { width = parseInt(w, 10); height = parseInt(h, 10) }
    if (rate && rate.includes('/')) {
      const [num, den] = rate.split('/').map(Number)
      if (num && den) fps = Math.round(num / den)
    }
    console.log(`[worker]   Clip params: ${width}x${height} @ ${fps}fps`)
  } catch (e) {
    console.log('[worker]   ffprobe failed, using defaults 1280x720@24 (non-fatal):', e.message)
  }

  // Generate the title/author end card (non-fatal — if it fails we ship without it)
  let endCardPath = null
  try {
    endCardPath = buildTitleCard(tmpDir, width, height, fps, title, authorName)
  } catch (e) {
    console.log('[worker]   End card generation failed (non-fatal, shipping without):', e.message)
  }

  const allInputs = [...clipPaths]
  if (endCardPath) allInputs.push(endCardPath)

  const outputPath = join(tmpDir, 'trailer.mp4')

  // Re-encode + concat via concat filter so mismatched codec params don't cause glitches.
  // Every input is scaled to uniform WxH/fps/SAR before concatenation.
  const inputArgs = allInputs.map(p => `-i ${p}`).join(' ')
  const filterParts = allInputs
    .map((_, i) => `[${i}:v]scale=${width}:${height},setsar=1,fps=${fps},format=yuv420p[v${i}]`)
    .join(';')
  const concatInputs = allInputs.map((_, i) => `[v${i}]`).join('')
  const filterComplex = `${filterParts};${concatInputs}concat=n=${allInputs.length}:v=1:a=0[out]`

  if (voiceoverAudioPath) {
    // Mix voiceover under the video — audio index = allInputs.length (last input)
    const audioIdx = allInputs.length
    execSync(
      `ffmpeg ${inputArgs} -i ${voiceoverAudioPath} ` +
      `-filter_complex "${filterComplex}" ` +
      `-map "[out]" -map ${audioIdx}:a ` +
      `-c:v libx264 -c:a aac -b:a 128k -pix_fmt yuv420p ` +
      `-shortest -movflags +faststart ${outputPath} -y 2>&1`
    )
    console.log('[worker]   FFmpeg stitch + audio mix complete:', outputPath)
  } else {
    execSync(
      `ffmpeg ${inputArgs} -filter_complex "${filterComplex}" ` +
      `-map "[out]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart ${outputPath} -y 2>&1`
    )
    console.log('[worker]   FFmpeg stitch complete (no audio):', outputPath)
  }

  // Upload to Supabase
  const { readFileSync } = await import('fs')
  const videoBuffer = readFileSync(outputPath)
  const storagePath = `trailers/${bookId}/final-trailer.mp4`

  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

  if (uploadErr) throw new Error(`Video upload failed: ${uploadErr.message}`)

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
  // Append a cache-busting timestamp so browsers always fetch the latest render
  // instead of serving a stale cached version of a previous trailer.
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`
  return publicUrl
}

// ── Voiceover script (Anthropic or OpenRouter) ────────────────────────────────
async function generateVoiceoverScript(bookTitle, scenes, tone) {
  const userContent = `Write a voiceover script for a book trailer for "${bookTitle}". Tone: ${tone}. Key scenes: ${scenes.map(s => s.description).join('. ')}`
  const systemPrompt = 'You are a voiceover writer for cinematic book trailers. Write compelling, atmospheric narration. Maximum 120 words. No character names in the first line. Build tension. End with the book title.'

  if (!isPlaceholder(ANTHROPIC_API_KEY)) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    })
    return message.content[0].type === 'text' ? message.content[0].text : ''
  }

  // Fallback to OpenRouter
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── Voiceover audio (ElevenLabs v3 via fal.ai) ───────────────────────────────
async function generateVoiceoverAudio(script, tmpDir) {
  if (!script || script.trim().length === 0) return null
  console.log('[worker]   Generating voiceover audio...')

  // ElevenLabs eleven_v3 via fal.ai — deep cinematic narrator voice
  const res = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: script,
      voice_id: 'onwK4e9ZLuTAKqWW03F9', // "Daniel" — deep, cinematic, authoritative
      output_format: 'mp3_44100_128'
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TTS failed ${res.status}: ${err.substring(0, 200)}`)
  }

  const data = await res.json()
  const audioUrl = data.audio?.url || data.url || null
  if (!audioUrl) throw new Error('TTS returned no audio URL')

  // Download the MP3
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Audio download failed: ${audioRes.status}`)
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

  const audioPath = join(tmpDir, 'voiceover.mp3')
  writeFileSync(audioPath, audioBuffer)
  console.log(`[worker]   Voiceover audio saved: ${audioBuffer.length} bytes`)
  return audioPath
}

// ── Suggested policy-safe rewrite (when Runway rejects a scene) ────────────────
async function generateSafeRewrite(sceneDescription, rejectionReason) {
  const systemPrompt = `You are a film editor helping adapt a book trailer scene that was rejected by an automated content-moderation filter. Rewrite the scene description so it conveys the same dramatic mood and story beat WITHOUT any content that could trigger moderation (no nudity, no explicit sexual content, no graphic gore/violence). Keep it cinematic, suggestive rather than explicit, and suitable for a general-audience book trailer. Return ONLY the rewritten scene description, 1-3 sentences, no preamble.`
  const userContent = `Original scene description: "${sceneDescription}"\n\nRejection reason: "${rejectionReason}"\n\nRewrite it to pass moderation while preserving the dramatic intent.`

  try {
    if (!isPlaceholder(ANTHROPIC_API_KEY)) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
      return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ]
      })
    })
    const data = await res.json()
    return (data.choices?.[0]?.message?.content || '').trim()
  } catch (e) {
    console.log(`[worker]   Could not generate safe rewrite: ${e.message}`)
    return ''
  }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────
const activeJobs = new Set()

async function runPipeline(job) {
  const { bookId, tier } = job
  console.log(`\n[worker] ▶ Starting pipeline: bookId=${bookId} tier=${tier}`)

  await updateTrailerStatus(bookId, 'processing')

  // Fetch book and scenes
  const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single()
  const { data: scenes } = await supabase.from('scenes').select('*').eq('book_id', bookId).eq('author_approved', true).order('scene_number')

  if (!book || !scenes || scenes.length === 0) {
    throw new Error('No approved scenes found for book ' + bookId)
  }

  // Fetch author display name for the end card (non-fatal if missing)
  let authorName = ''
  try {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', book.author_id).single()
    authorName = (profile?.full_name || '').trim()
  } catch (e) {
    console.log('[worker]   Could not fetch author name (non-fatal):', e.message)
  }

  console.log(`[worker]   Book: "${book.title}" by ${authorName || '(unknown author)'}, ${scenes.length} scenes`)

  // Voiceover — generate script then render to audio
  let voiceoverAudioPath = null
  try {
    const voiceover = await generateVoiceoverScript(book.title, scenes, book.genre || 'dramatic')
    console.log(`[worker]   Voiceover script (${voiceover.length} chars)`)
    const tmpDir = `/tmp/bookreel-${bookId}`
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
    voiceoverAudioPath = await generateVoiceoverAudio(voiceover, tmpDir)
    if (voiceoverAudioPath) console.log('[worker]   Voiceover audio ready')
  } catch (e) {
    console.error('[worker]   Voiceover failed (non-fatal, shipping without audio):', e.message)
  }

  // Determine max scenes based on tier — targets: Author ≈30s, Pro ≈80s
  // (Runway gen4_turbo renders 5s or 10s clips)
  //   Author: 6 clips × 5s  = 30s
  //   Pro:    8 clips × 10s = 80s
  const maxScenes = tier === 'pro' ? 8 : 6
  const sceneLength = tier === 'pro' ? 10 : 5
  const scenesToGenerate = scenes.slice(0, maxScenes)

  console.log(`[worker]   Generating ${scenesToGenerate.length} clips (max ${maxScenes} for ${tier})...`)

  const clipUrls = []
  const rejectedScenes = []
  for (const scene of scenesToGenerate) {
    try {
      console.log(`[worker]   Scene ${scene.scene_number}: generating image...`)

      // Generate image and upload to Supabase (so URL doesn't expire)
      let imageUrl = await generateSceneImage(scene.description, book.genre || 'dramatic')

      // Generate video. Runway failures come in two flavors:
      //  - DETERMINISTIC (isModeration / isBadOutput / isRateLimit): a retry with a
      //    fresh image fails identically and just burns the daily task cap. Bail at once.
      //  - TRANSIENT (network blip, timeout): worth one fresh-image retry.
      console.log(`[worker]   Scene ${scene.scene_number}: generating video clip...`)
      let clipUrl
      try {
        clipUrl = await generateVideoClip(imageUrl, scene.description, sceneLength)
      } catch (clipErr) {
        // Non-retryable: moderation, internal bad-output, or daily-cap. Don't waste generations.
        if (clipErr.isModeration || clipErr.isBadOutput || clipErr.isRateLimit) throw clipErr
        console.log(`[worker]   Scene ${scene.scene_number}: ⚠ attempt 1 failed (${clipErr.message}), regenerating image + retrying once in 15s...`)
        await new Promise(r => setTimeout(r, 15000))
        imageUrl = await generateSceneImage(scene.description, book.genre || 'dramatic')
        clipUrl = await generateVideoClip(imageUrl, scene.description, sceneLength)
      }
      console.log(`[worker]   Scene ${scene.scene_number}: ✅ ${clipUrl.substring(0, 80)}`)

      clipUrls.push(clipUrl)

      // Save clip URL + clear any prior moderation flags
      await supabase.from('scenes').update({
        video_clip_url: clipUrl,
        moderation_status: 'ok',
        moderation_reason: null,
        suggested_edit: null,
      }).eq('id', scene.id)
    } catch (sceneErr) {
      // Daily-cap hit: every remaining scene will 429 too. Stop the loop NOW so we
      // don't waste time (and so the trailer can still stitch whatever already succeeded).
      if (sceneErr.isRateLimit) {
        console.log(`[worker]   Scene ${scene.scene_number}: ⛔ Runway daily task limit reached — halting remaining scenes for this run.`)
        await supabase.from('scenes').update({
          moderation_status: 'pending',
          moderation_reason: 'Trailer paused: the studio hit its daily render limit. This scene will resume automatically on the next run.',
          last_moderation_at: new Date().toISOString(),
        }).eq('id', scene.id)
        break
      }

      // Skip this scene rather than failing the entire trailer
      console.log(`[worker]   Scene ${scene.scene_number}: ❌ skipped (${sceneErr.message})`)

      if (sceneErr.isModeration || sceneErr.isBadOutput) {
        // Both land in the author-review bucket: moderation = explicit policy block;
        // bad-output = Runway's post-generation safety filter rejected the rendered
        // frames (common on dark/violent imagery). Same fix path for the author: soften it.
        const friendlyReason = 'This scene was blocked by the studio\'s content-safety filter. It may contain imagery (violence, nudity, or explicit content) that can\'t be turned into video. Edit the scene below to soften it, or use our suggested version.'
        console.log(`[worker]   Scene ${scene.scene_number}: generating suggested safe rewrite...`)
        const suggestion = await generateSafeRewrite(scene.description, sceneErr.message)
        await supabase.from('scenes').update({
          moderation_status: 'rejected',
          moderation_reason: friendlyReason,
          suggested_edit: suggestion || null,
          last_moderation_at: new Date().toISOString(),
        }).eq('id', scene.id)
        rejectedScenes.push(scene.scene_number)
      } else {
        // Non-moderation failure (transient Runway/network error)
        await supabase.from('scenes').update({
          moderation_status: 'rejected',
          moderation_reason: 'This scene couldn\'t be generated due to a temporary studio error. Try regenerating, or edit the scene below.',
          last_moderation_at: new Date().toISOString(),
        }).eq('id', scene.id)
        rejectedScenes.push(scene.scene_number)
      }
    }
  }

  if (clipUrls.length === 0) {
    const reason = rejectedScenes.length > 0
      ? `All scenes were blocked or failed (scenes ${rejectedScenes.join(', ')}). Review the flagged scenes, edit them to fit content policy, and regenerate.`
      : 'All scene clips failed to generate'
    throw new Error(reason)
  }
  console.log(`[worker]   ${clipUrls.length}/${scenesToGenerate.length} clips generated successfully`)
  if (rejectedScenes.length > 0) {
    console.log(`[worker]   ⚠ ${rejectedScenes.length} scene(s) flagged for author review: ${rejectedScenes.join(', ')}`)
  }

  // Stitch and upload
  console.log('[worker]   Stitching clips...')
  const finalVideoUrl = await stitchAndUpload(clipUrls, bookId, book.title, authorName, voiceoverAudioPath)
  console.log('[worker]   ✅ Final video:', finalVideoUrl.substring(0, 80))

  await updateTrailerStatus(bookId, 'complete', { videoUrl: finalVideoUrl })
  console.log(`[worker] ✅ Pipeline complete: bookId=${bookId}`)
}

// ── Poll loop ─────────────────────────────────────────────────────────────────
async function pollLoop() {
  console.log('[worker] Polling queue...')
  try {
    const jobs = await fetchQueue()

    if (jobs.length === 0) {
      console.log('[worker] No pending jobs.')
    }

    for (const job of jobs) {
      if (activeJobs.has(job.bookId)) {
        console.log(`[worker] Job ${job.bookId} already running, skipping.`)
        continue
      }

      activeJobs.add(job.bookId)
      runPipeline(job)
        .catch(async (err) => {
          console.error(`[worker] ❌ Pipeline error for ${job.bookId}:`, err.message)
          try {
            await updateTrailerStatus(job.bookId, 'failed', { errorMessage: err.message })
          } catch (e2) {
            console.error('[worker] Failed to update status to failed:', e2.message)
          }
        })
        .finally(() => {
          activeJobs.delete(job.bookId)
        })
    }
  } catch (err) {
    console.error('[worker] Poll error:', err.message)
  }

  setTimeout(pollLoop, POLL_INTERVAL_MS)
}

pollLoop()
