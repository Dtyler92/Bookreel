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
 *   FAL_API_KEY
 *   RUNWAYML_API_KEY
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
const RUNWAY_API_KEY = getEnv('RUNWAYML_API_KEY')
const ANTHROPIC_API_KEY = getEnv('ANTHROPIC_API_KEY')
const OPENROUTER_API_KEY = getEnv('OPENROUTER_API_KEY')

// Expose to child process environment (for imported SDK modules)
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY
process.env.FAL_API_KEY = FAL_API_KEY
process.env.FAL_KEY = FAL_API_KEY
process.env.RUNWAYML_API_KEY = RUNWAY_API_KEY
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
if (isPlaceholder(RUNWAY_API_KEY)) {
  console.error('[worker] FATAL: RUNWAYML_API_KEY not set')
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
console.log('[worker] Runway key prefix:', RUNWAY_API_KEY?.substring(0, 12))

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
  const prompt = `${safeDescription}, ${genre} mood, cinematic composition, dramatic atmospheric lighting, film still, photorealistic, highly detailed, tasteful, suitable for a general audience movie trailer, clean image with no text or lettering or watermarks`
  
  const res = await fetch('https://fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: IMAGE_NEGATIVE_PROMPT,
      image_size: 'landscape_16_9',
      num_images: 1,
      num_inference_steps: 28,
      enable_safety_checker: false
    })
  })
  
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`fal.ai image gen failed ${res.status}: ${err.substring(0, 200)}`)
  }
  
  const data = await res.json()
  const falImageUrl = data.images?.[0]?.url
  if (!falImageUrl) throw new Error('fal.ai returned no image URL')
  
  // IMPORTANT: Download and re-upload to Supabase so URL doesn't expire before Runway uses it
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

// ── Video generation (Runway) ─────────────────────────────────────────────────
async function generateVideoClip(imageUrl, sceneDescription, durationSeconds = 5) {
  const runwayDuration = durationSeconds >= 8 ? 10 : 5
  const safePromptText = softenForModeration(sceneDescription)

  const createRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model: 'gen4_turbo',
      promptImage: imageUrl,
      promptText: safePromptText,
      duration: runwayDuration,
      ratio: '1280:720'
    })
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Runway create failed ${createRes.status}: ${err.substring(0, 200)}`)
  }

  const task = await createRes.json()
  if (!task.id) throw new Error(`Runway no task ID: ${JSON.stringify(task)}`)

  console.log(`[worker]   Runway task: ${task.id}`)

  // Poll for up to 5 minutes (60 attempts × 5s)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    
    const statusRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${task.id}`, {
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06'
      }
    })
    
    if (!statusRes.ok) {
      console.error(`[worker]   Runway status check failed: ${statusRes.status}`)
      continue
    }
    
    const status = await statusRes.json()
    console.log(`[worker]   Runway poll ${i+1}: ${status.status} progress=${status.progress}`)
    
    if (status.status === 'SUCCEEDED') return status.output[0]
    if (status.status === 'FAILED') {
      // Capture the FULL failure detail — Runway puts the real reason in failure / failureCode
      const failureMsg = status.failure || 'unknown'
      const failureCode = status.failureCode || status.failure_code || 'none'
      console.error(`[worker]   ❌ Runway FAILED — code=${failureCode} failure="${failureMsg}" full=${JSON.stringify(status).substring(0, 400)}`)
      const err = new Error(`Runway generation failed [${failureCode}]: ${failureMsg}`)
      // Flag content-moderation failures distinctly so the pipeline can surface them to the author
      if (/content moderation|moderation|safety|policy|inappropriate|nsfw|SAFETY/i.test(`${failureMsg} ${failureCode}`)) {
        err.isModeration = true
      }
      throw err
    }
  }
  
  throw new Error('Runway generation timed out after 5 minutes')
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

async function stitchAndUpload(clipUrls, bookId, title, authorName) {
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

  // Re-encode + concat via the concat FILTER so mismatched codec params between
  // the Runway clips and our generated card can't cause playback glitches.
  // Every input is scaled to a uniform WxH/fps/SAR before concatenation.
  const inputArgs = allInputs.map(p => `-i ${p}`).join(' ')
  const filterParts = allInputs
    .map((_, i) => `[${i}:v]scale=${width}:${height},setsar=1,fps=${fps},format=yuv420p[v${i}]`)
    .join(';')
  const concatInputs = allInputs.map((_, i) => `[v${i}]`).join('')
  const filterComplex = `${filterParts};${concatInputs}concat=n=${allInputs.length}:v=1:a=0[out]`

  execSync(
    `ffmpeg ${inputArgs} -filter_complex "${filterComplex}" ` +
    `-map "[out]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart ${outputPath} -y 2>&1`
  )
  console.log('[worker]   FFmpeg stitch complete:', outputPath)

  // Upload to Supabase
  const { readFileSync } = await import('fs')
  const videoBuffer = readFileSync(outputPath)
  const storagePath = `trailers/${bookId}/final-trailer.mp4`

  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

  if (uploadErr) throw new Error(`Video upload failed: ${uploadErr.message}`)

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
  return urlData.publicUrl
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

  // Voiceover (non-fatal)
  try {
    const voiceover = await generateVoiceoverScript(book.title, scenes, book.genre || 'dramatic')
    console.log(`[worker]   Voiceover generated (${voiceover.length} chars)`)
  } catch (e) {
    console.error('[worker]   Voiceover failed (non-fatal):', e.message)
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

      // Generate video — Runway INTERNAL.BAD_OUTPUT errors are intermittent and
      // often caused by stray text/watermarks in the input image. On retry we
      // regenerate a FRESH image (a new image usually clears the bad-output flag),
      // and back off to let transient Runway issues settle.
      console.log(`[worker]   Scene ${scene.scene_number}: generating video clip...`)
      let clipUrl
      try {
        clipUrl = await generateVideoClip(imageUrl, scene.description, sceneLength)
      } catch (clipErr) {
        // Don't retry true content-moderation rejections — they'll fail again.
        if (clipErr.isModeration) throw clipErr
        console.log(`[worker]   Scene ${scene.scene_number}: ⚠ attempt 1 failed (${clipErr.message}), regenerating image + retrying in 15s...`)
        await new Promise(r => setTimeout(r, 15000))
        try {
          imageUrl = await generateSceneImage(scene.description, book.genre || 'dramatic')
          clipUrl = await generateVideoClip(imageUrl, scene.description, sceneLength)
        } catch (clipErr2) {
          if (clipErr2.isModeration) throw clipErr2
          console.log(`[worker]   Scene ${scene.scene_number}: ⚠ attempt 2 failed (${clipErr2.message}), final retry with fresh image in 20s...`)
          await new Promise(r => setTimeout(r, 20000))
          imageUrl = await generateSceneImage(scene.description, book.genre || 'dramatic')
          clipUrl = await generateVideoClip(imageUrl, scene.description, sceneLength)
        }
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
      // Skip this scene rather than failing the entire trailer
      console.log(`[worker]   Scene ${scene.scene_number}: ❌ skipped (${sceneErr.message})`)

      if (sceneErr.isModeration) {
        // Build a friendly reason + an AI-suggested policy-safe rewrite for the author
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
  const finalVideoUrl = await stitchAndUpload(clipUrls, bookId, book.title, authorName)
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
