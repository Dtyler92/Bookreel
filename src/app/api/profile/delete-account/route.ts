import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to delete user from auth
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete profile + books cascade via RLS/FK (set up ON DELETE CASCADE in Supabase)
    await service.from('profiles').delete().eq('id', user.id)

    // Delete auth user
    const { error: deleteError } = await service.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('[delete-account]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
