export async function generateVideoClip(
  imageUrl: string,
  sceneDescription: string,
  durationSeconds: number = 10,
  tier: 'standard' | 'cinematic' = 'standard'
): Promise<string> {
  const RUNWAY_API_KEY = process.env.RUNWAYML_API_KEY

  // Create generation task
  const createResponse = await fetch('https://api.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model: tier === 'cinematic' ? 'gen4' : 'gen4_turbo',
      promptImage: imageUrl,
      promptText: sceneDescription,
      duration: durationSeconds,
      ratio: '1280:768'
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

    const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
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
