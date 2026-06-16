export async function generateVideoClip(
  imageUrl: string,
  sceneDescription: string,
  durationSeconds: number = 5,
  tier: 'standard' | 'cinematic' = 'standard'
): Promise<string> {
  const RUNWAY_API_KEY = process.env.RUNWAYML_API_KEY

  // Runway API hostname is api.dev.runwayml.com (not api.runwayml.com)
  // Valid ratios: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672'
  // Valid duration: 5 or 10 seconds. gen4 model is unavailable; use gen4_turbo for all tiers.
  const clampedDuration = durationSeconds <= 5 ? 5 : 10

  // Create generation task
  const createResponse = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model: 'gen4_turbo',
      promptImage: imageUrl,
      promptText: sceneDescription,
      duration: clampedDuration,
      ratio: '1280:720',
    })
  })

  const task = await createResponse.json()
  const taskId = task.id

  if (!taskId) {
    throw new Error(`Runway task creation failed: ${JSON.stringify(task)}`)
  }

  // Poll for completion (max 5 minutes)
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // wait 5 seconds

    const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06'
      }
    })

    const status = await statusResponse.json()

    if (status.status === 'SUCCEEDED') {
      return status.output[0] // video URL
    }

    if (status.status === 'FAILED') {
      throw new Error(`Runway generation failed: ${status.failure}`)
    }

    attempts++
  }

  throw new Error('Runway generation timed out')
}
