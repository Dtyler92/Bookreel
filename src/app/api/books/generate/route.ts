import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
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
        return NextResponse.json({ 
          error: 'Trailer generation requires an Author or Pro subscription. Upgrade your plan to create trailers.',
          upgradeRequired: true
        }, { status: 403 })
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

    if (trailerFetchError || !trailer) {
      console.error('Trailer fetch error:', trailerFetchError)
      return Response.json({ error: 'No trailer record found. Please complete the image review step first.', requiresImageApproval: true }, { status: 400 })
    }

    if (!trailer.images_approved) {
      return Response.json(
        { error: 'Character and item images must be approved before generating your trailer', requiresImageApproval: true },
        { status: 400 }
      )
    }

    // Verify all characters for this book are approved
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name, author_approved')
      .eq('book_id', bookId)

    if (charError) {
      console.error('Characters fetch error:', charError)
      return Response.json({ error: 'Failed to fetch characters' }, { status: 500 })
    }

    console.log('[generate] Characters found:', characters?.length ?? 0, characters?.map((c: { id: string; name: string; author_approved: boolean }) => ({ id: c.id, name: c.name, approved: c.author_approved })))

    const unapprovedCharacters = (characters || []).filter((c: { author_approved: boolean }) => !c.author_approved)
    if (unapprovedCharacters.length > 0) {
      console.log('[generate] Unapproved characters count:', unapprovedCharacters.length)
      return Response.json(
        {
          error: `${unapprovedCharacters.length} character image(s) not yet approved`,
          unapprovedCount: unapprovedCharacters.length
        },
        { status: 400 }
      )
    }

    // Verify all items for this book are approved
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, author_approved')
      .eq('book_id', bookId)

    if (itemsError) {
      console.error('Items fetch error:', itemsError)
      return Response.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    console.log('[generate] Items found:', items?.length ?? 0)

    const unapprovedItems = (items || []).filter((item: { author_approved: boolean }) => !item.author_approved)
    if (unapprovedItems.length > 0) {
      console.log('[generate] Unapproved items count:', unapprovedItems.length)
      return Response.json(
        {
          error: `${unapprovedItems.length} item image(s) not yet approved`,
          unapprovedCount: unapprovedItems.length
        },
        { status: 400 }
      )
    }

    // Note: scene-level author_approved is set during the manuscript review step
    // (not the image review step), so we do NOT re-check scenes here.
    // The images_approved flag on the trailer record is the final gate before video generation.

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
