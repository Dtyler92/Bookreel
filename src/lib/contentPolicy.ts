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

// Guidance for the screenplay-writing step: proactively choose/frame scenes that will
// survive an automated video content-moderation filter (Runway), while staying true to the story.
export const SCREENPLAY_MODERATION_GUIDANCE = `
SCENE SELECTION FOR VIDEO (critical — these become AI-generated video clips that pass through a strict automated content-moderation filter):
- These scene descriptions are sent to a video generator with automated content moderation. Scenes depicting graphic violence, gore, blood, wounds, death, nudity, sexual acts, drug use, self-harm, or explicit horror WILL be rejected and cannot be filmed.
- When a pivotal story moment involves something that would be rejected (e.g. a murder, an assault, a transformation into a monster, an intimate encounter, a gory injury), DO ONE OF THESE:
  1. PREFER choosing a different, equally compelling scene from the same story that captures the mood/stakes WITHOUT the rejectable content (e.g. the tense moment before, the aftermath shown through atmosphere, a character's haunted reaction).
  2. If the rejectable moment is essential, write it IMPLIED and ATMOSPHERIC rather than literal — use shadow, silhouette, suggestion, environment, weather, facial expression, and symbolic imagery. Show the emotional truth, not the graphic act.
- Examples of safe reframing:
  - Instead of "a bloody murder with a knife" → "a shadowed figure in a dim alley, a glint of steel, the victim's terrified eyes widening" 
  - Instead of "a monstrous violent transformation" → "a man clutching his face in agony before a mirror, his reflection distorting into something inhuman, shrouded in shadow"
  - Instead of "an explicit intimate scene" → "two figures drawing close in candlelight, a charged glance, a hand brushing a shoulder"
- Keep scenes cinematic and evocative. Atmosphere, lighting, and emotion sell a trailer better than graphic content anyway.
- The goal: every scene should be FILMABLE by a moderated video generator on the first try, while remaining faithful to the book's tone and story.
`


export const IMAGE_NEGATIVE_PROMPT = 'text, words, letters, captions, subtitles, title, watermark, logo, signature, writing, typography, numbers, labels, nudity, nude, naked, sexual, explicit, pornographic, nsfw, genitalia, exposed breasts, sex act'

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
