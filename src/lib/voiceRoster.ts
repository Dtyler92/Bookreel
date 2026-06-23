export interface VoiceOption {
  key: string          // used as voice_key in DB
  name: string         // ElevenLabs voice name (sent to TTS API)
  label: string        // display name
  gender: 'male' | 'female' | 'neutral'
  style: string        // e.g. 'Deep & Cinematic', 'Warm & Friendly'
  previewUrl: string   // /voice-previews/<name>.mp3
  hasPreview: boolean
}

export const VOICE_ROSTER: VoiceOption[] = [
  // MALE VOICES
  { key: 'narrator',    name: 'Daniel',   label: 'Daniel',   gender: 'male',    style: 'Deep & Cinematic',    previewUrl: '/voice-previews/daniel.mp3',    hasPreview: true },
  { key: 'deep_male',   name: 'George',   label: 'George',   gender: 'male',    style: 'Mature & Resonant',   previewUrl: '/voice-previews/george.mp3',    hasPreview: true },
  { key: 'male',        name: 'Liam',     label: 'Liam',     gender: 'male',    style: 'Clear & Versatile',   previewUrl: '/voice-previews/liam.mp3',      hasPreview: true },
  { key: 'old_male',    name: 'Bill',     label: 'Bill',     gender: 'male',    style: 'Aged & Weathered',    previewUrl: '/voice-previews/bill.mp3',      hasPreview: true },
  { key: 'roger',       name: 'Roger',    label: 'Roger',    gender: 'male',    style: 'Confident & Bold',    previewUrl: '/voice-previews/roger.mp3',     hasPreview: true },
  { key: 'will',        name: 'Will',     label: 'Will',     gender: 'male',    style: 'Friendly & Warm',     previewUrl: '/voice-previews/will.mp3',      hasPreview: true },
  { key: 'eric',        name: 'Eric',     label: 'Eric',     gender: 'male',    style: 'Smooth & Engaging',   previewUrl: '/voice-previews/eric.mp3',      hasPreview: true },
  { key: 'chris',       name: 'Chris',    label: 'Chris',    gender: 'male',    style: 'Casual & Relatable',  previewUrl: '/voice-previews/chris.mp3',     hasPreview: true },
  { key: 'brian',       name: 'Brian',    label: 'Brian',    gender: 'male',    style: 'Rich & Authoritative',previewUrl: '/voice-previews/brian.mp3',     hasPreview: true },
  { key: 'callum',      name: 'Callum',   label: 'Callum',   gender: 'male',    style: 'Intense & Dramatic',  previewUrl: '/voice-previews/callum.mp3',    hasPreview: true },
  // FEMALE VOICES
  { key: 'female',      name: 'Charlotte',label: 'Charlotte',gender: 'female',  style: 'Clear & Expressive',  previewUrl: '/voice-previews/charlotte.mp3', hasPreview: true },
  { key: 'young_female',name: 'Alice',    label: 'Alice',    gender: 'female',  style: 'Bright & Energetic',  previewUrl: '/voice-previews/alice.mp3',     hasPreview: true },
  { key: 'aria',        name: 'Aria',     label: 'Aria',     gender: 'female',  style: 'Warm & Storytelling', previewUrl: '/voice-previews/aria.mp3',      hasPreview: true },
  { key: 'sarah',       name: 'Sarah',    label: 'Sarah',    gender: 'female',  style: 'Soft & Sincere',      previewUrl: '/voice-previews/sarah.mp3',     hasPreview: true },
  { key: 'laura',       name: 'Laura',    label: 'Laura',    gender: 'female',  style: 'Upbeat & Natural',    previewUrl: '/voice-previews/laura.mp3',     hasPreview: true },
  { key: 'matilda',     name: 'Matilda',  label: 'Matilda',  gender: 'female',  style: 'Warm & Confident',    previewUrl: '/voice-previews/matilda.mp3',   hasPreview: true },
  { key: 'jessica',     name: 'Jessica',  label: 'Jessica',  gender: 'female',  style: 'Expressive & Lively', previewUrl: '/voice-previews/jessica.mp3',   hasPreview: true },
  { key: 'lily',        name: 'Lily',     label: 'Lily',     gender: 'female',  style: 'Soft & Gentle',       previewUrl: '/voice-previews/lily.mp3',      hasPreview: true },
  // NEUTRAL
  { key: 'default',     name: 'Charlie',  label: 'Charlie',  gender: 'neutral', style: 'Balanced & Clear',    previewUrl: '/voice-previews/charlie.mp3',   hasPreview: true },
  { key: 'rachel',      name: 'Rachel',   label: 'Rachel',   gender: 'female',  style: 'Calm & Professional', previewUrl: '/voice-previews/rachel.mp3',    hasPreview: true },
  { key: 'river',       name: 'River',    label: 'River',    gender: 'neutral', style: 'Smooth & Neutral',    previewUrl: '/voice-previews/river.mp3',     hasPreview: true },
]

// Legacy key map for backwards compat with existing voice_key values in DB
export const LEGACY_VOICE_MAP: Record<string, string> = {
  deep_male: 'George',
  male: 'Liam',
  old_male: 'Bill',
  female: 'Charlotte',
  young_female: 'Alice',
  default: 'Charlie',
  narrator: 'Daniel',
}

export function voiceNameForKey(key: string): string {
  const v = VOICE_ROSTER.find(v => v.key === key)
  if (v) return v.name
  return LEGACY_VOICE_MAP[key] || 'Charlie'
}

export const NARRATOR_VOICE = 'Daniel'
