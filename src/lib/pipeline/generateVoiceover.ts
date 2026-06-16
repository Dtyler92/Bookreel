export async function generateVoiceoverScript(
  bookTitle: string,
  scenes: Array<{ description: string; screenplay_text: string | null }>,
  tone: string
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bookreel.app',
      'X-Title': 'BookReel'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a voiceover writer for cinematic book trailers. Write compelling, atmospheric narration. Maximum 120 words. No character names in the first line. Build tension. End with the book title.'
        },
        {
          role: 'user',
          content: `Write a voiceover script for a book trailer for "${bookTitle}". Tone: ${tone}. Key scenes: ${scenes.map(s => s.description).join('. ')}`
        }
      ]
    })
  })
  const data = await response.json()
  return data.choices[0].message.content
}
