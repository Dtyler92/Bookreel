#!/usr/bin/env node
/**
 * BookReel Audiobook Pipeline Worker
 *
 * Polls /api/audiobook/queue every 15s, picks up pending jobs, and renders
 * full audiobooks (M4B with chapter markers + MP3) from ElevenLabs v3 TTS
 * via fal.ai. Stitches segments with ffmpeg, uploads to Supabase storage.
 *
 * Usage:
 *   node /root/bookreel/scripts/audiobook-worker.mjs
 *
 * Setup as systemd service or screen session:
 *   screen -S audiobook-worker -dm node /root/bookreel/scripts/audiobook-worker.mjs
 *   # or: pm2 start /root/bookreel/scripts/audiobook-worker.mjs --name audiobook-worker
 *
 * Required env vars (loaded from /root/bookreel/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PIPELINE_WORKER_SECRET  (must match what is set in Vercel)
 *   NEXT_PUBLIC_APP_URL     (e.g. https://bookreel-five.vercel.app)
 *   FAL_API_KEY             (ElevenLabs v3 TTS via fal.ai)
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

// ── Load env from .env.local ─────────────────────────────────────────────────
const envPath = new URL('../.env.local', import.meta.url).pathname
const envFile = readFileSync(envPath, 'utf8')
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

function isPlaceholder(v) {
  return !v || ['***', 'xxx', 'placeholder'].includes(v) || v.length < 10
}

const SUPABASE_URL              = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')
const PIPELINE_WORKER_SECRET    = getEnv('PIPELINE_WORKER_SECRET')
const APP_URL                   = getEnv('NEXT_PUBLIC_APP_URL') || 'https://bookreel-five.vercel.app'

// FAL key: prefer .env.local; fall back to the provisioned key when .env.local has a placeholder.
const FAL_API_KEY_ENV = getEnv('FAL_API_KEY')
const FAL_API_KEY     = isPlaceholder(FAL_API_KEY_ENV)
  ? 'b6c93d1e-a758-486e-bb6d-5ada0589298c:81db821b9d91811915283494125da0ba'
  : FAL_API_KEY_ENV

// ── Guard required vars ───────────────────────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[audiobook-worker] FATAL: SUPABASE_URL or SERVICE_ROLE_KEY not set in .env.local')
  process.exit(1)
}
if (isPlaceholder(PIPELINE_WORKER_SECRET)) {
  console.error('[audiobook-worker] FATAL: PIPELINE_WORKER_SECRET not set — set it in .env.local AND Vercel env vars')
  process.exit(1)
}
if (!FAL_API_KEY) {
  console.error('[audiobook-worker] FATAL: FAL_API_KEY is not available')
  process.exit(1)
}

const POLL_INTERVAL_MS = 15_000
const TMP_BASE         = '/tmp/bookreel-audio'

// ElevenLabs v3 pricing via fal.ai
const TTS_PER_1K_CHARS = 0.10

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── Active job tracking ───────────────────────────────────────────────────────
// Prevents duplicate processing across poll cycles while a long job is running.
const activeJobs = new Set()

// ── Chapter detection ─────────────────────────────────────────────────────────
/**
 * Returns true when the segment text looks like a chapter heading.
 * Heuristics:
 *   1. "Chapter 1", "Chapter 12", etc. (numeric)
 *   2. "Chapter I", "Chapter IV", etc. (roman numerals)
 *   3. Short ALL-CAPS line < 50 chars (e.g. "PART ONE", "PROLOGUE", "EPILOGUE")
 */
function isChapterMarker(text) {
  if (!text?.trim()) return false
  const t = text.trim()
  if (/^chapter\s+\d+/i.test(t))          return true
  if (/^chapter\s+[ivxlcdm]+\b/i.test(t)) return true
  // ALL_CAPS short line with at least one letter
  if (t.length < 50 && /[A-Z]/.test(t) && t === t.toUpperCase()) return true
  return false
}

// ── ffprobe duration helper ───────────────────────────────────────────────────
function getDurationMs(filePath) {
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim()
    const ms = Math.round(parseFloat(raw) * 1000)
    return isNaN(ms) ? 0 : ms
  } catch {
    return 0
  }
}

// ── Queue API helpers ─────────────────────────────────────────────────────────
async function fetchQueue() {
  const res = await fetch(`${APP_URL}/api/audiobook/queue`, {
    headers: { Authorization: `Bearer ${PIPELINE_WORKER_SECRET}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Queue fetch failed ${res.status}: ${text.substring(0, 200)}`)
  }
  const data = await res.json()
  return data.jobs || []
}

async function updateStatus(audiobookId, status, extra = {}) {
  try {
    const res = await fetch(`${APP_URL}/api/audiobook/queue`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PIPELINE_WORKER_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audiobookId, status, ...extra }),
    })
    if (!res.ok) {
      console.error(
        `[audiobook-worker] Status update failed for ${audiobookId} (→${status}):`,
        await res.text()
      )
    }
  } catch (e) {
    console.error(
      `[audiobook-worker] Status update threw for ${audiobookId} (→${status}):`,
      e.message
    )
  }
}

// ── TTS: generate one segment's audio and save to tmpDir ─────────────────────
async function generateSegmentAudio(seg, voice, stability, tmpDir) {
  const res = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text:          seg.text,
      voice,
      stability,
      output_format: 'mp3_44100_128',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TTS API ${res.status}: ${err.substring(0, 200)}`)
  }

  const data     = await res.json()
  const audioUrl = data.audio?.url || data.url
  if (!audioUrl) throw new Error('TTS API returned no audio URL')

  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Audio download failed: ${audioRes.status}`)

  const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
  const segPath     = join(tmpDir, `seg-${String(seg.index).padStart(5, '0')}.mp3`)
  writeFileSync(segPath, audioBuffer)
  return segPath
}

// ── Core pipeline for one audiobook job ──────────────────────────────────────
async function processJob(job) {
  const { audiobookId, bookId, narratorVoice, segmentsJson: segments } = job
  const segCount = Array.isArray(segments) ? segments.length : 0

  console.log(`\n[audiobook-worker] 🎙  Starting job: audiobookId=${audiobookId} bookId=${bookId}`)
  console.log(`[audiobook-worker]    Segments: ${segCount} | narratorVoice: ${narratorVoice || 'Daniel'}`)

  // Belt-and-suspenders: GET endpoint already claimed the job as 'processing',
  // but we POST again so processing_started_at reflects worker start time.
  await updateStatus(audiobookId, 'processing')

  const tmpDir = join(TMP_BASE, audiobookId)
  mkdirSync(tmpDir, { recursive: true })

  try {
    // ── 1. Generate TTS audio for each segment ─────────────────────────────
    // renderedSegments is an ordered list including silence spacers.
    const renderedSegments = []  // { index, path, durationMs, isChapter, chapterTitle, isSilence }
    let totalChars = 0

    for (const seg of (segments || [])) {
      if (!seg.text?.trim()) continue

      // Voice: NARRATOR uses narratorVoice arg (or seg.voice_name, fallback Daniel).
      //        Characters use their assigned voice_name from the segments_json.
      const voice     = seg.speaker === 'NARRATOR'
        ? (narratorVoice || seg.voice_name || 'Daniel')
        : (seg.voice_name || 'Charlie')
      const stability = seg.speaker === 'NARRATOR' ? 0.5 : 0.6

      const chapter = isChapterMarker(seg.text)
      const preview = seg.text.substring(0, 70).replace(/\n/g, ' ')
      console.log(
        `[audiobook-worker]    Seg ${seg.index} [${seg.speaker} → ${voice}]` +
        `${chapter ? ' [CHAPTER]' : ''}: ${preview}${seg.text.length > 70 ? '…' : ''}`
      )

      try {
        const segPath    = await generateSegmentAudio(seg, voice, stability, tmpDir)
        const durationMs = getDurationMs(segPath)
        totalChars      += seg.text.length

        renderedSegments.push({
          index:        seg.index,
          path:         segPath,
          durationMs,
          isChapter:    chapter,
          chapterTitle: chapter ? seg.text.trim().replace(/\s+/g, ' ') : null,
          isSilence:    false,
        })

        // 250 ms silence gap between every segment for natural pacing
        const silPath = join(tmpDir, `sil-${String(seg.index).padStart(5, '0')}.mp3`)
        execSync(
          `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 0.25 -q:a 9 "${silPath}"`,
          { stdio: 'pipe' }
        )
        renderedSegments.push({
          index: seg.index, path: silPath, durationMs: 250,
          isChapter: false, chapterTitle: null, isSilence: true,
        })

      } catch (e) {
        console.error(`[audiobook-worker]    ⚠  Seg ${seg.index} failed (skipping): ${e.message}`)
      }
    }

    if (renderedSegments.length === 0) {
      throw new Error('No audio segments were generated — all TTS calls failed')
    }

    // ── 2. Detect chapters and compute timing ──────────────────────────────
    // Walk rendered (non-silence) segments in order, accumulating milliseconds.
    const chapters = []  // { title, startMs }
    let cumulativeMs = 0

    for (const rs of renderedSegments) {
      if (!rs.isSilence && rs.isChapter) {
        chapters.push({ title: rs.chapterTitle, startMs: cumulativeMs })
      }
      cumulativeMs += rs.durationMs
    }

    // Fallback: if no chapter markers detected, treat the whole thing as one chapter
    if (chapters.length === 0) {
      console.log('[audiobook-worker]    No chapter markers found — using single chapter')
      chapters.push({ title: 'Audiobook', startMs: 0 })
    }

    // Build chaptersJson (end times are filled after we know the true total duration)
    let chaptersJson = chapters.map((ch, i) => ({
      index:   i,
      title:   ch.title,
      startMs: ch.startMs,
      endMs:   i + 1 < chapters.length ? chapters[i + 1].startMs : cumulativeMs,
    }))

    console.log(`[audiobook-worker]    Chapters: ${chaptersJson.length}`)
    for (const c of chaptersJson) {
      const s = (c.startMs / 1000).toFixed(1)
      const e = (c.endMs   / 1000).toFixed(1)
      console.log(`[audiobook-worker]      [${c.index}] "${c.title}"  ${s}s → ${e}s`)
    }

    // ── 3. Concatenate into master MP3 ─────────────────────────────────────
    const concatListPath = join(tmpDir, 'concat.txt')
    writeFileSync(concatListPath, renderedSegments.map(rs => `file '${rs.path}'`).join('\n'))

    const mp3Path = join(tmpDir, 'audiobook.mp3')
    console.log(`[audiobook-worker]    Concatenating ${renderedSegments.length} audio files…`)
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:a libmp3lame -q:a 4 "${mp3Path}"`,
      { stdio: 'pipe' }
    )

    // Measure actual duration of the stitched file (most accurate)
    const durationMs      = getDurationMs(mp3Path)
    const durationSeconds = Math.round(durationMs / 1000)
    console.log(`[audiobook-worker]    Master MP3 duration: ${durationSeconds}s`)

    // Re-align last chapter's endMs to measured total
    if (chaptersJson.length > 0) {
      chaptersJson[chaptersJson.length - 1].endMs = durationMs
    }

    // ── 4. Build M4B with embedded chapter metadata ─────────────────────────
    // ffmpeg metadata file format (TIMEBASE=1/1000 means timestamps are in ms)
    const metaLines = [';FFMETADATA1']
    for (const ch of chaptersJson) {
      metaLines.push(
        '',
        '[CHAPTER]',
        'TIMEBASE=1/1000',
        `START=${ch.startMs}`,
        `END=${ch.endMs}`,
        `title=${ch.title}`,
      )
    }
    const metadataPath = join(tmpDir, 'ffmetadata.txt')
    writeFileSync(metadataPath, metaLines.join('\n') + '\n')

    const m4bPath = join(tmpDir, 'audiobook.m4b')
    console.log('[audiobook-worker]    Converting MP3 → M4B with chapter metadata…')
    execSync(
      `ffmpeg -y -i "${mp3Path}" -i "${metadataPath}" ` +
      `-map_metadata 1 -c:a aac -b:a 128k "${m4bPath}"`,
      { stdio: 'pipe' }
    )

    // ── 5. Upload M4B to Supabase storage ─────────────────────────────────
    console.log('[audiobook-worker]    Uploading M4B…')
    const m4bBuffer      = readFileSync(m4bPath)
    const m4bStoragePath = `audiobooks/${bookId}/audiobook.m4b`
    const { error: m4bErr } = await supabase.storage
      .from('media')
      .upload(m4bStoragePath, m4bBuffer, { contentType: 'audio/mp4', upsert: true })
    if (m4bErr) throw new Error(`M4B upload failed: ${m4bErr.message}`)

    const { data: m4bUrlData } = supabase.storage.from('media').getPublicUrl(m4bStoragePath)
    const m4bUrl = `${m4bUrlData.publicUrl}?v=${Date.now()}`
    console.log(`[audiobook-worker]    M4B uploaded ✓`)

    // ── 6. Upload MP3 to Supabase storage (non-fatal) ─────────────────────
    console.log('[audiobook-worker]    Uploading MP3…')
    const mp3Buffer      = readFileSync(mp3Path)
    const mp3StoragePath = `audiobooks/${bookId}/audiobook.mp3`
    const { error: mp3Err } = await supabase.storage
      .from('media')
      .upload(mp3StoragePath, mp3Buffer, { contentType: 'audio/mpeg', upsert: true })
    if (mp3Err) {
      console.warn(`[audiobook-worker]    ⚠  MP3 upload failed (non-fatal): ${mp3Err.message}`)
    } else {
      console.log(`[audiobook-worker]    MP3 uploaded ✓`)
    }

    // ── 7. Mark job complete via queue API ─────────────────────────────────
    const cost = (totalChars / 1000) * TTS_PER_1K_CHARS
    const segsDone = renderedSegments.filter(r => !r.isSilence).length
    console.log(
      `[audiobook-worker] ✅ Audiobook complete: ${durationSeconds}s | ` +
      `${chaptersJson.length} chapters | ${segsDone} segments | ` +
      `$${cost.toFixed(2)} COGS (${totalChars.toLocaleString()} chars)`
    )

    await updateStatus(audiobookId, 'complete', {
      audioUrl:       m4bUrl,
      chaptersJson:   JSON.stringify(chaptersJson),
      durationSeconds,
    })

  } catch (err) {
    console.error(`[audiobook-worker] ❌ Job ${audiobookId} failed: ${err.message}`)
    await updateStatus(audiobookId, 'failed', { errorMessage: err.message })
    throw err  // surface to Promise.allSettled for logging
  } finally {
    // Always clean up temp files
    try {
      rmSync(tmpDir, { recursive: true, force: true })
      console.log(`[audiobook-worker]    Temp dir cleaned: ${tmpDir}`)
    } catch (cleanErr) {
      console.warn(`[audiobook-worker]    Cleanup warning (non-fatal): ${cleanErr.message}`)
    }
  }
}

// ── Poll loop ─────────────────────────────────────────────────────────────────
async function pollLoop() {
  console.log('[audiobook-worker] Polling queue…')

  try {
    const jobs = await fetchQueue()

    if (jobs.length === 0) {
      console.log('[audiobook-worker] No pending jobs.')
    } else {
      console.log(`[audiobook-worker] Found ${jobs.length} pending job(s).`)
    }

    // Skip any job we are already processing in this worker instance
    const newJobs = jobs.filter(j => !activeJobs.has(j.audiobookId)).slice(0, 3)

    if (newJobs.length > 0) {
      // Mark as active immediately to prevent re-pickup on the next poll cycle
      for (const job of newJobs) activeJobs.add(job.audiobookId)

      // Process up to 3 jobs concurrently; poll loop is NOT blocked
      Promise.allSettled(
        newJobs.map(async (job) => {
          try {
            await processJob(job)
          } finally {
            activeJobs.delete(job.audiobookId)
          }
        })
      ).then(results => {
        for (const result of results) {
          if (result.status === 'rejected') {
            // processJob already called updateStatus('failed') and logged the error
            console.error(
              '[audiobook-worker] Batch rejection (already handled):',
              result.reason?.message
            )
          }
        }
      })
    }

  } catch (err) {
    console.error('[audiobook-worker] Poll error:', err.message)
  }

  // Schedule next poll regardless of whether jobs are still running
  setTimeout(pollLoop, POLL_INTERVAL_MS)
}

// ── Startup ───────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════╗')
console.log('║       BookReel Audiobook Pipeline Worker             ║')
console.log('╚══════════════════════════════════════════════════════╝')
console.log(`[audiobook-worker] APP_URL:       ${APP_URL}`)
console.log(`[audiobook-worker] Poll interval: ${POLL_INTERVAL_MS / 1000}s`)
console.log(`[audiobook-worker] Temp dir:      ${TMP_BASE}/<audiobookId>/`)
console.log(`[audiobook-worker] FAL_API_KEY:   ${FAL_API_KEY.substring(0, 8)}…`)
console.log(`[audiobook-worker] Supabase URL:  ${SUPABASE_URL?.substring(0, 40)}…`)
console.log('')

mkdirSync(TMP_BASE, { recursive: true })
pollLoop()
