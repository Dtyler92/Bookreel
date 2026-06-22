'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signupAction(
  _prevState: { error: string; email?: string } | null,
  formData: FormData
): Promise<{ error: string; email?: string }> {
  const firstName = (formData.get('first_name') as string ?? '').trim()
  const lastName  = (formData.get('last_name')  as string ?? '').trim()
  const fullName  = `${firstName} ${lastName}`.trim()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Also upsert into profiles table so dashboard can read it immediately
  if (signUpData.user) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await serviceClient.from('profiles').upsert({
      id: signUpData.user.id,
      full_name: fullName,
      email,
    }, { onConflict: 'id' })
  }

  return { error: '', email }
}

export async function oauthAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const provider = formData.get('provider') as 'google' | 'facebook' | 'apple'
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      scopes: provider === 'facebook' ? 'email,public_profile' : undefined,
    },
  })

  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
  return null
}
