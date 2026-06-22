import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlobalNav } from '@/components/shared/GlobalNav'
import AccountSettingsClient from '@/components/author/AccountSettingsClient'

export default async function AccountSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier, author_photo_url, pen_names')
    .eq('id', user.id)
    .single()

  return (
    <>
      <GlobalNav
        userName={profile?.full_name ?? user.email ?? ''}
        userTier={profile?.subscription_tier ?? 'free'}
        authorPhotoUrl={profile?.author_photo_url ?? undefined}
      />
      <AccountSettingsClient
        userId={user.id}
        email={user.email ?? ''}
        fullName={profile?.full_name ?? ''}
        authorPhotoUrl={profile?.author_photo_url ?? null}
        penNames={profile?.pen_names ?? []}
        tier={profile?.subscription_tier ?? 'free'}
      />
    </>
  )
}
