import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Book, TrailerStatus } from '@/types/database'

// ─── Status badge ─────────────────────────────────────────────────────────────

function TrailerStatusBadge({ status }: { status: TrailerStatus | null }) {
  if (!status) return null

  const config: Record<TrailerStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pending Review',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    review: {
      label: 'Needs Review',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    generating: {
      label: 'Generating',
      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    },
    complete: {
      label: 'Complete ✓',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  }

  const { label, className } = config[status] ?? config.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

// ─── Book row type (book + latest trailer status) ──────────────────────────────

interface BookWithStatus extends Book {
  trailerStatus: TrailerStatus | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile for display name & tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email ?? 'there'
  const tier = profile?.subscription_tier ?? 'free'

  const tierLabels: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pro: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  }

  // Fetch books with latest trailer status
  const { data: booksRaw } = await supabase
    .from('books')
    .select('*, trailers(status)')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  type BookRow = Book & { trailers: Array<{ status: TrailerStatus }> | null }
  const books: BookWithStatus[] = ((booksRaw ?? []) as BookRow[]).map((b) => {
    const trailers = b.trailers ?? []
    const trailerStatus = trailers.length > 0 ? trailers[trailers.length - 1].status : null
    return {
      id: b.id,
      author_id: b.author_id,
      title: b.title,
      description: b.description,
      genre: b.genre,
      amazon_link: b.amazon_link,
      store_link: b.store_link,
      pdf_url: b.pdf_url,
      cover_image_url: b.cover_image_url,
      is_published: b.is_published,
      created_at: b.created_at,
      updated_at: b.updated_at,
      trailerStatus,
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <span className="font-bold text-gray-900 dark:text-white text-lg">
              BookReel
            </span>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tierColors[tier] ?? tierColors.free}`}
          >
            {tierLabels[tier] ?? 'Free'} Plan
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Welcome */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back. What are we making today, {displayName}?
          </h1>
        </div>

        {/* Subscription badge */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Current Plan
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {tierLabels[tier] ?? 'Free'}
            </p>
          </div>
          {tier !== 'pro' && (
            <button className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Upgrade Plan
            </button>
          )}
        </div>

        {/* ── My Books ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Books</h2>
            <Link
              href="/upload"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add My First Book →
            </Link>
          </div>

          {books.length === 0 ? (
            /* Empty state */
            <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="rounded-full bg-indigo-50 dark:bg-indigo-900/20 p-4">
                <span className="text-4xl">📚</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your bookshelf is empty — but not for long.
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload your first manuscript and we&apos;ll build a trailer that gives your story the entrance it deserves.
                </p>
              </div>
              <Link
                href="/upload"
                className="mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Add My First Book →
              </Link>
            </div>
          ) : (
            /* Books list */
            <div className="space-y-3">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
                >
                  {/* Book icon */}
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-2xl">
                    📖
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {book.title}
                      </h3>
                      {book.genre && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 text-xs font-medium">
                          {book.genre}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Uploaded {new Date(book.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status + action */}
                  <div className="shrink-0 flex items-center gap-3">
                    {book.trailerStatus ? (
                      <TrailerStatusBadge status={book.trailerStatus} />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-0.5 text-xs font-medium">
                        No trailer
                      </span>
                    )}
                    <Link
                      href={`/dashboard/review/${book.id}`}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Review →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
