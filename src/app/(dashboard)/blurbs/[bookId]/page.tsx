import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { GlobalNav } from '@/components/shared/GlobalNav'
import { getCreditState } from '@/lib/credits'
import BlurbGeneratorClient from './BlurbGeneratorClient'

export const dynamic = 'force-dynamic'

export default async function BlurbsPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, subscription_tier')
    .eq('id', user.id)
    .single()

  const { data: book } = await sb
    .from('books')
    .select('id, title, genre, author_id, blurbs_json')
    .eq('id', bookId)
    .eq('author_id', user.id)
    .single()

  if (!book) redirect('/dashboard')

  const navTier: 'free' | 'author' | 'pro' =
    profile?.subscription_tier === 'pro' ? 'pro' :
    profile?.subscription_tier === 'basic' ? 'author' : 'free'

  const creditState = await getCreditState(user.id)

  return (
    <>
      <GlobalNav
        userName={profile?.full_name ?? user.email ?? ''}
        userTier={navTier}
        credits={creditState?.credits ?? 0}
      />
      <BlurbGeneratorClient
        bookId={bookId}
        bookTitle={book.title}
        genre={book.genre}
        savedBlurbs={book.blurbs_json ?? null}
      />
    </>
  )
}
