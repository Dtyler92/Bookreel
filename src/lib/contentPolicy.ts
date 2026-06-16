// BookReel Content Policy
// Allowed: Romance, scandalous scenes, tension, leading/suggestive content, violence (literary)
// NOT allowed: Nudity, sexual content, pornography, explicit sex acts

export const CONTENT_POLICY_SYSTEM_ADDENDUM = `
CONTENT POLICY (strictly enforced):
- You MUST NOT generate nudity, sexual content, explicit sex acts, or pornographic material of any kind
- Romance, tension, scandalous scenes, and suggestive/leading content IS allowed
- Keep all character appearance descriptions and scene descriptions suitable for a general audience book trailer
- If the source material contains explicit sexual content, adapt it to be suggestive but not explicit
- Violence may be depicted cinematically but not gratuitously
`

export const IMAGE_NEGATIVE_PROMPT = 'nudity, nude, naked, sexual, explicit, pornographic, nsfw, genitalia, exposed breasts, sex act'

export const FAL_CONTENT_POLICY = {
  negative_prompt: IMAGE_NEGATIVE_PROMPT,
  safety_tolerance: '2', // strict safety
}

export function sanitizeAppearanceDescription(description: string): string {
  // Remove any explicit descriptions that might slip through
  const explicitTerms = ['nude', 'naked', 'topless', 'bottomless', 'explicit', 'sexual', 'nsfw']
  let sanitized = description
  for (const term of explicitTerms) {
    const regex = new RegExp(term, 'gi')
    sanitized = sanitized.replace(regex, '')
  }
  return sanitized.trim()
}

export function sanitizeSceneDescription(description: string): string {
  const explicitTerms = ['nude', 'naked', 'sex scene', 'sexual intercourse', 'explicit', 'pornographic', 'nsfw', 'genitalia']
  let sanitized = description
  for (const term of explicitTerms) {
    const regex = new RegExp(term, 'gi')
    sanitized = sanitized.replace(regex, 'intimate')
  }
  return sanitized.trim()
}
