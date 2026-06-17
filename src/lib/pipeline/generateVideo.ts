function getRunwayDuration(targetSeconds: number): 5 | 10 {
  return targetSeconds >= 8 ? 10 : 5
}

export async function generateVideoClip(
  imageUrl: string,
  sceneDescription: string,
  durationSeconds: number = 5,
  tier: 'standard' | 'cinematic' = 'standard'
): Promise<string> {
  const RUNWAY_API_KEY = process.env.RUNWAYML_API_KEY

  // Runway public API hostname: https://api.dev.runwayml.com
  // Docs: https://docs.runwayml.com/api
  // Auth: Authorization: Bearer *** (Bearer scheme with key_ prefix)
  // Valid ratios: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672'
  // Valid duration: 5 or 10 seconds.
  // Models: gen4_turbo (standard/faster), gen4 (cinematic/higher quality)
  const RUNWAY_API_BASE = 'https://api.dev.runwayml.com'
  const runwayDuration = getRunwayDuration(durationSeconds)

  // Select model based on tier: gen4_turbo for standard (faster), gen4 for cinematic (higher quality)
  const model = tier === 'cinematic' ? 'gen4_turbo' : 'gen4_turbo'
  // NOTE: If gen4 becomes available for cinematic tier, change above to:
  // const model = tier === 'cinematic' ? 'gen4' : 'gen4_turbo'

  console.log(`[generateVideo] Using model=${model}, duration=${runwayDuration}s, tier=${tier}`)

  // Create generation task
  const createResponse = await fetch(`${RUNWAY_API_BASE}/v1/image_to_video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model,
      promptImage: imageUrl,
      promptText: sceneDescription,
      duration: runwayDuration,
      ratio: '1280:720',
    })
  })

  if (!createResponse.ok) {
    const errorBody = await createResponse.text()
    console.error(`[generateVideo] Runway API error ${createResponse.status}: ${errorBody}`)
    throw new Error(`Runway API error ${createResponse.status}: ${errorBody}`)
  }

  const task = await createResponse.json()
  const taskId = task.id

  if (!taskId) {
    console.error(`[generateVideo] Runway task creation failed — full response:`, JSON.stringify(task))
    throw new Error(`Runway task creation failed: ${JSON.stringify(task)}`)
  }

  console.log(`[generateVideo] Task created: ${taskId}`)

  // Poll for completion (max 5 minutes)
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // wait 5 seconds

    const statusResponse = await fetch(`${RUNWAY_API_BASE}/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06'
      }
    })

    if (!statusResponse.ok) {
      const errorBody = await statusResponse.text()
      console.error(`[generateVideo] Runway status check error ${statusResponse.status}: ${errorBody}`)
      throw new Error(`Runway status check error ${statusResponse.status}: ${errorBody}`)
    }

    const status = await statusResponse.json()

    if (status.status === 'SUCCEEDED') {
      console.log(`[generateVideo] Task ${taskId} succeeded`)
      return status.output[0] // video URL
    }

    if (status.status === 'FAILED') {
      console.error(`[generateVideo] Task ${taskId} failed — full response:`, JSON.stringify(status))
      throw new Error(`Runway generation failed: ${status.failure || JSON.stringify(status)}`)
    }

    console.log(`[generateVideo] Task ${taskId} status: ${status.status} (attempt ${attempts + 1}/${maxAttempts})`)
    attempts++
  }

  throw new Error('Runway generation timed out after 5 minutes')
}
