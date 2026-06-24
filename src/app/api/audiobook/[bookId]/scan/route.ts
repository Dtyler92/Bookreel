import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/audiobook/[bookId]/scan
 * Quickly counts characters in the manuscript WITHOUT parsing.
 * Downloads the file, extracts plain text, returns character count.
 * Used to show the pricing tier before kicking off the full parse.
 */
export async function GET(
  _request: Request,
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

    const { data: book } = await sb
      .from('books')
      .select('id, title, author_id, pdf_url')
      .eq('id', bookId)
      .single()

    if (!book || book.author_id !== user.id) {
      return Response.json({ error: 'Book not found' }, { status: 404 })
    }

    if (!book.pdf_url) {
      return Response.json({ error: 'No manuscript uploaded' }, { status: 400 })
    }

    // Check if we already have a parsed characterCount saved
    const { data: existing } = await sb
      .from('audiobooks')
      .select('character_count, status')
      .eq('book_id', bookId)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing?.character_count) {
      return Response.json({ characterCount: existing.character_count, cached: true })
    }

    // Download and extract text
    const filename = book.pdf_url.split('/').pop() || 'manuscript'
    const { data: signedData, error: signErr } = await sb.storage
      .from('books')
      .createSignedUrl(book.pdf_url, 300)

    if (signErr || !signedData?.signedUrl) {
      return Response.json({ error: 'Could not access manuscript file' }, { status: 500 })
    }

    const fileRes = await fetch(signedData.signedUrl)
    if (!fileRes.ok) return Response.json({ error: 'File download failed' }, { status: 500 })
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    let text = ''
    const nameLower = filename.toLowerCase()

    if (nameLower.endsWith('.epub')) {
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(buffer)
      const containerFile = zip.file('META-INF/container.xml')
      if (containerFile) {
        const containerXml = await containerFile.async('text')
        const opfPathMatch = containerXml.match(/full-path=["']([^"']+\.opf)["']/)
        const opfPath = opfPathMatch?.[1] ?? ''
        if (opfPath) {
          const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
          const opfXml = await zip.file(opfPath)?.async('text') ?? ''
          const spineRe = /<itemref[^>]+idref=["']([^"']+)["']/g
          const manifestRe = /<item[^>]+id=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/g
          const manifestItems: Record<string, string> = {}
          let m: RegExpExecArray | null
          while ((m = manifestRe.exec(opfXml)) !== null) manifestItems[m[1]] = m[2]
          const spineIds: string[] = []
          while ((m = spineRe.exec(opfXml)) !== null) spineIds.push(m[1])
          const parts: string[] = []
          for (const id of spineIds) {
            const href = manifestItems[id]
            if (!href) continue
            const html = await zip.file(opfDir + href.split('#')[0])?.async('text') ?? ''
            const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            if (plain.length > 50) parts.push(plain)
          }
          text = parts.join(' ')
        }
      }
    } else if (nameLower.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMod = await import('pdf-parse') as any
      const pdfParse = pdfMod.default ?? pdfMod
      const pdfData = await pdfParse(buffer)
      text = pdfData.text || ''
    } else {
      // txt, docx, rtf — rough char count from buffer
      text = buffer.toString('utf8')
    }

    const characterCount = text.replace(/\s/g, '').length || text.length

    return Response.json({ characterCount, cached: false })

  } catch (err) {
    console.error('[audiobook/scan] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
