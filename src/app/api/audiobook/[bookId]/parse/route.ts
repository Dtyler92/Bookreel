import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { VOICE_ROSTER } from '@/lib/voiceRoster'

export const runtime = 'nodejs'
export const maxDuration = 300  // Full-book parse can take several minutes

// Re-export so callers can still import VOICE_ROSTER from this module if needed
export { VOICE_ROSTER }

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

// ── Text extraction helpers ────────────────────────────────────────────────────

async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const nameLower = filename.toLowerCase()

  // Plain text / RTF (treat RTF as plain fallback — mammoth handles real RTF)
  if (nameLower.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  // DOCX via mammoth
  if (nameLower.endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    } catch (err) {
      console.error('[audiobook/parse] DOCX parse error:', err)
      return ''
    }
  }

  // RTF via mammoth
  if (nameLower.endsWith('.rtf')) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    } catch (err) {
      console.error('[audiobook/parse] RTF parse error:', err)
      return ''
    }
  }

  // EPUB via JSZip (same approach as books/upload route)
  if (nameLower.endsWith('.epub')) {
    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)

      const containerFile = zip.file('META-INF/container.xml')
      if (!containerFile) throw new Error('No META-INF/container.xml found in EPUB')
      const containerXml = await containerFile.async('text')

      const opfPathMatch = containerXml.match(/full-path=[\"']([^\"']+\.opf)[\"']/)
      const opfPath = opfPathMatch?.[1] ?? ''
      if (!opfPath) throw new Error('Could not find OPF path in container.xml')

      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
      const opfXml = await zip.file(opfPath)?.async('text') ?? ''

      const manifestItems: Record<string, string> = {}
      const manifestRe = /<item[^>]+id=[\"']([^\"']+)[\"'][^>]+href=[\"']([^\"']+)[\"'][^>]*>/g
      let m: RegExpExecArray | null
      while ((m = manifestRe.exec(opfXml)) !== null) manifestItems[m[1]] = m[2]
      const manifestRe2 = /<item[^>]+href=[\"']([^\"']+)[\"'][^>]+id=[\"']([^\"']+)[\"'][^>]*>/g
      while ((m = manifestRe2.exec(opfXml)) !== null) {
        if (!manifestItems[m[2]]) manifestItems[m[2]] = m[1]
      }

      const spineIds: string[] = []
      const spineRe = /<itemref[^>]+idref=[\"']([^\"']+)[\"']/g
      while ((m = spineRe.exec(opfXml)) !== null) spineIds.push(m[1])

      const textParts: string[] = []
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
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ')
          .replace(/\s+/g, ' ').trim()
        if (plain.length > 50) textParts.push(plain)
      }
      return textParts.join('\n\n')
    } catch (err) {
      console.error('[audiobook/parse] EPUB parse error:', err)
      return ''
    }
  }

  // PDF via pdf-parse (default / .pdf)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseLib = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
    const pdfData = await pdfParseLib(buffer)
    return pdfData.text || ''
  } catch (err) {
    console.error('[audiobook/parse] PDF parse error:', err)
    return ''
  }
}

// ── Chapter detection & chunking ──────────────────────────────────────────────

interface Chapter {
  title: string
  text: string
}

const CHAPTER_HEADING_RE = /^(chapter|prologue|epilogue|part)\s*(\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*[:\-–—]?\s*$/i
const ALL_CAPS_HEADING_RE = /^[A-Z0-9\s\-–—:!?.,']+$/  // all-caps check

function isChapterHeading(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (CHAPTER_HEADING_RE.test(trimmed)) return true
  // All-caps short line (< 60 chars) with at least 3 chars
  if (trimmed.length >= 3 && trimmed.length < 60 && ALL_CAPS_HEADING_RE.test(trimmed)) return true
  return false
}

function splitIntoChapters(text: string): Chapter[] {
  const lines = text.split('\n')
  const chapters: Chapter[] = []
  let currentTitle = 'Beginning'
  let currentLines: string[] = []

  for (const line of lines) {
    if (isChapterHeading(line)) {
      // Flush current chapter if it has meaningful content
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

  // Flush final chapter
  const content = currentLines.join('\n').trim()
  if (content.length > 200) {
    chapters.push({ title: currentTitle, text: content })
  }

  return chapters
}

/** Split text into chunks of ~targetSize chars at paragraph boundaries. */
function splitIntoChunks(text: string, targetSize = 15000): Chapter[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: Chapter[] = []
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

// ── Claude call for a single chunk ───────────────────────────────────────────

async function parseChunkWithClaude(
  anthropic: Anthropic,
  chunk: string,
  chapterLabel: string,
  bookTitle: string,
  charList: string
): Promise<Array<{ index: number; speaker: string; text: string }>> {
  const userPrompt = `Book title: "${bookTitle}"
Known characters: ${charList}
${chapterLabel}

Parse this manuscript section into dialogue segments:

${chunk}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    system: PARSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawJson = (message.content[0] as { type: string; text: string }).text.trim()

  // Strip markdown code fences if model wrapped it
  const cleaned = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  let segments: Array<{ index: number; speaker: string; text: string }>
  segments = JSON.parse(cleaned)
  if (!Array.isArray(segments)) throw new Error('Claude returned non-array')
  return segments
}

// ── Main POST handler ─────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookId } = await params
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch book + verify ownership
    const { data: book } = await sb
      .from('books')
      .select('id, title, author_id, pdf_url')
      .eq('id', bookId)
      .single()
    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    // ── Determine manuscript source ────────────────────────────────────────────
    let manuscriptBuffer: Buffer
    let manuscriptFilename: string

    const contentType = request.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')

    if (isMultipart) {
      // Client uploaded a file directly
      const formData = await request.formData()
      const uploadedFile = formData.get('manuscript') as File | null
      if (!uploadedFile || !(uploadedFile instanceof File)) {
        return Response.json({ error: 'No manuscript file provided' }, { status: 400 })
      }
      manuscriptBuffer = Buffer.from(await uploadedFile.arrayBuffer())
      manuscriptFilename = uploadedFile.name
      console.log(`[audiobook/parse] Using uploaded file: ${manuscriptFilename} (${manuscriptBuffer.length} bytes)`)
    } else if (book.pdf_url) {
      // pdf_url is stored as a bare Supabase storage path — resolve to public URL first
      let manuscriptUrl: string
      if (book.pdf_url.startsWith('http')) {
        manuscriptUrl = book.pdf_url
      } else {
        const { data: publicData } = sb.storage.from('books').getPublicUrl(book.pdf_url)
        manuscriptUrl = publicData.publicUrl
      }
      console.log(`[audiobook/parse] Fetching stored manuscript: ${manuscriptUrl}`)
      const pdfRes = await fetch(manuscriptUrl)
      if (!pdfRes.ok) {
        return Response.json({ error: `Could not fetch stored manuscript (${pdfRes.status})` }, { status: 500 })
      }
      manuscriptBuffer = Buffer.from(await pdfRes.arrayBuffer())
      // Infer filename from the storage path (not the full URL)
      manuscriptFilename = book.pdf_url.split('/').pop() || 'manuscript.pdf'
      console.log(`[audiobook/parse] Fetched stored manuscript: ${manuscriptFilename} (${manuscriptBuffer.length} bytes)`)
    } else {
      return Response.json(
        { error: 'No manuscript available. Please upload a manuscript file.' },
        { status: 400 }
      )
    }

    // ── Extract text ───────────────────────────────────────────────────────────
    let rawText = await extractTextFromBuffer(manuscriptBuffer, manuscriptFilename)

    // Clean null bytes / control chars
    rawText = rawText
      .replace(/\x00/g, '')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    if (rawText.length < 500) {
      return Response.json(
        { error: 'Could not extract readable text from the manuscript. Please ensure the file contains actual text (not scanned images).' },
        { status: 400 }
      )
    }

    console.log(`[audiobook/parse] Extracted text length: ${rawText.length} chars`)

    // ── Fetch characters ───────────────────────────────────────────────────────
    const { data: characters } = await sb
      .from('characters')
      .select('name, role, voice_key')
      .eq('book_id', bookId)

    const charList = characters?.map(c => c.name).join(', ') || 'unknown'

    // ── Split into chapters / chunks ───────────────────────────────────────────
    let sections = splitIntoChapters(rawText)
    let usedChunking = false

    if (sections.length <= 1) {
      // No chapter boundaries detected — fall back to fixed-size chunks
      sections = splitIntoChunks(rawText, 15000)
      usedChunking = true
      console.log(`[audiobook/parse] No chapters detected. Splitting into ${sections.length} chunks.`)
    } else {
      console.log(`[audiobook/parse] Detected ${sections.length} chapters.`)
    }

    // ── Claude chunking loop ───────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const allSegments: Array<{ index: number; speaker: string; text: string }> = []
    const chapterMarkers: Array<{ chapterIndex: number; title: string; startSegmentIndex: number }> = []
    let globalSegmentIndex = 0

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const label = usedChunking
        ? `Chunk ${i + 1} of ${sections.length}`
        : `Chapter ${i + 1} of ${sections.length}: ${section.title}`

      chapterMarkers.push({
        chapterIndex: i,
        title: section.title,
        startSegmentIndex: globalSegmentIndex,
      })

      let chunkSegments: Array<{ index: number; speaker: string; text: string }> = []
      try {
        chunkSegments = await parseChunkWithClaude(
          anthropic,
          section.text,
          label,
          book.title,
          charList
        )
      } catch (err) {
        console.error(`[audiobook/parse] Failed to parse ${label}:`, err)
        // Continue with remaining chapters rather than failing everything
        chunkSegments = []
      }

      // Re-index segments to global offset
      const reindexed = chunkSegments.map((s, j) => ({
        index: globalSegmentIndex + j,
        speaker: s.speaker || 'NARRATOR',
        text: s.text || '',
      }))

      console.log(`[audiobook/parse] ${label}: ${reindexed.length} segments`)
      allSegments.push(...reindexed)
      globalSegmentIndex += reindexed.length
    }

    if (allSegments.length === 0) {
      return Response.json({ error: 'Failed to parse manuscript — no segments produced.' }, { status: 500 })
    }

    // ── Build voice map ────────────────────────────────────────────────────────
    const speakers = [...new Set(allSegments.map(s => s.speaker).filter(s => s !== 'NARRATOR'))]

    const voiceMap: Record<string, string> = { NARRATOR: 'narrator' }
    for (const char of (characters || [])) {
      voiceMap[char.name] = char.voice_key || 'default'
    }
    const autoVoices = ['deep_male', 'male', 'female', 'young_female', 'old_male', 'default']
    const unassigned = speakers.filter(s => !voiceMap[s])
    unassigned.forEach((s, i) => {
      voiceMap[s] = autoVoices[i % autoVoices.length]
    })

    const wordCount = rawText.split(/\s+/).length

    return Response.json({
      segments: allSegments,
      speakers,
      voiceMap,
      voiceRoster: VOICE_ROSTER,
      wordCount,
      estimatedCredits: 1500,
      estimatedMinutes: Math.round(wordCount / 150),
      chapterMarkers,
      chapterCount: sections.length,
    })
  } catch (err) {
    console.error('[audiobook/parse] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
