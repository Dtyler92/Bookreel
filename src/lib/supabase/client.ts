import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,       // keep session in localStorage across tabs/restarts
        autoRefreshToken: true,     // silently refresh the JWT before it expires
        detectSessionInUrl: true,   // handle magic link / OAuth callbacks
      }
    }
  )
}
