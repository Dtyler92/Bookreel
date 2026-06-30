import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCreditState } from '@/lib/credits'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const creditState = await getCreditState(user.id)
  return NextResponse.json({ credits: creditState?.credits ?? 0 })
}
