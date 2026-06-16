import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      type: 'character' | 'scene'
      id: string
      approved: boolean
      updates?: Record<string, unknown>
    }

    // Support both `approved` and `author_approved` field names from different callers
    const approvedValue = typeof body.approved === 'boolean' ? body.approved : (body as Record<string, unknown>).author_approved
    const { type, id, updates } = body
    const approved = approvedValue as boolean | undefined

    console.log('[approve] Incoming body:', JSON.stringify({ type, id, approved: approvedValue, updates }))

    if (!type || !id || typeof approved !== 'boolean') {
      console.error('[approve] Missing required fields:', { type, id, approved, updates })
      return Response.json(
        { error: 'Missing required fields: type, id, approved' },
        { status: 400 }
      )
    }

    if (type !== 'character' && type !== 'scene') {
      return Response.json(
        { error: 'type must be "character" or "scene"' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    const table = type === 'character' ? 'characters' : 'scenes'
    const updatePayload: Record<string, unknown> = {
      author_approved: approved,
      ...(updates || {})
    }

    const { error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      console.error(`Approve ${type} error:`, error)
      return Response.json(
        { error: `Failed to update ${type}` },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Approve route error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
