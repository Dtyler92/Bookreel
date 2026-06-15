import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { bookId: string }
    const { bookId } = body

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Verify all characters for this book are approved
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, author_approved')
      .eq('book_id', bookId)

    if (charError) {
      console.error('Characters fetch error:', charError)
      return Response.json({ error: 'Failed to fetch characters' }, { status: 500 })
    }

    const unapprovedCharacters = (characters || []).filter((c) => !c.author_approved)
    if (unapprovedCharacters.length > 0) {
      return Response.json(
        {
          error: `${unapprovedCharacters.length} character(s) not yet approved`,
          unapprovedCount: unapprovedCharacters.length
        },
        { status: 400 }
      )
    }

    // Verify all scenes for this book are approved
    const { data: scenes, error: sceneError } = await supabase
      .from('scenes')
      .select('id, author_approved')
      .eq('book_id', bookId)

    if (sceneError) {
      console.error('Scenes fetch error:', sceneError)
      return Response.json({ error: 'Failed to fetch scenes' }, { status: 500 })
    }

    const unapprovedScenes = (scenes || []).filter((s) => !s.author_approved)
    if (unapprovedScenes.length > 0) {
      return Response.json(
        {
          error: `${unapprovedScenes.length} scene(s) not yet approved`,
          unapprovedCount: unapprovedScenes.length
        },
        { status: 400 }
      )
    }

    // Update trailer status to 'generating'
    const { error: trailerError } = await supabase
      .from('trailers')
      .update({ status: 'generating' })
      .eq('book_id', bookId)

    if (trailerError) {
      console.error('Trailer update error:', trailerError)
      return Response.json({ error: 'Failed to update trailer status' }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: 'Trailer generation queued'
    })
  } catch (error) {
    console.error('Generate route error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
