import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ReviewImagesClient from '@/components/author/ReviewImagesClient'
import type { Book, Character, Item } from '@/types/database'

export default async function ReviewImagesPage({
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

  // Fetch characters and items in parallel
  const [{ data: characters }, { data: items }] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
    supabase
      .from('items')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true }),
  ])

  const typedBook = book as Book
  const typedCharacters = (characters ?? []) as Character[]
  const typedItems = (items ?? []) as Item[]

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Top nav */}
      <header className="bg-white border-b border-[#E8E2D5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-[#2B2B2B] hover:text-[#C8412C] transition-colors">
            <span className="text-xl">🎬</span>
            <span className="font-bold text-lg font-['Playfair_Display']">BookReel</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-[#9C9286] hover:text-[#2B2B2B] transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="mb-8 space-y-2">
          <h1 className="font-['Playfair_Display'] font-bold text-[32px] text-[#2B2B2B] leading-tight">
            Review Your Characters &amp; Key Items
          </h1>
          <p className="text-[#9C9286] font-['Inter'] max-w-2xl">
            We&apos;ve brought your story to life visually. Review each image and let us know if anything needs adjusting — we&apos;ll regenerate until it&apos;s right.
          </p>
          <p className="text-sm text-[#9C9286]">
            <strong className="text-[#2B2B2B]">{typedBook.title}</strong>
            {typedBook.genre && <span className="ml-2 text-xs">· {typedBook.genre}</span>}
          </p>
        </div>

        <ReviewImagesClient
          bookId={bookId}
          initialCharacters={typedCharacters}
          initialItems={typedItems}
        />
      </main>
    </div>
  )
}
