import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ReviewClient from '@/components/author/ReviewClient'
import type { Book, Character, Scene } from '@/types/database'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch book (verify ownership)
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('author_id', user.id)
    .single()

  if (bookError || !book) {
    redirect('/dashboard')
  }

  // Fetch characters and scenes in parallel
  const [{ data: characters }, { data: scenes }] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
    supabase
      .from('scenes')
      .select('*')
      .eq('book_id', bookId)
      .order('scene_number', { ascending: true }),
  ])

  const typedBook = book as Book
  const typedCharacters = (characters ?? []) as Character[]
  const typedScenes = (scenes ?? []) as Scene[]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <span className="text-xl">🎬</span>
            <span className="font-bold text-lg">BookReel</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Book header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            Here&apos;s what we found in your story.
          </h1>
          <div className="flex items-start gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 leading-tight">
              {typedBook.title}
            </h2>
            {typedBook.genre && (
              <span className="mt-1 inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-sm font-medium">
                {typedBook.genre}
              </span>
            )}
          </div>
          {typedBook.description && (
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl">{typedBook.description}</p>
          )}
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Before we build your trailer, take a moment to review what we&apos;ve pulled from your manuscript. Add anything we missed, remove anything that doesn&apos;t feel right. This is still your story — we&apos;re just getting the details confirmed.
          </p>
        </div>

        {/* Client-side review interactions */}
        <ReviewClient
          bookId={bookId}
          initialCharacters={typedCharacters}
          initialScenes={typedScenes}
        />
      </main>
    </div>
  )
}
