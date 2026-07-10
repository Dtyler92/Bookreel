import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getVideoConfig } from '@/lib/tierGate'
import { PlanName } from '@/lib/stripe'
import { getCreditState, consumeCredits } from '@/lib/credits'

const CREDIT_COST = {
  standard: 55,
  premium:  150,
} as const

type Quality = 'standard' | 'premium'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    // Auth check — derive userId from session only (never from request body)
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = user.id

    const body = await request.json() as { bookId: string; quality?: Quality; selectedSceneIds?: string[]; narratorVoice?: string | null }
    const { bookId, selectedSceneIds, narratorVoice } = body
    const quality: Quality = body.quality === 'premium' ? 'premium' : 'standard'
    const creditCost = CREDIT_COST[quality]

    if (!bookId) {
      return Response.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Verify book ownership
    const { data: bookOwnerCheck } = await supabase.from('books').select('author_id').eq('id', bookId).single()
    if (!bookOwnerCheck || bookOwnerCheck.author_id !== userId) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // --- Tier gate: check subscription ---
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

    // --- Credit gate ---
    // Check if this specific quality tier's credits have already been consumed for this book
    const { data: existingTrailer } = await supabase
      .from('trailers')
      .select('credit_consumed, quality_tier')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // A retry of the exact same quality is free; switching quality always costs credits
    const sameQualityRetry = existingTrailer?.credit_consumed && existingTrailer?.quality_tier === quality

    if (!sameQualityRetry) {
      const creditState = await getCreditState(userId)
      if (!creditState || creditState.credits < creditCost) {
        return NextResponse.json({
          error: `You need ${creditCost} credits for a ${quality} trailer. You have ${creditState?.credits ?? 0}. Buy more credits or choose Standard (55 credits).`,
          outOfCredits: true,
          creditsNeeded: creditCost,
          creditsHave: creditState?.credits ?? 0,
          resetAt: creditState?.resetAt ?? null,
        }, { status: 402 })
      }
    }

    // Get model config based on tier
    const modelConfig = getVideoConfig(tier as 'standard' | 'premium')
    console.log(`[generate] quality=${quality} cost=${creditCost}cr tier="${tier}" config:`, modelConfig)

    // Verify images have been approved before generating video.
    // If no trailer record exists (e.g. author deleted all previous trailers),
    // skip the images_approved flag check — character/item approval is verified
    // individually below, which is the real gate.
    const { data: trailer } = await supabase
      .from('trailers')
      .select('id, images_approved')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (trailer && !trailer.images_approved) {
      return Response.json(
        { error: 'Character and item images must be approved before generating your trailer', requiresImageApproval: true },
        { status: 400 }
      )
    }

    // Verify all characters are approved
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name, author_approved')
      .eq('book_id', bookId)

    if (charError) return Response.json({ error: 'Failed to fetch characters' }, { status: 500 })

    const unapprovedCharacters = (characters || []).filter((c: { author_approved: boolean }) => !c.author_approved)
    if (unapprovedCharacters.length > 0) {
      return Response.json(
        { error: `${unapprovedCharacters.length} character image(s) not yet approved`, unapprovedCount: unapprovedCharacters.length },
        { status: 400 }
      )
    }

    // Verify all items are approved
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, author_approved')
      .eq('book_id', bookId)

    if (itemsError) return Response.json({ error: 'Failed to fetch items' }, { status: 500 })

    const unapprovedItems = (items || []).filter((item: { author_approved: boolean }) => !item.author_approved)
    if (unapprovedItems.length > 0) {
      return Response.json(
        { error: `${unapprovedItems.length} item image(s) not yet approved`, unapprovedCount: unapprovedItems.length },
        { status: 400 }
      )
    }

    // Scenes approval:
    // Standard — selectedSceneIds must be provided with exactly 4 IDs; mark only those approved
    // Premium  — all scenes must already be approved
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('id, scene_number, author_approved')
      .eq('book_id', bookId)

    if (scenesError) return Response.json({ error: 'Failed to fetch scenes' }, { status: 500 })

    if (quality === 'standard') {
      if (!selectedSceneIds || selectedSceneIds.length !== 4) {
        return Response.json({ error: 'Please select exactly 4 scenes before generating a Standard trailer.' }, { status: 400 })
      }
      // Mark only the selected 4 as approved, unapprove the rest
      await supabase.from('scenes').update({ author_approved: false }).eq('book_id', bookId)
      await supabase.from('scenes').update({ author_approved: true }).in('id', selectedSceneIds).eq('book_id', bookId)
    } else {
      // Premium: all scenes must be approved
      const unapprovedScenes = (scenes || []).filter((s: { author_approved: boolean }) => !s.author_approved)
      if (unapprovedScenes.length > 0) {
        return Response.json(
          { error: `${unapprovedScenes.length} scene(s) not yet approved. Please review and approve all scenes before generating.`, unapprovedCount: unapprovedScenes.length },
          { status: 400 }
        )
      }
    }

    // Insert a NEW trailer row so the old trailer (with its video) is preserved.
    // The pipeline worker picks up by status='pending'; we need the new row's id.
    const { data: newTrailer, error: insertError } = await supabase
      .from('trailers')
      .insert({
        book_id: bookId,
        status: 'pending',
        quality_tier: quality,
        images_approved: true,
        credit_consumed: false,
        view_count: 0,
        click_count: 0,
        ...(narratorVoice ? { narrator_voice: narratorVoice } : {}),
      })
      .select('id')
      .single()

    if (insertError || !newTrailer) {
      console.error('Trailer insert error:', insertError)
      return Response.json({ error: 'Failed to create trailer record' }, { status: 500 })
    }

    // --- Deduct credits ---
    if (!sameQualityRetry) {
      await consumeCredits(userId, bookId, quality, creditCost)
      await supabase
        .from('trailers')
        .update({ credit_consumed: true, quality_tier: quality })
        .eq('id', newTrailer.id)
      console.log(`[generate] Deducted ${creditCost} credits (${quality}) for user ${userId}, book ${bookId}`)
    } else {
      console.log(`[generate] Same-quality retry — no credit deduction for user ${userId}, book ${bookId}`)
    }

    const pipelineQuality = quality === 'premium' ? 'premium' : 'standard'
    console.log(`[generate] Queued pipeline for bookId=${bookId} trailerId=${newTrailer.id} quality=${pipelineQuality}`)

    return Response.json({ success: true, message: 'Your trailer is being built!', quality, creditCost })
  } catch (error) {
    console.error('Generate route error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
