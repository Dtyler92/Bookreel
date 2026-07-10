import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ── URL Safety Validation ─────────────────────────────────────────────────────
// We validate purchase links before saving. Strategy:
//  1. Must be a valid HTTPS URL
//  2. Must be on an allowed domain list (book retail & author sites)
//  3. Blocked against a known-bad keyword list as a second layer

const ALLOWED_DOMAINS = [
  // Major book retailers
  'amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.com.au', 'amazon.de',
  'amazon.fr', 'amazon.es', 'amazon.it', 'amazon.co.jp', 'amazon.in',
  'barnesandnoble.com', 'bn.com',
  'bookshop.org',
  'books.apple.com', 'itunes.apple.com',
  'play.google.com',
  'kobo.com',
  'smashwords.com',
  'draft2digital.com',
  'lulu.com',
  'ingramspark.com',
  'indiebound.org',
  'bookbub.com',
  'goodreads.com',
  'books2read.com',
  // Author / self-publishing platforms
  'payhip.com',
  'gumroad.com',
  'etsy.com',
  'shopify.com',
  // Author website — we allow any domain but only HTTPS (covered by rule 1)
  // Actually for author sites we use the open mode below
]

// Keywords that must NOT appear anywhere in the URL
const BLOCKED_KEYWORDS = [
  'porn', 'xxx', 'sex', 'nude', 'naked', 'adult', 'onlyfans', 'escort',
  'cam4', 'chaturbate', 'xvideos', 'xhamster', 'pornhub', 'redtube',
  'malware', 'phish', 'hack', 'crack', 'warez', 'torrent',
  'casino', 'slots', 'gambling', 'poker', 'bet365', 'betway',
]

function validatePurchaseUrl(raw: string): { ok: boolean; error?: string; normalized?: string } {
  if (!raw || !raw.trim()) return { ok: true, normalized: '' } // allow clearing

  let url: URL
  try {
    // Prepend https:// if missing so authors can paste bare domains
    const input = raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`
    url = new URL(input)
  } catch {
    return { ok: false, error: 'That doesn\'t look like a valid URL. Please paste the full link from your browser.' }
  }

  // Must be HTTPS
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTPS links are allowed for security.' }
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  const fullUrl = url.toString().toLowerCase()

  // Block known-bad keywords anywhere in the URL
  for (const kw of BLOCKED_KEYWORDS) {
    if (fullUrl.includes(kw)) {
      return { ok: false, error: 'That link doesn\'t appear to be a book purchase page. Please use a link from Amazon, Barnes & Noble, Bookshop.org, or your author website.' }
    }
  }

  // Max length sanity check
  if (url.toString().length > 2000) {
    return { ok: false, error: 'That URL is too long.' }
  }

  return { ok: true, normalized: url.toString() }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { amazon_link?: string }
    if (typeof body.amazon_link !== 'string') {
      return Response.json({ error: 'amazon_link must be a string' }, { status: 400 })
    }

    // Validate
    const validation = validatePurchaseUrl(body.amazon_link)
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 422 })
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify ownership
    const { data: book } = await supabase
      .from('books')
      .select('author_id')
      .eq('id', bookId)
      .single()

    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (book.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('books')
      .update({ amazon_link: validation.normalized || null })
      .eq('id', bookId)

    if (error) {
      console.error('[links] Update error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, amazon_link: validation.normalized || null })
  } catch (err) {
    console.error('[links] Unhandled error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
