// Required Vercel env vars:
// ANTHROPIC_API_KEY - primary AI provider (Anthropic Claude Sonnet)
// OPENROUTER_API_KEY - fallback AI provider (OpenRouter)
import Anthropic from '@anthropic-ai/sdk'

const VOICEOVER_SYSTEM_PROMPT =
  'You are a voiceover writer for cinematic book trailers. Write compelling, atmospheric narration. Maximum 120 words. No character names in the first line. Build tension. End with the book title.'

export async function generateVoiceoverScript(
  bookTitle: string,
  scenes: Array<{ description: string; screenplay_text: string | null }>,
  tone: string
): Promise<string> {
  const userContent = `Write a voiceover script for a book trailer for "${bookTitle}". Tone: ${tone}. Key scenes: ${scenes.map(s => s.description).join('. ')}`

  const isPlaceholder = (v: string | undefined) =>
    !v || ['***', 'xxx', 'placeholder'].includes(v) || v.length < 10

  const useAnthropic = process.env.ANTHROPIC_API_KEY &&
    !isPlaceholder(process.env.ANTHROPIC_API_KEY)

  if (useAnthropic) {
    // ── Primary: Anthropic Claude Sonnet ──────────────────────────────────
    console.log('[generateVoiceover] Using Anthropic Claude claude-sonnet-4-5')
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      system: VOICEOVER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userContent
        }
      ]
    })

    return message.content[0].type === 'text' ? message.content[0].text : ''
  } else {
    // ── Fallback: OpenRouter ───────────────────────────────────────────────
    console.log('[generateVoiceover] Falling back to OpenRouter')
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
            content: VOICEOVER_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userContent
          }
        ]
      })
    })
    const data = await response.json()
    return data.choices[0].message.content
  }
}
