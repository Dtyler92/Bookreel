#!/usr/bin/env node
/**
 * BookReel Audiobook Pipeline Worker
 *
 * Polls /api/audiobook/queue every 15s, picks up pending jobs, and either:
 *   - PARSE jobs  (status='parsing'):   downloads EPUB/PDF/DOCX, runs Claude to
 *                                       extract segments, saves back to audiobooks row.
 *   - GENERATE jobs (status='pending'): renders TTS audio segments, stitches into
 *                                       M4B/MP3 with chapter markers, uploads to storage.
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
 *   ANTHROPIC_API_KEY       (Claude for parse pipeline)
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
const ANTHROPIC_API_KEY=getEnv('ANTHROPIC_API_KEY')

// ElevenLabs key: prefer .env.local; fall back to provisioned key when placeholder
const ELEVENLABS_API_KEY_ENV = getEnv('ELEVENLABS_API_KEY')
const ELEVENLABS_API_KEY = isPlaceholder(ELEVENLABS_API_KEY_ENV)
  ? 'sk_3b27883afc20ae085861532ae97f522ae84c1c9dbd57b0c1'
  : ELEVENLABS_API_KEY_ENV

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
if (!ANTHROPIC_API_KEY) {
  console.warn('[audiobook-worker] WARNING: ANTHROPIC_API_KEY not set — parse pipeline will fail')
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

// ── Chapter detection (used by generate pipeline) ────────────────────────────
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

// ── Voice ID lookup (ElevenLabs voice name → voice ID) ────────────────────────
const ELEVENLABS_VOICE_IDS = {
  'Roger':   'CwhRBWXzGAHq8TQ4Fs17',
  'Sarah':   'EXAVITQu4vr4xnSDxMaL',
  'Laura':   'FGY2WhTYpPnrIDTdsKH5',
  'Charlie': 'IKne3meq5aSn9XLyUdCD',
  'George':  'JBFqnCBsd6RMkjVDRZzb',
  'Callum':  'N2lVS1w4EtoT3dr4eOWO',
  'River':   'SAz9YHcvj6GT2YYXdXww',
  'Harry':   'SOYHLrjzK2X1ezoPC6cr',
  'Liam':    'TX3LPaxmHKxFdv7VOQHJ',
  'Alice':   'Xb7hH8MSUJpSbSDYk0k2',
  'Matilda': 'XrExE9yKIg1WjnnlVkGX',
  'Will':    'bIHbv24MWmeRgasZH58o',
  'Jessica': 'cgSgspJ2msm6clMCkdW9',
  'Eric':    'cjVigY5qzO86Huf0OWal',
  'Bella':   'hpp4J3VqNfWAUOO0d1Us',
  'Chris':   'iP95p4xoKVk53GoZ742B',
  'Brian':   'nPczCjzI2devNBz1zQrb',
  'Daniel':  'onwK4e9ZLuTAKqWW03F9',
  'Lily':    'pFZP5JQG7iQjIQuC4Bku',
  'Adam':    'pNInz6obpgDQGcFmaJgB',
  'Bill':    'pqHfZKP75CvOlQylNhV4',
}

// ── TTS: generate one segment's audio and save to tmpDir ─────────────────────
async function generateSegmentAudio(seg, voice, stability, tmpDir, ttsModel) {
  const voiceId = ELEVENLABS_VOICE_IDS[voice] || ELEVENLABS_VOICE_IDS['Daniel']
  const res = await fetchWithRetry('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=mp3_44100_128', {
    method: 'POST',
    headers: {
      'xi-api-key':    ELEVENLABS_API_KEY,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      text:           seg.text,
      model_id:       ttsModel || 'eleven_turbo_v2_5',
      voice_settings: { stability: stability ?? 0.5, similarity_boost: 0.75 },
    }),
  }, 3, 60000)

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TTS API ${res.status}: ${err.substring(0, 200)}`)
  }

  // Direct audio bytes returned (not a JSON wrapper with URL)
  const audioBuffer = Buffer.from(await res.arrayBuffer())

  const segPath     = join(tmpDir, `seg-${String(seg.index).replace('-', 'n')}.mp3`)
  writeFileSync(segPath, audioBuffer)
  return segPath
}

// ════════════════════════════════════════════════════════════════════════════
// PARSE PIPELINE
// ════════════════════════════════════════════════════════════════════════════

// ── Parse system prompt ───────────────────────────────────────────────────────
const PARSE_SYSTEM_PROMPT = `You are a professional audiobook producer. Your job is to parse a book manuscript into a structured JSON array of narration/dialogue segments, ready for a full-cast text-to-speech audiobook render.

Each segment is either:
- NARRATOR: prose narration, scene description, action
- A specific character name: dialogue spoken by that character

RULES:
1. Preserve the exact text of every word — do NOT summarize, paraphrase, or skip content.
2. Split on speaker changes. Each time the speaker changes (narrator → character, character → narrator, character A → character B), start a new segment.
3. Include dialogue attribution text (e.g. "he said", "she whispered") in the NARRATOR segment BEFORE the dialogue, not inside the character segment.
4. Strip quotation marks from character dialogue segments — they will be spoken, not read.
5. Keep segments a reasonable length — split very long narrator passages at paragraph breaks.
6. Identify character names from the text exactly as they appear.
7. Return ONLY a valid JSON array. No markdown, no code blocks, no explanation.

Output format:
[
  { "index": 0, "speaker": "NARRATOR", "text": "It was a dark and stormy night." },
  { "index": 1, "speaker": "NARRATOR", "text": "Jonathan looked up and said," },
  { "index": 2, "speaker": "Jonathan", "text": "I must find the castle before nightfall." },
  { "index": 3, "speaker": "NARRATOR", "text": "The old woman grabbed his arm." },
  { "index": 4, "speaker": "Old Woman", "text": "Do not go there. He is not a man." }
]`

// ── Voice roster (mirrors voiceRoster.ts) ────────────────────────────────────
const CHARACTER_VOICES = [
  'George', 'Liam', 'Bill', 'Roger', 'Will', 'Eric', 'Chris', 'Brian', 'Callum', 'Adam', 'Harry',
  'Charlotte', 'Alice', 'Sarah', 'Laura', 'Matilda', 'Jessica', 'Lily', 'Bella',
  'Charlie', 'River',
]

// ── Text extraction helpers ───────────────────────────────────────────────────

/**
 * Extract readable text from a Buffer given its filename.
 * Supports: .txt, .docx, .rtf, .epub, .pdf (default)
 */
async function extractTextFromBuffer(buffer, filename) {
  const nameLower = filename.toLowerCase()

  // Plain text
  if (nameLower.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  // DOCX via mammoth
  if (nameLower.endsWith('.docx') || nameLower.endsWith('.rtf')) {
    try {
      const { default: mammoth } = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    } catch (err) {
      console.error('[parse] mammoth error:', err.message)
      return ''
    }
  }

  // EPUB via JSZip
  if (nameLower.endsWith('.epub')) {
    try {
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(buffer)

      const containerFile = zip.file('META-INF/container.xml')
      if (!containerFile) throw new Error('No META-INF/container.xml in EPUB')
      const containerXml = await containerFile.async('text')

      const opfPathMatch = containerXml.match(/full-path=["']([^"']+\.opf)["']/)
      const opfPath = opfPathMatch?.[1] ?? ''
      if (!opfPath) throw new Error('Could not find OPF path in container.xml')

      const opfDir = opfPath.includes('/')
        ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
        : ''
      const opfXml = await zip.file(opfPath)?.async('text') ?? ''

      const manifestItems = {}
      const manifestRe = /<item[^>]+id=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/g
      let m
      while ((m = manifestRe.exec(opfXml)) !== null) manifestItems[m[1]] = m[2]
      const manifestRe2 = /<item[^>]+href=["']([^"']+)["'][^>]+id=["']([^"']+)["'][^>]*>/g
      while ((m = manifestRe2.exec(opfXml)) !== null) {
        if (!manifestItems[m[2]]) manifestItems[m[2]] = m[1]
      }

      const spineIds = []
      const spineRe = /<itemref[^>]+idref=["']([^"']+)["']/g
      while ((m = spineRe.exec(opfXml)) !== null) spineIds.push(m[1])

      const textParts = []
      for (const id of spineIds) {
        const href = manifestItems[id]
        if (!href) continue
        const fullPath = opfDir + href.split('#')[0]
        const html = await zip.file(fullPath)?.async('text')
          ?? await zip.file(decodeURIComponent(fullPath))?.async('text')
          ?? ''
        if (!html) continue
        const plain = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          // Block-level tags → paragraph breaks
          .replace(/<\/?(p|div|section|article|h[1-6]|br|li|tr|blockquote)[^>]*>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
          // Collapse runs of spaces (but not newlines)
          .replace(/[ \t]+/g, ' ')
          // Collapse 3+ newlines to 2
          .replace(/\n{3,}/g, '\n\n')
          .trim()
        if (plain.length > 50) textParts.push(plain)
      }
      return textParts.join('\n\n')
    } catch (err) {
      console.error('[parse] EPUB error:', err.message)
      return ''
    }
  }

  // PDF via pdf-parse (default)
  try {
    const { default: pdfParse } = await import('pdf-parse')
    const pdfData = await pdfParse(buffer)
    return pdfData.text || ''
  } catch (err) {
    console.error('[parse] PDF error:', err.message)
    return ''
  }
}

// ── Chapter detection & chunking ──────────────────────────────────────────────

const CHAPTER_HEADING_RE = /^(chapter|prologue|epilogue|part)\s*(\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*[:\-–—]?\s*$/i
const ALL_CAPS_HEADING_RE = /^[A-Z0-9\s\-–—:!?.,']+$/

function isChapterHeading(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (CHAPTER_HEADING_RE.test(trimmed)) return true
  if (trimmed.length >= 3 && trimmed.length < 60 && ALL_CAPS_HEADING_RE.test(trimmed)) return true
  return false
}

function splitIntoChapters(text) {
  const lines = text.split('\n')
  const chapters = []
  let currentTitle = 'Beginning'
  let currentLines = []

  for (const line of lines) {
    if (isChapterHeading(line)) {
      const content = currentLines.join('\n').trim()
      if (content.length > 200) {
        chapters.push({ title: currentTitle, text: content })
      }
      currentTitle = line.trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  const content = currentLines.join('\n').trim()
  if (content.length > 200) {
    chapters.push({ title: currentTitle, text: content })
  }

  return chapters
}

function splitIntoChunks(text, targetSize = 6000) {
  const paragraphs = text.split(/\n\n+/)
  const chunks = []
  let current = ''
  let chunkIndex = 1

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > targetSize && current.length > 0) {
      chunks.push({ title: `Part ${chunkIndex}`, text: current.trim() })
      chunkIndex++
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  if (current.trim().length > 200) {
    chunks.push({ title: `Part ${chunkIndex}`, text: current.trim() })
  }
  return chunks
}

// ── JSON repair helper ────────────────────────────────────────────────────────
let _jsonrepair = null
async function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    // Try jsonrepair for truncated/malformed JSON
    if (!_jsonrepair) {
      const mod = await import('jsonrepair')
      _jsonrepair = mod.jsonrepair
    }
    try {
      const repaired = _jsonrepair(text)
      const parsed = JSON.parse(repaired)
      console.log(`[audiobook-worker]    ⚠  JSON repaired (${e.message})`)
      return parsed
    } catch (e2) {
      throw new Error(`JSON parse failed even after repair: ${e.message}`)
    }
  }
}

// ── Fetch with retry ─────────────────────────────────────────────────────────
async function fetchWithRetry(url, options, maxAttempts = 3, timeoutMs = 180000) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)
      return res
    } catch (e) {
      clearTimeout(timer)
      lastErr = e
      const reason = e.name === 'AbortError' ? `timeout after ${timeoutMs/1000}s` : e.message
      if (attempt < maxAttempts) {
        const delay = attempt * 3000
        console.log(`[audiobook-worker]    ⚠  fetch failed (attempt ${attempt}/${maxAttempts}: ${reason}), retrying in ${delay/1000}s…`)
        await new Promise(r => setTimeout(r, delay))
      } else {
        console.error(`[audiobook-worker]    ✗  fetch failed after ${maxAttempts} attempts: ${reason}`)
      }
    }
  }
  throw lastErr
}

// ── Claude call for a single chunk ───────────────────────────────────────────
async function parseChunkWithClaude(chunk, chapterLabel, bookTitle, charList) {
  const userPrompt = `Book title: "${bookTitle}"
Known characters: ${charList}
${chapterLabel}

Parse this manuscript section into dialogue segments:

${chunk}`

  const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-5',
      max_tokens: 16000,
      system:     PARSE_SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  }, 3)

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${errText.substring(0, 300)}`)
  }

  const data    = await res.json()
  const rawJson = data.content?.[0]?.text?.trim() ?? ''

  // Strip markdown code fences if model wrapped it
  const cleaned = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  const segments = await safeJsonParse(cleaned)
  if (!Array.isArray(segments)) throw new Error('Claude returned non-array')
  return segments
}

// ── Main parse pipeline ───────────────────────────────────────────────────────
async function runParsePipeline(job) {
  const { audiobookId, bookId } = job
  console.log(`\n[audiobook-worker] 📖 Starting PARSE job: audiobookId=${audiobookId} bookId=${bookId}`)

  try {
    // ── 1. Fetch book metadata ───────────────────────────────────────────────
    const { data: bookData, error: bookErr } = await supabase
      .from('books')
      .select('id, title, author_id, pdf_url')
      .eq('id', bookId)
      .single()

    if (bookErr || !bookData) {
      throw new Error(`Book not found: ${bookErr?.message ?? 'no row'}`)
    }
    const book = bookData

    if (!book.pdf_url) {
      throw new Error('Book has no pdf_url — cannot parse')
    }

    // ── 2. Get a signed URL and download the manuscript ─────────────────────
    console.log(`[audiobook-worker]    Signing URL for: ${book.pdf_url}`)
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('books')
      .createSignedUrl(book.pdf_url, 300) // 5-minute TTL

    if (signedErr || !signedData?.signedUrl) {
      throw new Error(`Failed to sign URL: ${signedErr?.message ?? 'unknown'}`)
    }

    const dlRes = await fetch(signedData.signedUrl)
    if (!dlRes.ok) throw new Error(`Manuscript download failed: ${dlRes.status}`)
    const manuscriptBuffer   = Buffer.from(await dlRes.arrayBuffer())
    const manuscriptFilename = book.pdf_url.split('/').pop() || 'manuscript.pdf'
    console.log(`[audiobook-worker]    Downloaded: ${manuscriptFilename} (${manuscriptBuffer.length} bytes)`)

    // ── 3. Extract text ──────────────────────────────────────────────────────
    let rawText = await extractTextFromBuffer(manuscriptBuffer, manuscriptFilename)
    rawText = rawText
      .replace(/\x00/g, '')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    if (rawText.length < 500) {
      throw new Error(
        'Could not extract readable text from the manuscript. ' +
        'Please ensure the file contains actual text (not scanned images).'
      )
    }
    console.log(`[audiobook-worker]    Extracted text: ${rawText.length} chars`)

    // ── 4. Fetch known characters ────────────────────────────────────────────
    const { data: characters } = await supabase
      .from('characters')
      .select('name, role, voice_key')
      .eq('book_id', bookId)

    const charList = characters?.map(c => c.name).join(', ') || 'unknown'

    // ── 5. Split into chapters / chunks ──────────────────────────────────────
    let sections    = splitIntoChapters(rawText)
    let usedChunking = false

    if (sections.length <= 1) {
      sections     = splitIntoChunks(rawText, 6000)
      usedChunking = true
      console.log(`[audiobook-worker]    No chapters detected. Split into ${sections.length} chunks.`)
    } else {
      console.log(`[audiobook-worker]    Detected ${sections.length} chapters.`)
      // Sub-split any chapter that's too large for a single Claude call
      const MAX_CHUNK = 6000
      const expanded = []
      for (const sec of sections) {
        if (sec.text.length > MAX_CHUNK) {
          const subChunks = splitIntoChunks(sec.text, MAX_CHUNK)
          subChunks.forEach((c, i) => expanded.push({
            title: subChunks.length > 1 ? `${sec.title} (part ${i + 1})` : sec.title,
            text:  c.text,
          }))
        } else {
          expanded.push(sec)
        }
      }
      if (expanded.length !== sections.length) {
        console.log(`[audiobook-worker]    Sub-split large chapters → ${expanded.length} total chunks.`)
      }
      sections = expanded
    }

    // ── 6. Claude chunking loop ───────────────────────────────────────────────
    const allSegments    = []
    const chapterMarkers = []
    let globalSegmentIndex = 0

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const label   = usedChunking
        ? `Chunk ${i + 1} of ${sections.length}`
        : `Chapter ${i + 1} of ${sections.length}: ${section.title}`

      chapterMarkers.push({
        chapterIndex:      i,
        title:             section.title,
        startSegmentIndex: globalSegmentIndex,
      })

      let chunkSegments = []
      try {
        chunkSegments = await parseChunkWithClaude(
          section.text,
          label,
          book.title,
          charList
        )
      } catch (err) {
        console.error(`[audiobook-worker]    ⚠  Failed to parse ${label}: ${err.message}`)
        // Continue with remaining sections rather than failing everything
      }

      const reindexed = chunkSegments.map((s, j) => ({
        index:   globalSegmentIndex + j,
        speaker: s.speaker || 'NARRATOR',
        text:    s.text    || '',
      }))

      console.log(`[audiobook-worker]    ${label}: ${reindexed.length} segments`)
      allSegments.push(...reindexed)
      globalSegmentIndex += reindexed.length
    }

    if (allSegments.length === 0) {
      throw new Error('Failed to parse manuscript — no segments produced.')
    }

    // ── 7. Build voice map ────────────────────────────────────────────────────
    const speakers = [...new Set(allSegments.map(s => s.speaker).filter(s => s !== 'NARRATOR'))]

    const voiceMap = { NARRATOR: 'narrator' }
    for (const char of (characters || [])) {
      if (char.voice_key) voiceMap[char.name] = char.voice_key
    }
    const unassigned = speakers.filter(s => !voiceMap[s])
    unassigned.forEach((s, i) => {
      voiceMap[s] = CHARACTER_VOICES[i % CHARACTER_VOICES.length]
    })

    const wordCount      = rawText.split(/\s+/).length
    const characterCount = rawText.length

    console.log(
      `[audiobook-worker]    Parse complete: ${allSegments.length} segments | ` +
      `${speakers.length} characters | ${sections.length} chapters | ${wordCount} words`
    )

    // ── 8. Persist to audiobooks row ─────────────────────────────────────────
    await updateStatus(audiobookId, 'parsed', {
      segmentsJson:       JSON.stringify(allSegments),
      speakersJson:       JSON.stringify(speakers),
      wordCount,
      characterCount,
      chapterMarkersJson: JSON.stringify(chapterMarkers),
      voiceMapJson:       JSON.stringify(voiceMap),
    })

    console.log(`[audiobook-worker] ✅ Parse job complete: audiobookId=${audiobookId}`)

  } catch (err) {
    console.error(`[audiobook-worker] ❌ Parse job ${audiobookId} failed: ${err.message}`)
    await updateStatus(audiobookId, 'parse_failed', { errorMessage: err.message })
    throw err
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GENERATE PIPELINE (TTS → ffmpeg → M4B upload)
// ════════════════════════════════════════════════════════════════════════════

async function processJob(job) {
  const { audiobookId, bookId, narratorVoice, segmentsJson: segmentsRaw, ttsModel } = job
  const segments = Array.isArray(segmentsRaw) ? segmentsRaw : (typeof segmentsRaw === "string" ? JSON.parse(segmentsRaw) : [])
  const segCount = Array.isArray(segments) ? segments.length : 0

  console.log(`\n[audiobook-worker] 🎙  Starting GENERATE job: audiobookId=${audiobookId} bookId=${bookId}`)
  console.log(`[audiobook-worker]    Segments: ${segCount} | narratorVoice: ${narratorVoice || 'Daniel'} | ttsModel: ${ttsModel || 'eleven_turbo_v2_5'}`)

  // Belt-and-suspenders: GET endpoint already claimed the job as 'processing',
  // but we POST again so processing_started_at reflects worker start time.
  await updateStatus(audiobookId, 'processing')

  const tmpDir = join(TMP_BASE, audiobookId)
  mkdirSync(tmpDir, { recursive: true })

  try {
    // ── 0. Fetch book title + author name for intro announcement ───────────────
    let bookTitle  = 'this book'
    let authorName = null
    try {
      const { data: bookRow } = await supabase
        .from('books')
        .select('title, author_id')
        .eq('id', bookId)
        .single()
      if (bookRow?.title) bookTitle = bookRow.title
      if (bookRow?.author_id) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('full_name, pen_names')
          .eq('id', bookRow.author_id)
          .single()
        if (profileRow) {
          const pens = Array.isArray(profileRow.pen_names) ? profileRow.pen_names : []
          authorName = pens[0] || profileRow.full_name || null
        }
      }
    } catch (e) {
      console.warn('[audiobook-worker]    Could not fetch book/author for intro:', e.message)
    }

    // ── 1. Generate TTS audio for each segment ─────────────────────────────
    // renderedSegments is an ordered list including silence spacers.
    const renderedSegments = []  // { index, path, durationMs, isChapter, chapterTitle, isSilence }
    let totalChars = 0

    // ── 1a. Intro announcement (title + author, different voice from narrator) ─
    // Pick an intro voice that is guaranteed to be different from the narrator
    const narratorResolved = narratorVoice || 'Daniel'
    // Prefer a warm, authoritative voice that contrasts with the narrator
    const INTRO_VOICE_PREFERENCE = ['Jessica', 'Matilda', 'Alice', 'Sarah', 'Laura', 'Lily', 'Bella']
    const introVoice = INTRO_VOICE_PREFERENCE.find(v => v !== narratorResolved) || 'Jessica'

    const introLines = authorName
      ? `${bookTitle}.\n\nBy ${authorName}.`
      : `${bookTitle}.`

    console.log(`[audiobook-worker]    Generating intro with voice "${introVoice}": "${introLines.replace(/\n/g, ' ')}"`)
    try {
      const introSeg = { index: -2, text: introLines, speaker: 'INTRO' }
      const introPath = await generateSegmentAudio(introSeg, introVoice, 0.45, tmpDir, ttsModel)
      const introDurationMs = getDurationMs(introPath)

      renderedSegments.push({
        index: -2, path: introPath, durationMs: introDurationMs,
        isChapter: false, chapterTitle: null, isSilence: false,
      })

      // 5-second silence between intro and first chapter
      const silIntroPath = join(tmpDir, 'sil-intro.mp3')
      execSync(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -q:a 9 "${silIntroPath}"`,
        { stdio: 'pipe' }
      )
      renderedSegments.push({
        index: -1, path: silIntroPath, durationMs: 5000,
        isChapter: false, chapterTitle: null, isSilence: true,
      })
      console.log(`[audiobook-worker]    Intro generated (${(introDurationMs / 1000).toFixed(1)}s) + 5s silence`)
    } catch (e) {
      console.warn('[audiobook-worker]    ⚠  Intro generation failed (skipping):', e.message)
    }

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
        const segPath    = await generateSegmentAudio(seg, voice, stability, tmpDir, ttsModel)
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
    if (m4bErr) {
      console.warn(`[audiobook-worker]    M4B upload failed (will use MP3): ${m4bErr.message}`)
    }

    // Try to get M4B url if upload succeeded
    let finalAudioUrl = null
    if (!m4bErr) {
      const { data: m4bUrlData } = supabase.storage.from('media').getPublicUrl(m4bStoragePath)
      finalAudioUrl = `${m4bUrlData.publicUrl}?v=${Date.now()}`
      console.log(`[audiobook-worker]    M4B uploaded successfully`)
    }

    // ── 6. Upload MP3 (primary fallback if M4B failed) ─────────────────────
    console.log('[audiobook-worker]    Uploading MP3…')
    const mp3Buffer      = readFileSync(mp3Path)
    const mp3StoragePath = `audiobooks/${bookId}/audiobook.mp3`
    const { error: mp3Err } = await supabase.storage
      .from('media')
      .upload(mp3StoragePath, mp3Buffer, { contentType: 'audio/mpeg', upsert: true })
    if (mp3Err) {
      console.warn(`[audiobook-worker]    MP3 upload failed: ${mp3Err.message}`)
    } else {
      const { data: mp3UrlData } = supabase.storage.from('media').getPublicUrl(mp3StoragePath)
      if (!finalAudioUrl) finalAudioUrl = `${mp3UrlData.publicUrl}?v=${Date.now()}`
      console.log(`[audiobook-worker]    MP3 uploaded successfully`)
    }

    if (!finalAudioUrl) throw new Error('Both M4B and MP3 uploads failed')

    // ── 7. Mark job complete via queue API ─────────────────────────────────
    const cost    = (totalChars / 1000) * TTS_PER_1K_CHARS
    const segsDone = renderedSegments.filter(r => !r.isSilence).length
    console.log(
      `[audiobook-worker] Audiobook complete: ${durationSeconds}s | ` +
      `${chaptersJson.length} chapters | ${segsDone} segments | ` +
      `$${cost.toFixed(2)} COGS (${totalChars.toLocaleString()} chars)`
    )

    await updateStatus(audiobookId, 'complete', {
      audioUrl:       finalAudioUrl,
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
            if (job.jobType === 'parse') {
              await runParsePipeline(job)
            } else {
              await processJob(job)
            }
          } finally {
            activeJobs.delete(job.audiobookId)
          }
        })
      ).then(results => {
        for (const result of results) {
          if (result.status === 'rejected') {
            // processJob / runParsePipeline already called updateStatus('failed') and logged
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
console.log(`[audiobook-worker] Anthropic:     ${ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.substring(0, 8) + '…' : 'NOT SET ⚠'}`)
console.log('')

mkdirSync(TMP_BASE, { recursive: true })
pollLoop()
