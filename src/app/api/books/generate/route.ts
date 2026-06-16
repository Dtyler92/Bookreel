import { createClient } from '@supabase/supabase-js'
import { canGenerateTrailer, getModelForTier } from '@/lib/tierGate'
import { PlanName } from '@/lib/stripe'
import { runTrailerPipeline } from '@/lib/pipeline/runPipeline'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { bookId: string; userId?: string }
    const { bookId, userId } = body

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // --- Tier gate: check subscription ---
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        return Response.json({ error: 'Failed to fetch user profile' }, { status: 500 })
      }

      const tier = (profile?.subscription_tier || 'free') as PlanName

      if (tier === 'free') {
        return Response.json(
          { error: 'Upgrade your plan to generate trailers' },
          { status: 403 }
        )
      }

      // Count trailers generated this month for this user's books
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { count: trailersThisMonth, error: countError } = await supabase
        .from('trailers')
        .select('id', { count: 'exact', head: true })
        .eq('book_id', bookId)
        .gte('created_at', startOfMonth)

      if (countError) {
        console.error('Trailer count error:', countError)
        return Response.json({ error: 'Failed to check trailer usage' }, { status: 500 })
      }

      if (!canGenerateTrailer(tier, trailersThisMonth ?? 0)) {
        return Response.json(
          { error: 'Monthly trailer limit reached' },
          { status: 403 }
        )
      }

      // Get model config based on tier
      const modelConfig = getModelForTier(tier)
      console.log(`Generating trailer for tier "${tier}" using models:`, modelConfig)
    }

    // Verify images have been approved before generating video
    const { data: trailer, error: trailerFetchError } = await supabase
      .from('trailers')
      .select('id, images_approved')
      .eq('book_id', bookId)
      .single()

    if (trailerFetchError) {
      console.error('Trailer fetch error:', trailerFetchError)
      return Response.json({ error: 'Failed to fetch trailer record' }, { status: 500 })
    }

    if (trailer && !trailer.images_approved) {
      return Response.json(
        { error: 'Character and item images must be approved before generating your trailer', requiresImageApproval: true },
        { status: 400 }
      )
    }

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

    // Determine the author's tier for pipeline configuration
    // We need to re-fetch it here if userId was provided, otherwise default to 'author'
    let pipelineTier: 'author' | 'pro' = 'author'
    if (userId) {
      const { data: tierProfile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single()
      if (tierProfile?.subscription_tier === 'pro') {
        pipelineTier = 'pro'
      }
    }

    // Trigger pipeline in background (non-blocking)
    setImmediate(async () => {
      try {
        await runTrailerPipeline(bookId, pipelineTier)
      } catch (error) {
        console.error('Pipeline failed:', error)
      }
    })

    return Response.json({ success: true, message: 'Your trailer is being built!' })
  } catch (error) {
    console.error('Generate route error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
