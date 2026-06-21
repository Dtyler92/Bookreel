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

// Seedance 2.0 (ByteDance via fal.ai) — video engine as of Jun 2026
// Replaced Kling 2.1: Seedance supports 4–15s clips, 1080p, start+end frame control,
// and native character/lip-sync via reference-to-video endpoint.
// Standard = 1080p ($0.3024/s), Fast = 720p ($0.2419/s). Default: standard.
const SEEDANCE_TIER = (process.env.SEEDANCE_TIER || 'standard').toLowerCase() === 'fast' ? 'fast' : 'standard'
const SEEDANCE_I2V_ENDPOINT = SEEDANCE_TIER === 'fast'
  ? 'https://queue.fal.run/bytedance/seedance-2.0/fast/image-to-video'
  : 'https://queue.fal.run/bytedance/seedance-2.0/image-to-video'
const SEEDANCE_REF_ENDPOINT = SEEDANCE_TIER === 'fast'
  ? 'https://queue.fal.run/bytedance/seedance-2.0/fast/reference-to-video'
  : 'https://queue.fal.run/bytedance/seedance-2.0/reference-to-video'
const SEEDANCE_PER_SEC = SEEDANCE_TIER === 'fast' ? 0.2419 : 0.3024

// Troubleshoot mode — cap the number of clips to render a SHORT trailer while we
// iterate on audio/quality, so we don't burn credits on full-length renders. Set
// TEST_MAX_CLIPS=2 for a ~20s trailer (2×10s pro clips). Unset/0 = full length.
const TEST_MAX_CLIPS = parseInt(process.env.TEST_MAX_CLIPS || '0', 10) || 0

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
console.log(`[worker] Video engine: Seedance 2.0 ${SEEDANCE_TIER.toUpperCase()} via fal.ai ($${SEEDANCE_PER_SEC}/s)`)
if (TEST_MAX_CLIPS > 0) console.log(`[worker] ⚠ TEST MODE active: TEST_MAX_CLIPS=${TEST_MAX_CLIPS} (short renders to save credits)`)

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

// ── Per-render cost tracking ──────────────────────────────────────────────────
// fal.ai prices (verified Jun 2026 from each model's page). All generation runs on
// ONE fal balance, so when it's exhausted, everything stops at once. The ledger logs
// exactly what each trailer costs so credit pricing ($9.99=1 credit) stays profitable.
const PRICING = {
  flux_image_ultra: 0.06,   // flux-pro/v1.1-ultra — per image
  // Seedance per-second price is tier-dependent — see SEEDANCE_PER_SEC (standard $0.3024 / fast $0.2419)
  tts_per_1k_char: 0.10,    // elevenlabs eleven-v3 — per 1000 chars
  music_bed: 0.015,         // stable-audio — approx (open model, compute-second)
  // No separate lipsync cost — Seedance reference-to-video handles it natively
}
// Rough Claude Sonnet token prices (script/line-selection LLM, billed to Anthropic/
// OpenRouter — a SEPARATE balance from fal, tracked here for full per-render visibility).
const LLM_PRICING = { in_per_1m: 3.0, out_per_1m: 15.0 }

function makeLedger() {
  return {
    items: [],
    add(label, provider, amount) {
      const amt = Math.max(0, +(+amount).toFixed(4))
      this.items.push({ label, provider, amount: amt })
      return amt
    },
  }
}

function summarizeLedger(ledger) {
  const byProvider = {}
  let total = 0
  for (const it of ledger.items) {
    byProvider[it.provider] = +(((byProvider[it.provider] || 0) + it.amount)).toFixed(4)
    total += it.amount
  }
  return { total: +total.toFixed(2), byProvider, items: ledger.items }
}

// Estimate cost of a Claude call from token usage (falls back to a tiny flat estimate
// when usage isn't available, e.g. OpenRouter responses without a usage field).
function llmCost(usage) {
  if (!usage) return 0.01
  const inTok = usage.input_tokens ?? usage.prompt_tokens ?? 0
  const outTok = usage.output_tokens ?? usage.completion_tokens ?? 0
  return (inTok / 1e6) * LLM_PRICING.in_per_1m + (outTok / 1e6) * LLM_PRICING.out_per_1m
}

// ── Camera movement selection (Claude) ───────────────────────────────────────
// Asks Claude to pick the ideal camera movement for each scene based on its
// description, tone, duration and what's happening in the shot.
async function selectCameraMovement(sceneDescription, screenplayText, genre, durationSeconds, ledger = null) {
  const prompt = `You are a cinematographer choosing a single camera movement for one clip in a book trailer.

Scene description: ${sceneDescription}
Screenplay action: ${screenplayText || 'none specified'}
Genre: ${genre}
Clip duration: ${durationSeconds}s

Pick ONE camera movement that best serves this scene. Consider:
- Short clips (5s): simple, subtle movements (slow push-in, gentle tilt, static)
- Long clips (10s): can support fuller movements (slow dolly, tracking, gradual crane up)
- Match the energy: tense scenes = handheld or fast push; emotional = slow drift or static; establishing = pull-back or wide pan

Return ONLY the camera movement directive — no explanation, no punctuation, just the movement.
Examples: slow push-in, pull back to reveal, handheld orbit, static wide shot, gradual tilt up, subtle drift left, slow dolly forward`

  try {
    if (!ANTHROPIC_API_KEY) return screenplayText || null
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 30, messages: [{ role: 'user', content: prompt }] })
    })
    if (!res.ok) return screenplayText || null
    const data = await res.json()
    if (ledger) ledger.add('camera movement (claude)', 'anthropic', estimateLlmCost(data.usage || {}))
    return data.content?.[0]?.text?.trim() || screenplayText || null
  } catch (e) {
    console.error('[worker]   Camera movement selection failed (non-fatal):', e.message)
    return screenplayText || null
  }
}

// ── Character reference image generation ─────────────────────────────────────
// Generates a clean portrait per character once, stored in Supabase characters table.
// Reused across every scene that character appears in — OpenArt "character library" pattern.
async function generateCharacterReferenceImage(character, ledger = null) {
  const safeAppearance = softenForModeration(character.appearance || character.description || character.name)
  const prompt = `${safeAppearance}, professional character portrait, front-facing headshot, both eyes clearly visible, symmetrical face, neutral expression, sharp facial detail, clean studio lighting, neutral background, ultra-realistic photorealistic portrait, no text, no watermarks`

  const res = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: '3:4', num_images: 1, output_format: 'jpeg', raw: true, safety_tolerance: '6' })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Character ref image failed ${res.status}: ${err.substring(0, 200)}`)
  }
  const data = await res.json()
  const falUrl = data.images?.[0]?.url
  if (!falUrl) throw new Error('No character ref image URL returned')

  // Download + re-upload to Supabase for a stable permanent URL
  const imgRes = await fetch(falUrl)
  if (!imgRes.ok) throw new Error(`Failed to download character ref: ${imgRes.status}`)
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  const safeName = (character.name || 'character').replace(/\s+/g, '-').toLowerCase()
  const storagePath = `character-refs/${safeName}-${Date.now()}.jpg`

  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadErr) throw new Error(`Supabase char ref upload failed: ${uploadErr.message}`)

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
  if (ledger) ledger.add(`char ref: ${character.name}`, 'fal', PRICING.flux_image_ultra)
  console.log(`[worker]   Character ref "${character.name}": ${urlData.publicUrl.substring(0, 80)}`)
  return urlData.publicUrl
}

// ── Image generation (fal.ai) ────────────────────────────────────────────────
// characterRefs: [{ name, imageUrl }] — reference portraits for characters in this scene.
// When provided, injected as @Image tags so Flux anchors on their established look.
async function generateSceneImage(sceneDescription, genre, ledger = null, characterRefs = []) {
  const safeDescription = softenForModeration(sceneDescription)

  // Build @tag annotations — "Image2 is CharacterName" tells Flux to use that reference
  const charTags = characterRefs.length > 0
    ? characterRefs.map((c, i) => `@Image${i + 2} is ${c.name}`).join(', ') + '. '
    : ''

  // Cinematic photorealism prompt — written for flux-pro/v1.1-ultra raw mode
  const prompt = `${charTags}${safeDescription}, ${genre} mood, cinematic film still, shot on ARRI Alexa, anamorphic lens, shallow depth of field, dramatic atmospheric lighting, ultra-realistic, photorealistic, 8K, no text, no watermarks, no logos, tasteful, general audience`

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
      safety_tolerance: '6', // most permissive; we enforce content policy at prompt level
      // Pass character reference images as image_urls so Flux anchors on their look.
      // Index 0 = primary reference (first character); subsequent refs are @Image2, @Image3, etc.
      ...(characterRefs.length > 0 && { image_urls: characterRefs.map(c => c.imageUrl) })
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
  if (ledger) ledger.add('scene image (flux-pro ultra)', 'fal', PRICING.flux_image_ultra)
  return urlData.publicUrl
}

// ── Video generation (Seedance 2.0 via fal.ai) ────────────────────────────────
// Replaced Kling 2.1 Jun 2026: Seedance 2.0 supports 4–15s clips, 1080p output,
// and native character reference + lip-sync via reference-to-video endpoint.
// Two functions:
//   generateVideoClip()     — standard image-to-video for non-character scenes
//   generateCharacterClip() — reference-to-video for lip-synced character scenes
//                             (no separate sync-lipsync step needed)

async function pollSeedanceJob(endpoint, requestId, durationSeconds, label, ledger, perSec = SEEDANCE_PER_SEC) {
  const statusBase = `https://queue.fal.run/${endpoint.replace('https://queue.fal.run/', '')}`
  const statusUrl = `${statusBase}/requests/${requestId}/status`
  const resultUrl = `${statusBase}/requests/${requestId}`

  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` }
    })
    if (!statusRes.ok) { console.error(`[worker]   Seedance status check failed: ${statusRes.status}`); continue }
    const status = await statusRes.json()
    console.log(`[worker]   Seedance poll ${i+1}: ${status.status}`)

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } })
      const result = await resultRes.json()
      const videoUrl = result.video?.url || null
      if (!videoUrl) throw new Error('Seedance returned no video URL')
      if (ledger) ledger.add(label, 'fal', perSec * durationSeconds)
      return videoUrl
    }
    if (status.status === 'FAILED') {
      const detail = JSON.stringify(status).substring(0, 300)
      console.error(`[worker]   ❌ Seedance FAILED — ${detail}`)
      const err = new Error(`Seedance generation failed: ${status.error || detail}`)
      if (/content|moderation|safety|policy|inappropriate|nsfw/i.test(detail)) err.isModeration = true
      throw err
    }
  }
  throw new Error('Seedance generation timed out after 7.5 minutes')
}

// Standard image-to-video — for non-character or non-lip-sync scenes
async function generateVideoClip(imageUrl, sceneDescription, durationSeconds = 10, screenplayText = null, ledger = null, suppressTalking = false, endpoint = SEEDANCE_I2V_ENDPOINT, resolution = '720p', perSec = SEEDANCE_PER_SEC) {
  const duration = String(Math.min(15, Math.max(4, durationSeconds)))
  const motionText = screenplayText?.trim()
    ? `${sceneDescription}. Camera and motion: ${screenplayText}`
    : sceneDescription
  const safePrompt = softenForModeration(motionText)
    + (suppressTalking ? ', subject is silent and still, mouth closed, no talking' : '')

  const submitRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: safePrompt,
      image_url: imageUrl,
      duration,
      resolution,
      aspect_ratio: '16:9',
      generate_audio: false,  // we supply our own music/TTS
    })
  })

  if (!submitRes.ok) {
    const errText = await submitRes.text()
    const err = new Error(`Seedance i2v submit failed ${submitRes.status}: ${errText.substring(0, 200)}`)
    if (submitRes.status === 429) err.isRateLimit = true
    throw err
  }

  const submitData = await submitRes.json()
  const requestId = submitData.request_id
  const tier = resolution === '1080p' ? 'standard' : 'fast'
  console.log(`[worker]   Seedance i2v task: ${requestId}`)
  return pollSeedanceJob(endpoint, requestId, Number(duration), `video clip ${duration}s (seedance 2.0 ${tier} ${resolution})`, ledger, perSec)
}

// Reference-to-video — for character scenes with lip-sync.
async function generateCharacterClip(characterImageUrl, ttsAudioUrl, sceneDescription, durationSeconds = 10, ledger = null, endpoint = SEEDANCE_REF_ENDPOINT, perSec = SEEDANCE_PER_SEC) {
  const duration = String(Math.min(15, Math.max(4, durationSeconds)))
  const safeDesc = softenForModeration(sceneDescription)
  const prompt = `@Image1 speaks while saying @Audio1. ${safeDesc}. Character looks directly at camera, steady head position, cinematic portrait lighting.`

  const submitRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_urls: [characterImageUrl],
      audio_urls: [ttsAudioUrl],
      duration,
      resolution: '720p',  // reference-to-video caps at 720p regardless of tier
      aspect_ratio: '16:9',
      generate_audio: false,
    })
  })

  if (!submitRes.ok) {
    const errText = await submitRes.text()
    const err = new Error(`Seedance ref2v submit failed ${submitRes.status}: ${errText.substring(0, 200)}`)
    if (submitRes.status === 429) err.isRateLimit = true
    throw err
  }

  const submitData = await submitRes.json()
  const requestId = submitData.request_id
  console.log(`[worker]   Seedance ref2v task: ${requestId}`)
  return pollSeedanceJob(endpoint, requestId, Number(duration), `character clip ${duration}s w/ lip-sync (seedance 2.0 ref2v)`, ledger, perSec)
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

async function stitchAndUpload(clipUrls, bookId, title, authorName, narrationTracks = [], musicAudioPath = null, characterLines = []) {
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

  // ── Measure the full video timeline ─────────────────────────────────────────
  // Total video duration = sum of all clip durations + end card. The audio MUST
  // fill this whole length (a previous bug clamped audio to the narrator's length,
  // leaving the last ~18s including the end card silent).
  const clipDurations = clipPaths.map(p => {
    try {
      return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${p}`).toString().trim()) || 0
    } catch { return 0 }
  })
  let endCardDur = 0
  if (endCardPath) {
    try { endCardDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${endCardPath}`).toString().trim()) || 0 } catch {}
  }
  const clipsTotal = clipDurations.reduce((a, b) => a + b, 0)
  const videoTotal = clipsTotal + endCardDur
  console.log(`[worker]   Video timeline: ${clipsTotal.toFixed(1)}s clips + ${endCardDur.toFixed(1)}s end card = ${videoTotal.toFixed(1)}s total`)

  // ── Place per-scene voice tracks on the timeline ────────────────────────────
  // Both narration beats AND character lines are tied to a clipIndex; their start
  // time is the cumulative duration of all prior clips (+ a small lead-in for air).
  // NO atempo stretching anymore — each beat is short and naturally sized to its
  // clip, so the narrator speaks in time with the cuts and falls silent between
  // them (the cinematic cadence). This replaces the old single-block VO + stretch.
  const clipStart = []
  {
    let acc = 0
    for (let i = 0; i < clipDurations.length; i++) { clipStart[i] = acc; acc += clipDurations[i] }
  }

  const probeDur = (p, fallback) => {
    try { return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${p}`).toString().trim()) || fallback } catch { return fallback }
  }

  // Narration beats: short phrase per selected scene. Start near the top of the clip
  // (0.5s lead-in) so it reads as "narrator speaking over this shot". If a beat would
  // overrun its clip, that's fine — it simply tails into the next cut.
  const narrationPlaced = []
  if (Array.isArray(narrationTracks)) {
    for (const nb of narrationTracks) {
      if (nb.clipIndex == null || nb.clipIndex < 0 || nb.clipIndex >= clipPaths.length) continue
      if (!nb.path || !existsSync(nb.path)) continue
      const dur = probeDur(nb.path, 2.0)
      const start = clipStart[nb.clipIndex] + 0.5
      narrationPlaced.push({ path: nb.path, start, end: start + dur })
    }
  }
  if (narrationPlaced.length > 0) {
    console.log(`[worker]   Narration beats placed: ` +
      narrationPlaced.map(n => `@${n.start.toFixed(1)}s(${(n.end - n.start).toFixed(1)}s)`).join(' '))
  }

  // Character lines: centered within their clip so they have air before AND after.
  const usableLines = []
  if (Array.isArray(characterLines) && characterLines.length > 0) {
    for (const ln of characterLines) {
      if (ln.clipIndex == null || ln.clipIndex < 0 || ln.clipIndex >= clipPaths.length) continue
      if (!ln.path || !existsSync(ln.path)) continue
      const lineDur = probeDur(ln.path, 2.5)
      const spare = Math.max(0, clipDurations[ln.clipIndex] - lineDur)
      const lead = Math.min(1.2, spare / 2)
      const start = clipStart[ln.clipIndex] + lead
      usableLines.push({ path: ln.path, start, end: start + lineDur })
    }
  }

  // ── Unified audio mix ───────────────────────────────────────────────────────
  // Per-scene cadence: narration beats + character lines are each placed at their
  // clip's timestamp (short, naturally sized — no stretching). Music plays as a bed
  // underneath, DUCKS under every voice window (narration or line), and SWELLS in the
  // gaps + end card so the trailer breathes between beats and ends on a musical high.
  const hasVoice = narrationPlaced.length > 0 || usableLines.length > 0
  if (hasVoice || musicAudioPath) {
    const parts = []
    const extraInputs = []   // ffmpeg -i args appended after clips/endcard
    let idx = allInputs.length
    const mixLabels = []

    // All voice windows (narration beats + character lines) — used to duck music.
    const voiceWindows = [...narrationPlaced, ...usableLines]
    // The last moment any voice is speaking — music swells AFTER this.
    const lastVoiceEnd = voiceWindows.length > 0 ? Math.max(...voiceWindows.map(w => w.end)) : 0

    // Narration beats: delay to scene timestamp, gentle 120ms in/out fade, full level.
    narrationPlaced.forEach((n, i) => {
      const nIdx = idx++; extraInputs.push(`-i ${n.path}`)
      const d = Math.round(n.start * 1000)
      parts.push(
        `[${nIdx}:a]adelay=${d}|${d},afade=t=in:st=${n.start.toFixed(2)}:d=0.12,` +
        `afade=t=out:st=${(n.end - 0.12).toFixed(2)}:d=0.12,volume=1.1[nb${i}]`
      )
      mixLabels.push(`[nb${i}]`)
    })

    // Character lines: delay to their timestamp, gentle 150ms fades, slightly hot.
    usableLines.forEach((l, i) => {
      const lIdx = idx++; extraInputs.push(`-i ${l.path}`)
      const d = Math.round(l.start * 1000)
      parts.push(
        `[${lIdx}:a]adelay=${d}|${d},afade=t=in:st=${l.start.toFixed(2)}:d=0.15,` +
        `afade=t=out:st=${(l.end - 0.15).toFixed(2)}:d=0.15,volume=1.5[ln${i}]`
      )
      mixLabels.push(`[ln${i}]`)
    })

    // Music: loop to cover the WHOLE video. Sits low (0.28) under voice, swells to 0.6
    // in the gaps + after the last beat, fades out over the final 3s (the button).
    if (musicAudioPath) {
      const mIdx = idx++; extraInputs.push(`-stream_loop -1 -i ${musicAudioPath}`)
      const fadeStart = Math.max(0, videoTotal - 3)
      let volExpr
      if (voiceWindows.length > 0) {
        // Duck (0.28) during any voice window, swell (0.6) everywhere else.
        const duckExpr = voiceWindows.map(w => `between(t,${w.start.toFixed(2)},${w.end.toFixed(2)})`).join('+')
        volExpr = `if(gt(${duckExpr},0),0.28,0.6)`
      } else {
        volExpr = '0.6'
      }
      parts.push(
        `[${mIdx}:a]atrim=0:${videoTotal.toFixed(2)},` +
        `volume='${volExpr}':eval=frame,` +
        `afade=t=out:st=${fadeStart.toFixed(2)}:d=3[mus]`
      )
      mixLabels.push('[mus]')
    }

    let finalAudioLabel
    if (mixLabels.length === 1) {
      finalAudioLabel = mixLabels[0]
    } else {
      // Mix everything across the FULL video length (duration=longest, normalize=0).
      parts.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=longest:normalize=0:dropout_transition=0[aout]`)
      finalAudioLabel = '[aout]'
    }

    const audioFilter = parts.join(';')
    execSync(
      `ffmpeg ${inputArgs} ${extraInputs.join(' ')} ` +
      `-filter_complex "${filterComplex};${audioFilter}" ` +
      `-map "[out]" -map "${finalAudioLabel}" ` +
      `-c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p ` +
      `-movflags +faststart ${outputPath} -y 2>&1`
    )
    console.log(`[worker]   FFmpeg mix complete — narration beats:${narrationPlaced.length} music:${!!musicAudioPath} lines:${usableLines.length} (last voice ends @${lastVoiceEnd.toFixed(1)}s) over ${videoTotal.toFixed(1)}s`)
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

// ── Voiceover beats (Anthropic or OpenRouter) ─────────────────────────────────
// SPARSE per-scene narration: returns a small array of short beats, each tied to a
// scene_number, NOT one continuous block. The narrator speaks a punchy phrase over
// some scenes and stays SILENT on others — the cinematic trailer cadence. Beats are
// placed at their scene's timestamp downstream (no time-stretching).
//   scenes: [{ scene_number, description }, ...] (the scenes actually being rendered)
//   returns: [{ scene_number, text }, ...]  (subset of scenes; ~half, max 8 words each)
async function generateVoiceoverBeats(bookTitle, scenes, tone, ledger = null) {
  // Sparse: narrate roughly half the scenes (min 1), so there's musical breathing room.
  const beatCount = Math.max(1, Math.round(scenes.length / 2))
  const sceneList = scenes.map(s => `Scene ${s.scene_number}: ${s.description}`).join('\n')
  const userContent =
    `Book trailer for "${bookTitle}". Tone: ${tone}.\n` +
    `Scenes (in order):\n${sceneList}\n\n` +
    `Write ${beatCount} short voiceover beat(s) spread across these scenes. Choose the ${beatCount} most ` +
    `evocative scene(s) to narrate and leave the rest silent (music only). The FINAL beat should weave ` +
    `in the book title "${bookTitle}" as part of a full phrase (e.g. "His name was ${bookTitle}." — NOT the bare title alone).`
  const systemPrompt =
    `You are a voiceover writer for cinematic book trailers. You write SPARSE, punchy narration — ` +
    `a few short phrases timed to individual shots, never a continuous paragraph. ` +
    `RULES:\n` +
    `- Each beat is a COMPLETE evocative phrase of 3–8 words. Never a single bare word or just a name.\n` +
    `- Fewer words = more cinematic, but it must read as a line of narration, not a label.\n` +
    `- Do NOT narrate every scene — pick the most evocative ones; silence between beats is intentional.\n` +
    `- No character names in the first beat. Build dread/tension. The final beat works the title into a phrase.\n` +
    `Return ONLY a JSON array, no markdown, each item: {"scene_number": <number>, "text": "<phrase>"}.`

  const raw = await (async () => {
    if (!isPlaceholder(ANTHROPIC_API_KEY)) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
      if (ledger) ledger.add('voiceover beats (claude sonnet)', 'llm', llmCost(message.usage))
      return message.content[0].type === 'text' ? message.content[0].text : ''
    }
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
    if (ledger) ledger.add('voiceover beats (claude sonnet via openrouter)', 'llm', llmCost(data.usage))
    return data.choices?.[0]?.message?.content || ''
  })()

  // Parse the JSON array defensively (strip markdown fences if present).
  try {
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim()
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start === -1 || end === -1) return []
    const arr = JSON.parse(cleaned.slice(start, end + 1))
    const valid = scenes.map(s => s.scene_number)
    return (Array.isArray(arr) ? arr : [])
      .filter(b => b && typeof b.text === 'string' && b.text.trim() && valid.includes(b.scene_number))
      .map(b => ({ scene_number: b.scene_number, text: b.text.trim() }))
  } catch (e) {
    console.log('[worker]   Voiceover beat parse failed (non-fatal, narrator-less):', e.message)
    return []
  }
}

// ── Voiceover audio (ElevenLabs v3 via fal.ai) ───────────────────────────────
async function generateVoiceoverAudio(script, tmpDir, ledger = null, fileTag = '') {
  if (!script || script.trim().length === 0) return null
  console.log(`[worker]   Generating voiceover audio${fileTag ? ` (${fileTag})` : ''}...`)

  // ElevenLabs eleven_v3 via fal.ai — deep cinematic narrator voice
  const res = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: script,
      voice: NARRATOR_VOICE, // 'Daniel' — deep, cinematic. NOTE: must be `voice` (name); voice_id is ignored.
      stability: 0.5,
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

  const audioPath = join(tmpDir, `voiceover${fileTag ? `-${fileTag}` : ''}.mp3`)
  writeFileSync(audioPath, audioBuffer)
  console.log(`[worker]   Voiceover audio saved: ${audioBuffer.length} bytes`)
  if (ledger) ledger.add(`narrator voiceover (${script.length} chars, elevenlabs v3)`, 'fal', (script.length / 1000) * PRICING.tts_per_1k_char)
  return audioPath
}

// ── Trailer music bed (Stable Audio via fal.ai) ──────────────────────────────
// Maps a book genre to an instrumental cinematic-trailer music prompt. Music_mood
// from the screenplay step isn't persisted, so we derive a reliable mood from genre
// — this works for every existing book with no schema migration.
const GENRE_MUSIC_MOOD = {
  horror: 'dark cinematic horror trailer score, ominous low drones, dissonant strings, tense building dread, sparse piano, deep impacts',
  gothic: 'gothic cinematic trailer score, haunting solo cello, mournful choir, candlelit melancholy, slow building tension',
  thriller: 'tense cinematic thriller trailer score, driving pulse, staccato strings, rising suspense, dramatic percussion hits',
  mystery: 'mysterious cinematic trailer score, intriguing pizzicato strings, soft piano, curious unfolding tension',
  paranormal: 'eerie supernatural cinematic trailer score, ethereal pads, ghostly choir, shimmering tension, unsettling atmosphere',
  romance: 'sweeping romantic cinematic trailer score, emotive piano, warm strings, swelling orchestral emotion',
  fantasy: 'epic fantasy cinematic trailer score, soaring orchestra, heroic brass, magical choir, grand adventure',
  'sci-fi': 'epic sci-fi cinematic trailer score, pulsing synth, cinematic braams, futuristic orchestral tension',
  scifi: 'epic sci-fi cinematic trailer score, pulsing synth, cinematic braams, futuristic orchestral tension',
  adventure: 'epic adventure cinematic trailer score, driving orchestra, heroic brass, propulsive percussion',
  drama: 'emotional cinematic trailer score, intimate piano, building strings, poignant swell',
}

function musicMoodForGenre(genre) {
  const key = (genre || '').toLowerCase().trim()
  for (const g of Object.keys(GENRE_MUSIC_MOOD)) {
    if (key.includes(g)) return GENRE_MUSIC_MOOD[g]
  }
  return 'epic cinematic trailer score, dramatic orchestra, building tension, emotional swell, atmospheric'
}

// Generate an instrumental music bed sized to the trailer length. Non-fatal:
// if it fails we simply ship the trailer with voiceover-only audio.
async function generateMusicBed(genre, durationSeconds, tmpDir, ledger = null) {
  console.log(`[worker]   Generating music bed (${durationSeconds}s, genre=${genre || 'n/a'})...`)
  const prompt = musicMoodForGenre(genre)
  // Stable Audio bakes BOTH a ~8s soft intro ramp (silence → full energy) AND a ~4s
  // outro fade into whatever length it generates. If we use the raw clip, the intro
  // ramp shows up as a dropout under any SILENT scene early on, and the outro fade
  // kills the end card. Fix: request EXTRA seconds (so both baked envelopes fall
  // OUTSIDE our usable region), then strip the intro ramp AND the outro tail below.
  // Net result: the audio we actually mix is all full-energy and OUR code owns every
  // fade. Stable Audio caps at ~47s; we loop the clean segment to fill if longer.
  const INTRO_RAMP = 8   // seconds of baked intro ramp-up stable-audio adds at the start
  const OUTRO_FADE = 4   // seconds of baked outro fade stable-audio adds at the end
  const TAIL_PAD = INTRO_RAMP + OUTRO_FADE + 4  // extra seconds so both envelopes fall outside our region
  const reqSeconds = Math.min(Math.max(Math.ceil(durationSeconds) + TAIL_PAD, 10), 47)

  const res = await fetch('https://fal.run/fal-ai/stable-audio', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      seconds_total: reqSeconds,
      steps: 100
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Music gen failed ${res.status}: ${err.substring(0, 200)}`)
  }

  const data = await res.json()
  const musicUrl = data.audio_file?.url || data.audio?.url || data.url || null
  if (!musicUrl) throw new Error('Music gen returned no audio URL')

  const musicRes = await fetch(musicUrl)
  if (!musicRes.ok) throw new Error(`Music download failed: ${musicRes.status}`)
  const musicBuffer = Buffer.from(await musicRes.arrayBuffer())

  const rawPath = join(tmpDir, 'music-raw.mp3')
  writeFileSync(rawPath, musicBuffer)

  // Strip BOTH the baked intro ramp (from the start) and outro fade (from the end),
  // THEN run dynaudnorm to flatten any residual envelope so the bed is uniformly
  // full-energy end-to-end. Fixed-second trimming alone is fragile (stable-audio's
  // fade lengths vary), so normalization is the real guarantee: no dropouts under
  // silent scenes, and the loop boundary is seamless. The mix stage still owns the
  // final swell + 3s button fade at the real trailer end.
  const musicPath = join(tmpDir, 'music.mp3')
  try {
    const rawDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${rawPath}`).toString().trim()) || reqSeconds
    const keep = Math.max(8, rawDur - INTRO_RAMP - OUTRO_FADE)
    // Re-encode (not -c copy) because we cut mid-stream from a non-keyframe start.
    // dynaudnorm (f=200ms frames, g=15 gaussian window) gently levels the bed without
    // audible pumping, erasing any leftover intro/outro taper the fixed trim missed.
    execSync(`ffmpeg -ss ${INTRO_RAMP} -i ${rawPath} -t ${keep.toFixed(2)} -af dynaudnorm=f=200:g=15 -c:a libmp3lame -q:a 2 -y ${musicPath} 2>&1`)
    console.log(`[worker]   Music bed trimmed+leveled: ${rawDur.toFixed(1)}s raw → ${keep.toFixed(1)}s uniform full-energy (stripped ${INTRO_RAMP}s intro + ${OUTRO_FADE}s outro, dynaudnorm flattened)`)
  } catch (e) {
    console.log('[worker]   Music trim failed (non-fatal, using raw bed):', e.message)
    writeFileSync(musicPath, musicBuffer)
  }
  console.log(`[worker]   Music bed saved: ${musicBuffer.length} bytes`)
  if (ledger) ledger.add('music bed (stable-audio)', 'fal', PRICING.music_bed)
  return musicPath
}

// ── Character spoken lines (punchy dialogue + lip-sync) ───────────────────────
// A trailer is narrator-driven, but ONE or TWO punchy character lines at key
// moments make people stop scrolling. We pick them at pipeline time (no schema
// change), voice each character distinctly, then lip-sync the line onto its clip.

// ElevenLabs voices via fal.ai. CRITICAL: the eleven-v3 endpoint uses the `voice`
// NAME param — `voice_id` is silently ignored and falls back to the default (Rachel),
// which made every character sound like the narrator. These are verified-supported
// voice names. Narrator = "Daniel" (deep, authoritative); characters get DISTINCT
// voices so a spoken line clearly reads as the character, never the narrator.
const NARRATOR_VOICE = 'Daniel'
const CHARACTER_VOICES = {
  deep_male:    'George',    // mature, resonant male — distinct from Daniel
  male:         'Liam',      // younger male
  old_male:     'Bill',      // older male
  female:       'Charlotte', // clear female (distinct from default Rachel)
  young_female: 'Alice',     // younger female
  default:      'Charlie',
}

function voiceNameFor(voiceKey) {
  return CHARACTER_VOICES[(voiceKey || '').toLowerCase().trim()] || CHARACTER_VOICES.default
}

// Ask the LLM to pick at most `maxLines` short, iconic character lines, each tied
// to a scene where that character is visibly present (face on screen) so lip-sync
// has a face to work with. Returns [] on any problem — lines are a bonus, never required.
async function selectCharacterLines(bookTitle, genre, characters, scenes, maxLines, ledger = null) {
  if (!characters || characters.length === 0 || maxLines < 1) return []

  const charBlock = characters.map(c =>
    `- ${c.name} (${c.role || 'character'}): ${(c.description || '').slice(0, 200)} | appearance: ${(c.appearance_notes || '').slice(0, 160)}`
  ).join('\n')
  const sceneBlock = scenes.map(s =>
    `Scene ${s.scene_number} — "${s.title || ''}": ${(s.description || '').slice(0, 220)}`
  ).join('\n')

  const systemPrompt = `You are a trailer editor choosing the ONE or TWO most iconic spoken lines for a cinematic book trailer for "${bookTitle}" (genre: ${genre || 'drama'}). The trailer is mostly narrator + music; a character speaking is a rare punch. Rules:
- Return AT MOST ${maxLines} line(s). Fewer is better than forcing a weak one. It is OK to return an empty array.
- Each line must be SHORT (3-9 words), punchy, quotable, in-character, and faithful to the book's voice.
- Tie each line to a scene where that character is clearly PRESENT and likely facing camera (needs a visible face for lip-sync). Prefer close/medium shots over wide establishing shots.
- Spread lines across different scenes; never two lines in the same scene.
- No explicit content. No narration-style lines (those belong to the narrator).
- For "voice", classify the character's likely voice as one of: deep_male, male, old_male, female, young_female.
Return ONLY a JSON array, no markdown:
[{"scene_number": <int>, "character_name": "<string>", "line": "<string>", "voice": "<one of the categories>"}]`

  const userContent = `CHARACTERS:\n${charBlock}\n\nSCENES (these become the trailer clips):\n${sceneBlock}\n\nPick the best ${maxLines} character line(s).`

  let raw = ''
  try {
    if (!isPlaceholder(ANTHROPIC_API_KEY)) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
      raw = message.content[0].type === 'text' ? message.content[0].text : ''
      if (ledger) ledger.add('character-line selection (claude sonnet)', 'llm', llmCost(message.usage))
    } else {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-5',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }]
        })
      })
      const data = await res.json()
      raw = data.choices?.[0]?.message?.content || ''
      if (ledger) ledger.add('character-line selection (claude sonnet via openrouter)', 'llm', llmCost(data.usage))
    }
  } catch (e) {
    console.log('[worker]   Character-line selection LLM call failed (non-fatal):', e.message)
    return []
  }

  // Strip any code fences and parse the JSON array.
  try {
    const cleaned = raw.replace(/```json?/gi, '').replace(/```/g, '').trim()
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start === -1 || end === -1) return []
    const arr = JSON.parse(cleaned.slice(start, end + 1))
    if (!Array.isArray(arr)) return []
    // Validate + clamp.
    const valid = arr
      .filter(l => l && typeof l.scene_number === 'number' && typeof l.line === 'string' && l.line.trim().length > 0)
      .slice(0, maxLines)
    return valid
  } catch (e) {
    console.log('[worker]   Character-line JSON parse failed (non-fatal):', e.message)
    return []
  }
}

// TTS a single character line. Returns { url, path } — url is the fal-hosted public
// MP3 (fed straight to the lip-sync model), path is the local copy for the final mix.
async function generateCharacterLineAudio(line, voiceKey, tmpDir, sceneNumber, ledger = null) {
  const res = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: line,
      voice: voiceNameFor(voiceKey), // must be `voice` (name); voice_id is silently ignored by the API
      stability: 0.45,
      output_format: 'mp3_44100_128'
    })
  })
  if (!res.ok) throw new Error(`Line TTS failed ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const data = await res.json()
  const audioUrl = data.audio?.url || data.url || null
  if (!audioUrl) throw new Error('Line TTS returned no audio URL')

  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Line audio download failed: ${audioRes.status}`)
  const buf = Buffer.from(await audioRes.arrayBuffer())
  const path = join(tmpDir, `line-scene-${sceneNumber}.mp3`)
  writeFileSync(path, buf)
  if (ledger) ledger.add(`character line TTS (${line.length} chars, elevenlabs v3)`, 'fal', (line.length / 1000) * PRICING.tts_per_1k_char)
  return { url: audioUrl, path }
}

// Lip-sync a clip to a line of audio via fal-ai/sync-lipsync/v2. Returns a new
// public video URL (stitch downloads it like any other clip). Throws on failure
// so the caller can fall back to the original clip.
async function lipSyncClip(videoUrl, audioUrl, sceneNumber, clipSeconds = 10, ledger = null) {
  console.log(`[worker]   Scene ${sceneNumber}: lip-syncing character line...`)
  const res = await fetch('https://fal.run/fal-ai/sync-lipsync/v2', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
    // sync_mode: 'silence' — the spoken line is shorter than the clip; keep the FULL
    // clip length and leave the mouth still after the line ends (speaks once, then quiet).
    body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl, sync_mode: 'silence' })
  })
  if (!res.ok) throw new Error(`Lip-sync failed ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const data = await res.json()
  const url = data.video?.url || data.url || null
  if (!url) throw new Error('Lip-sync returned no video URL')
  // Billed at $3/min of video processed (the whole clip, not just the spoken portion).
  if (ledger) ledger.add(`lip-sync ${clipSeconds}s clip (sync-lipsync v2)`, 'fal', clipSeconds * PRICING.lipsync_per_sec)
  return url
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
  const { bookId, tier, quality = 'standard' } = job
  console.log(`\n[worker] ▶ Starting pipeline: bookId=${bookId} tier=${tier} quality=${quality}`)

  // Select Seedance endpoints + pricing based on quality requested by the user
  //   standard → Seedance Fast (720p, $0.2419/s, 80 credits)
  //   premium  → Seedance Standard (1080p, $0.3024/s, 150 credits)
  const isPremiun = quality === 'premium'
  const i2vEndpoint  = isPremiun ? 'https://queue.fal.run/bytedance/seedance-2.0/image-to-video'      : 'https://queue.fal.run/bytedance/seedance-2.0/fast/image-to-video'
  const refEndpoint  = isPremiun ? 'https://queue.fal.run/bytedance/seedance-2.0/reference-to-video'  : 'https://queue.fal.run/bytedance/seedance-2.0/fast/reference-to-video'
  const perSec       = isPremiun ? 0.3024 : 0.2419
  const resolution   = isPremiun ? '1080p' : '720p'
  console.log(`[worker]   Video: Seedance 2.0 ${quality.toUpperCase()} — ${resolution} @ $${perSec}/s`)

  await updateTrailerStatus(bookId, 'processing')

  // Per-render cost ledger — every billable generation appends to this so we can
  // print a full cost breakdown when the trailer completes.
  const ledger = makeLedger()

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

  // Voiceover beats are generated AFTER we know which scenes are actually rendering
  // (see below, near character-line selection) so each beat ties to a real clip.
  const tmpDir = `/tmp/bookreel-${bookId}`
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  // Music bed — derive mood from genre, size to the trailer length. Non-fatal.
  let musicAudioPath = null
  try {
    // Estimate trailer length: clips × per-clip length (+ ~4s end card).
    // Respect TEST_MAX_CLIPS so short test renders get a correctly-sized music bed.
    // Seedance 2.0: 10s clips give cinematic breathing room.
    //   Author: 4 clips × 10s = 40s
    //   Pro:    7 clips × 10s = 70s
    const baseClips = tier === 'pro' ? 7 : 4
    const estClips = TEST_MAX_CLIPS > 0 ? Math.min(baseClips, TEST_MAX_CLIPS) : baseClips
    const estClipLen = 10
    const estDuration = estClips * estClipLen + 4
    musicAudioPath = await generateMusicBed(book.genre || 'dramatic', estDuration, tmpDir, ledger)
    if (musicAudioPath) console.log('[worker]   Music bed ready')
  } catch (e) {
    console.error('[worker]   Music bed failed (non-fatal, shipping without music):', e.message)
  }

  // Determine max scenes based on tier. Seedance 2.0 supports 4–15s clips.
  // We use 10s for cinematic breathing room.
  //   Author: 4 clips × 10s = 40s
  //   Pro:    7 clips × 10s = 70s
  // TEST_MAX_CLIPS (env) caps this for short troubleshooting renders (e.g. 2 = ~20s).
  const sceneLength = 10
  let maxScenes = tier === 'pro' ? 7 : 4
  if (TEST_MAX_CLIPS > 0) {
    maxScenes = Math.min(maxScenes, TEST_MAX_CLIPS)
    console.log(`[worker]   ⚠ TEST MODE: capping to ${maxScenes} clips (~${maxScenes * sceneLength}s) to save credits`)
  }
  const scenesToGenerate = scenes.slice(0, maxScenes)

  // Character punch-lines — pick 1 (Author) or 2 (Pro) iconic spoken lines, voiced
  // per-character and lip-synced onto their scene. Fully non-fatal: any failure just
  // ships the trailer narrator-only. Keyed by scene_number so the loop knows which
  // clip to lip-sync. Only scenes in scenesToGenerate are eligible.
  const tmpDirLines = `/tmp/bookreel-${bookId}`
  if (!existsSync(tmpDirLines)) mkdirSync(tmpDirLines, { recursive: true })
  const maxLines = tier === 'pro' ? 2 : 1
  const lineBySceneNumber = new Map()
  try {
    const { data: characters } = await supabase.from('characters').select('*').eq('book_id', bookId)
    const eligibleSceneNumbers = new Set(scenesToGenerate.map(s => s.scene_number))
    const selected = await selectCharacterLines(book.title, book.genre, characters || [], scenesToGenerate, maxLines, ledger)
    for (const ln of selected) {
      if (!eligibleSceneNumbers.has(ln.scene_number)) continue
      if (lineBySceneNumber.has(ln.scene_number)) continue // one line per scene
      lineBySceneNumber.set(ln.scene_number, ln)
    }
    if (lineBySceneNumber.size > 0) {
      console.log(`[worker]   Selected ${lineBySceneNumber.size} character line(s): ` +
        [...lineBySceneNumber.values()].map(l => `S${l.scene_number} ${l.character_name}: "${l.line}"`).join(' | '))
    } else {
      console.log('[worker]   No character lines selected (narrator-only trailer)')
    }
  } catch (e) {
    console.error('[worker]   Character-line selection failed (non-fatal, narrator-only):', e.message)
  }

  // Narration beats — SPARSE per-scene narrator phrases tied to the scenes we're
  // actually rendering. Each beat is rendered to its own TTS file keyed by scene
  // number, then placed at that scene's timestamp during the mix. Non-fatal.
  // IMPORTANT: a scene gets EITHER a character line OR a narration beat, never both —
  // otherwise the narrator and the character talk over each other in the same clip.
  // We exclude scenes that already have a character line before asking for beats.
  const narrationBySceneNumber = new Map()
  try {
    const lineSceneNumbers = new Set(lineBySceneNumber.keys())
    const narrationEligibleScenes = scenesToGenerate.filter(s => !lineSceneNumbers.has(s.scene_number))
    if (narrationEligibleScenes.length === 0) {
      console.log('[worker]   No scenes free for narration (all have character lines) — skipping beats')
    } else {
      const beats = await generateVoiceoverBeats(book.title, narrationEligibleScenes, book.genre || 'dramatic', ledger)
      for (const b of beats) {
        if (narrationBySceneNumber.has(b.scene_number)) continue
        if (lineSceneNumbers.has(b.scene_number)) continue // belt-and-suspenders: never share a scene with dialogue
        const path = await generateVoiceoverAudio(b.text, tmpDir, ledger, `beat-s${b.scene_number}`)
        if (path) narrationBySceneNumber.set(b.scene_number, { text: b.text, path })
      }
    }
    if (narrationBySceneNumber.size > 0) {
      console.log(`[worker]   Narration beats: ` +
        [...narrationBySceneNumber.entries()].map(([sn, b]) => `S${sn}: "${b.text}"`).join(' | '))
    } else {
      console.log('[worker]   No narration beats (music-only trailer)')
    }
  } catch (e) {
    console.error('[worker]   Narration-beat generation failed (non-fatal, music-only):', e.message)
  }

  console.log(`[worker]   Generating ${scenesToGenerate.length} clips (max ${maxScenes} for ${tier})...`)

  // ── Character reference library (OpenArt pattern) ──────────────────────────
  // Generate one clean portrait per character BEFORE the scene loop.
  // Stored on the characters row (reference_image_url) so it's reused if we re-render.
  // Each scene then gets the refs for its characters_present injected into image gen.
  const characterRefMap = new Map() // character name → { name, imageUrl }
  try {
    const { data: allCharacters } = await supabase.from('characters').select('*').eq('book_id', bookId)
    if (allCharacters && allCharacters.length > 0) {
      console.log(`[worker]   Building character reference library for ${allCharacters.length} character(s)...`)
      for (const char of allCharacters) {
        try {
          let refUrl = char.reference_image_url || null
          if (!refUrl) {
            refUrl = await generateCharacterReferenceImage(char, ledger)
            // Persist so future re-renders skip this step
            await supabase.from('characters').update({ reference_image_url: refUrl }).eq('id', char.id)
          } else {
            console.log(`[worker]   Using cached ref for "${char.name}"`)
          }
          characterRefMap.set(char.name, { name: char.name, imageUrl: refUrl })
        } catch (refErr) {
          console.error(`[worker]   Character ref for "${char.name}" failed (non-fatal, continuing without ref):`, refErr.message)
        }
      }
      console.log(`[worker]   Character library ready: ${[...characterRefMap.keys()].join(', ')}`)
    }
  } catch (e) {
    console.error('[worker]   Character library build failed (non-fatal):', e.message)
  }

  const clipUrls = []
  const rejectedScenes = []
  const characterLineTracks = []  // { clipIndex, path } → passed to stitch for timed mixing
  const narrationTracks = []      // { clipIndex, path } → per-scene narrator beats
  let firstSceneImageUrl = null  // auto-cover if book has none

  for (const scene of scenesToGenerate) {
    try {
      console.log(`[worker]   Scene ${scene.scene_number}: generating image...`)

      // Resolve character reference images for this scene's characters_present
      const sceneCharRefs = []
      const charactersPresent = scene.characters_present || []
      for (const charName of charactersPresent) {
        const ref = characterRefMap.get(charName)
        if (ref) sceneCharRefs.push(ref)
      }
      if (sceneCharRefs.length > 0) {
        console.log(`[worker]   Scene ${scene.scene_number}: using refs for ${sceneCharRefs.map(c => c.name).join(', ')}`)
      }

      // Ask Claude to pick the best camera movement for this scene (non-fatal)
      let cameraMovement = scene.screenplay_text || null
      try {
        cameraMovement = await selectCameraMovement(
          scene.description,
          scene.screenplay_text,
          book.genre || 'dramatic',
          scene.duration_seconds || sceneLength,
          ledger
        )
        if (cameraMovement && cameraMovement !== scene.screenplay_text) {
          console.log(`[worker]   Scene ${scene.scene_number}: camera movement → "${cameraMovement}"`)
        }
      } catch (camErr) {
        console.error(`[worker]   Scene ${scene.scene_number}: camera selection failed (non-fatal):`, camErr.message)
      }

      // If this scene will be lip-synced, generate a proper character portrait:
      // full face, front-facing, clear defined features — essentially a character
      // reference sheet pose. Gives Kling the best possible face geometry to work
      // with so the lip-sync model doesn't have to guess from a partial/angled shot.
      // willLipSync is also used by the video-clip call below.
      const willLipSync = lineBySceneNumber.has(scene.scene_number)
      const imageDescription = willLipSync
        ? `${scene.description}, full character portrait, face directly toward camera, front-facing headshot, both eyes clearly visible, symmetrical framing, neutral expression, sharp facial detail, cinematic portrait lighting, full face in frame`
        : scene.description

      // Generate image and upload to Supabase (so URL doesn't expire)
      let imageUrl = await generateSceneImage(imageDescription, book.genre || 'dramatic', ledger, sceneCharRefs)

      // Save first scene image as book cover if no cover is set
      if (scene.scene_number === scenesToGenerate[0].scene_number && !book.cover_image_url) {
        firstSceneImageUrl = imageUrl
      }

      // Generate video. Runway failures come in two flavors:
      //  - DETERMINISTIC (isModeration / isBadOutput / isRateLimit): a retry with a
      //    fresh image fails identically and just burns the daily task cap. Bail at once.
      //  - TRANSIENT (network blip, timeout): worth one fresh-image retry.
      console.log(`[worker]   Scene ${scene.scene_number}: generating video clip (lip-sync: ${willLipSync})...`)
      // Lip-sync scenes: keep head steady + facing camera so sync model can track well.
      // Non-lip-sync: suppress talking (flapping lips with no audio looks broken).
      const videoDescription = willLipSync
        ? `${scene.description}, character looking directly at camera, minimal head movement, steady close-up`
        : scene.description
      let clipUrl
      try {
        clipUrl = await generateVideoClip(imageUrl, videoDescription, sceneLength, cameraMovement, ledger, !willLipSync, i2vEndpoint, resolution, perSec)
      } catch (clipErr) {
        // Non-retryable: moderation, internal bad-output, or daily-cap. Don't waste generations.
        if (clipErr.isModeration || clipErr.isBadOutput || clipErr.isRateLimit) throw clipErr
        console.log(`[worker]   Scene ${scene.scene_number}: ⚠ attempt 1 failed (${clipErr.message}), regenerating image + retrying once in 15s...`)
        await new Promise(r => setTimeout(r, 15000))
        imageUrl = await generateSceneImage(imageDescription, book.genre || 'dramatic', ledger, sceneCharRefs)
        clipUrl = await generateVideoClip(imageUrl, videoDescription, sceneLength, cameraMovement, ledger, !willLipSync, i2vEndpoint, resolution, perSec)
      }
      console.log(`[worker]   Scene ${scene.scene_number}: ✅ ${clipUrl.substring(0, 80)}`)

      // Character punch-line: if this scene was chosen, use Seedance reference-to-video
      // to generate the clip WITH native lip-sync baked in (image + TTS audio → synced video).
      // Non-fatal — on any failure we keep the original clip and skip the line.
      const chosenLine = lineBySceneNumber.get(scene.scene_number)
      if (chosenLine) {
        try {
          // Generate TTS audio for the character line
          const { url: lineAudioUrl, path: lineAudioPath } =
            await generateCharacterLineAudio(chosenLine.line, chosenLine.voice, tmpDirLines, scene.scene_number, ledger)
          // Replace the standard clip with a Seedance reference-to-video clip that
          // natively lip-syncs the character's voice onto their face image.
          const syncedUrl = await generateCharacterClip(imageUrl, lineAudioUrl, scene.description, sceneLength, ledger, refEndpoint, perSec)
          clipUrl = syncedUrl
          // clipUrls.length is this clip's index (we push next).
          characterLineTracks.push({ clipIndex: clipUrls.length, path: lineAudioPath })
          console.log(`[worker]   Scene ${scene.scene_number}: ✅ character line lip-synced (Seedance ref2v)`)
        } catch (lineErr) {
          console.error(`[worker]   Scene ${scene.scene_number}: character line failed (non-fatal, keeping original clip):`, lineErr.message)
        }
      }

      // Per-scene narration beat: if this scene was chosen, tie its TTS file to this
      // clip's index so the mix places it at this clip's timestamp.
      const narrationBeat = narrationBySceneNumber.get(scene.scene_number)
      if (narrationBeat) {
        narrationTracks.push({ clipIndex: clipUrls.length, path: narrationBeat.path })
      }

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
  const finalVideoUrl = await stitchAndUpload(clipUrls, bookId, book.title, authorName, narrationTracks, musicAudioPath, characterLineTracks)
  console.log('[worker]   ✅ Final video:', finalVideoUrl.substring(0, 80))

  // Auto-save cover: use first scene image if book has no cover set
  if (firstSceneImageUrl && !book.cover_image_url) {
    try {
      await supabase.from('books').update({ cover_image_url: firstSceneImageUrl }).eq('id', bookId)
      console.log('[worker]   📸 Auto-cover saved from scene 1')
    } catch (e) {
      console.log('[worker]   Auto-cover save failed (non-fatal):', e.message)
    }
  }

  await updateTrailerStatus(bookId, 'complete', { videoUrl: finalVideoUrl })

  // ── TikTok vertical cut (free — ffmpeg crop only, no AI) ─────────────────
  // Crop the center 9:16 portion of the trailer and upload as a separate file.
  // This costs $0 in AI — pure CPU. All subscription plans get this automatically.
  try {
    const tiktokPath = join(tmpDir, 'tiktok.mp4')
    // Get source dimensions to calculate center crop
    const probeOut = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${outputPath}"`,
      { encoding: 'utf8' }
    ).trim()
    const [srcW, srcH] = probeOut.split(',').map(Number)
    // Calculate 9:16 crop from center
    const cropH = srcH
    const cropW = Math.round(srcH * 9 / 16)
    const cropX = Math.round((srcW - cropW) / 2)
    execSync(
      `ffmpeg -y -i "${outputPath}" -vf "crop=${cropW}:${cropH}:${cropX}:0,scale=1080:1920:flags=lanczos" ` +
      `-c:v libx264 -preset fast -crf 22 -c:a aac -movflags +faststart "${tiktokPath}"`,
      { stdio: 'pipe' }
    )
    const tiktokBuffer = readFileSync(tiktokPath)
    const tiktokStoragePath = `trailers/${bookId}/tiktok.mp4`
    const { error: ttErr } = await supabase.storage
      .from('media')
      .upload(tiktokStoragePath, tiktokBuffer, { contentType: 'video/mp4', upsert: true })
    if (ttErr) throw new Error(ttErr.message)
    const { data: ttUrl } = supabase.storage.from('media').getPublicUrl(tiktokStoragePath)
    const tiktokUrl = `${ttUrl.publicUrl}?v=${Date.now()}`
    // Save TikTok URL to the trailer record
    await supabase.from('trailers').update({ tiktok_url: tiktokUrl }).eq('book_id', bookId)
    console.log(`[worker]   📱 TikTok vertical cut: ${tiktokUrl.substring(0, 80)}`)
  } catch (ttErr) {
    console.error('[worker]   TikTok cut failed (non-fatal):', ttErr.message)
  }

  // ── Per-render cost breakdown ──────────────────────────────────────────────
  const cost = summarizeLedger(ledger)
  const falTotal = cost.byProvider.fal || 0
  const llmTotal = cost.byProvider.llm || 0
  console.log('[worker] ┌─ 💰 RENDER COST BREAKDOWN ─────────────────────────────')
  console.log(`[worker] │ Book: "${book.title}" (${tier}) — ${clipUrls.length}/${scenesToGenerate.length} clips`)
  for (const it of cost.items) {
    console.log(`[worker] │   ${it.label.padEnd(46)} $${it.amount.toFixed(4)}  [${it.provider}]`)
  }
  console.log('[worker] │ ' + '─'.repeat(54))
  console.log(`[worker] │   fal.ai (image/video/audio/lipsync):   $${falTotal.toFixed(2)}`)
  console.log(`[worker] │   LLM (script/line selection):          $${llmTotal.toFixed(2)}`)
  console.log(`[worker] │   TOTAL THIS RENDER:                    $${cost.total.toFixed(2)}`)
  console.log('[worker] └────────────────────────────────────────────────────────')

  // Append to a persistent JSONL ledger so costs can be reviewed/aggregated later.
  try {
    const { appendFileSync } = await import('fs')
    const record = {
      ts: new Date().toISOString(),
      bookId, title: book.title, tier,
      clips: clipUrls.length, scenesPlanned: scenesToGenerate.length,
      characterLines: characterLineTracks.length,
      falCost: +falTotal.toFixed(4), llmCost: +llmTotal.toFixed(4), total: cost.total,
      items: cost.items,
    }
    appendFileSync('/root/bookreel/render-costs.jsonl', JSON.stringify(record) + '\n')
  } catch (e) {
    console.log('[worker]   Cost-ledger write failed (non-fatal):', e.message)
  }

  console.log(`[worker] ✅ Pipeline complete: bookId=${bookId}`)
}

// ── Audiobook Pipeline ─────────────────────────────────────────────────────────
// Renders each dialogue segment with its assigned voice, stitches into one MP3.
async function runAudiobookPipeline(audiobook) {
  const { id: audiobookId, bookId, segments_json: segments, narrator_voice: narratorVoice } = audiobook
  console.log(`\n[worker] 🎙 Starting audiobook: audiobookId=${audiobookId} bookId=${bookId}`)

  // Mark processing
  await supabase.from('audiobooks').update({
    status: 'processing',
    processing_started_at: new Date().toISOString(),
  }).eq('id', audiobookId)

  const tmpDir = `/tmp/bookreel-audio-${audiobookId}`
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  const segmentPaths = []
  let totalChars = 0

  // Render each segment with its assigned voice
  for (const seg of segments) {
    if (!seg.text?.trim()) continue
    const voice = seg.speaker === 'NARRATOR' ? (narratorVoice || 'Daniel') : (seg.voice_name || 'Charlie')
    console.log(`[worker]   Segment ${seg.index} [${seg.speaker}→${voice}]: ${seg.text.substring(0, 60)}...`)

    try {
      const res = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
        method: 'POST',
        headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: seg.text,
          voice,
          stability: seg.speaker === 'NARRATOR' ? 0.5 : 0.6,
          output_format: 'mp3_44100_128',
        })
      })
      if (!res.ok) {
        const err = await res.text()
        console.error(`[worker]   Segment ${seg.index} TTS failed: ${err.substring(0, 100)}`)
        continue
      }
      const data = await res.json()
      const audioUrl = data.audio?.url || data.url
      if (!audioUrl) { console.error(`[worker]   Segment ${seg.index}: no audio URL`); continue }

      const audioRes = await fetch(audioUrl)
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      const segPath = join(tmpDir, `seg-${String(seg.index).padStart(5, '0')}.mp3`)
      writeFileSync(segPath, audioBuffer)
      segmentPaths.push(segPath)
      totalChars += seg.text.length

      // Small pause between segments — 250ms silence
      const silencePath = join(tmpDir, `sil-${String(seg.index).padStart(5, '0')}.mp3`)
      execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 0.25 -q:a 9 "${silencePath}"`, { stdio: 'pipe' })
      segmentPaths.push(silencePath)

    } catch (e) {
      console.error(`[worker]   Segment ${seg.index} failed (skipping):`, e.message)
    }
  }

  if (segmentPaths.length === 0) {
    throw new Error('No audio segments were generated')
  }

  // Write ffmpeg concat list
  const concatList = join(tmpDir, 'concat.txt')
  writeFileSync(concatList, segmentPaths.map(p => `file '${p}'`).join('\n'))

  // Stitch all segments into one MP3
  const outputPath = join(tmpDir, 'audiobook.mp3')
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -q:a 4 "${outputPath}"`, { stdio: 'pipe' })

  // Upload to Supabase
  const audioBuffer = readFileSync(outputPath)
  const storagePath = `audiobooks/${bookId}/${audiobookId}.mp3`
  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })
  if (uploadErr) throw new Error(`Audio upload failed: ${uploadErr.message}`)

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
  const audioUrl = `${urlData.publicUrl}?v=${Date.now()}`

  // Get duration
  let durationSeconds = 0
  try {
    const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`, { encoding: 'utf8' }).trim()
    durationSeconds = Math.round(parseFloat(dur))
  } catch {}

  // Mark complete
  await supabase.from('audiobooks').update({
    status: 'complete',
    audio_url: audioUrl,
    duration_seconds: durationSeconds,
    processing_completed_at: new Date().toISOString(),
  }).eq('id', audiobookId)

  const cost = (totalChars / 1000) * 0.10
  console.log(`[worker] ✅ Audiobook complete: ${durationSeconds}s, ${segmentPaths.length} segments, $${cost.toFixed(2)} COGS`)
}

// ── Poll loop ─────────────────────────────────────────────────────────────────
async function pollLoop() {
  console.log('[worker] Polling queue...')
  try {
    // Poll trailer jobs
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

    // Poll audiobook jobs
    try {
      const { data: pendingAudiobooks } = await supabase
        .from('audiobooks')
        .select('id, book_id, segments_json, narrator_voice')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(3)

      for (const ab of (pendingAudiobooks || [])) {
        const key = `audio-${ab.id}`
        if (activeJobs.has(key)) continue
        activeJobs.add(key)
        runAudiobookPipeline({
          id: ab.id,
          bookId: ab.book_id,
          segments_json: ab.segments_json,
          narrator_voice: ab.narrator_voice,
        })
          .catch(async (err) => {
            console.error(`[worker] ❌ Audiobook error for ${ab.id}:`, err.message)
            await supabase.from('audiobooks').update({
              status: 'failed', error_message: err.message
            }).eq('id', ab.id)
          })
          .finally(() => { activeJobs.delete(key) })
      }
    } catch (abErr) {
      console.error('[worker] Audiobook poll error (non-fatal):', abErr.message)
    }

  } catch (err) {
    console.error('[worker] Poll error:', err.message)
  }

  setTimeout(pollLoop, POLL_INTERVAL_MS)
}

pollLoop()
