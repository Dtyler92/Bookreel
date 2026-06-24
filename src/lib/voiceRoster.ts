export interface VoiceOption {
  key: string          // used as voice_key in DB
  name: string         // ElevenLabs voice name (sent to TTS API)
  label: string        // display name
  gender: 'male' | 'female' | 'neutral'
  style: string        // e.g. 'Deep & Cinematic'
  previewUrl: string   // /voice-previews/<name>.mp3
  hasPreview: boolean
}

export const VOICE_ROSTER: VoiceOption[] = [
  // MALE VOICES
  { key: 'daniel',   name: 'Daniel',  label: 'Daniel',  gender: 'male',    style: 'Steady Broadcaster',      previewUrl: '/voice-previews/daniel.mp3',   hasPreview: true },
  { key: 'george',   name: 'George',  label: 'George',  gender: 'male',    style: 'Warm Storyteller',        previewUrl: '/voice-previews/george.mp3',   hasPreview: true },
  { key: 'liam',     name: 'Liam',    label: 'Liam',    gender: 'male',    style: 'Energetic & Social',      previewUrl: '/voice-previews/liam.mp3',     hasPreview: true },
  { key: 'bill',     name: 'Bill',    label: 'Bill',    gender: 'male',    style: 'Wise & Mature',           previewUrl: '/voice-previews/bill.mp3',     hasPreview: true },
  { key: 'roger',    name: 'Roger',   label: 'Roger',   gender: 'male',    style: 'Laid-Back & Casual',      previewUrl: '/voice-previews/roger.mp3',    hasPreview: true },
  { key: 'will',     name: 'Will',    label: 'Will',    gender: 'male',    style: 'Relaxed Optimist',        previewUrl: '/voice-previews/will.mp3',     hasPreview: true },
  { key: 'eric',     name: 'Eric',    label: 'Eric',    gender: 'male',    style: 'Smooth & Trustworthy',    previewUrl: '/voice-previews/eric.mp3',     hasPreview: true },
  { key: 'chris',    name: 'Chris',   label: 'Chris',   gender: 'male',    style: 'Charming & Relatable',    previewUrl: '/voice-previews/chris.mp3',    hasPreview: true },
  { key: 'brian',    name: 'Brian',   label: 'Brian',   gender: 'male',    style: 'Deep & Resonant',         previewUrl: '/voice-previews/brian.mp3',    hasPreview: true },
  { key: 'callum',   name: 'Callum',  label: 'Callum',  gender: 'male',    style: 'Husky & Dramatic',        previewUrl: '/voice-previews/callum.mp3',   hasPreview: true },
  { key: 'adam',     name: 'Adam',    label: 'Adam',    gender: 'male',    style: 'Dominant & Firm',         previewUrl: '/voice-previews/adam.mp3',     hasPreview: false },
  { key: 'harry',    name: 'Harry',   label: 'Harry',   gender: 'male',    style: 'Fierce & Intense',        previewUrl: '/voice-previews/harry.mp3',    hasPreview: false },
  // FEMALE VOICES
  { key: 'charlotte',name: 'Charlotte',label:'Charlotte',gender:'female',  style: 'Clear & Expressive',      previewUrl: '/voice-previews/charlotte.mp3',hasPreview: true },
  { key: 'alice',    name: 'Alice',   label: 'Alice',   gender: 'female',  style: 'Clear & Engaging',        previewUrl: '/voice-previews/alice.mp3',    hasPreview: true },
  { key: 'aria',     name: 'Aria',    label: 'Aria',    gender: 'female',  style: 'Warm & Storytelling',     previewUrl: '/voice-previews/aria.mp3',     hasPreview: true },
  { key: 'sarah',    name: 'Sarah',   label: 'Sarah',   gender: 'female',  style: 'Mature & Reassuring',     previewUrl: '/voice-previews/sarah.mp3',    hasPreview: true },
  { key: 'laura',    name: 'Laura',   label: 'Laura',   gender: 'female',  style: 'Enthusiastic & Quirky',   previewUrl: '/voice-previews/laura.mp3',    hasPreview: true },
  { key: 'matilda',  name: 'Matilda', label: 'Matilda', gender: 'female',  style: 'Professional & Polished', previewUrl: '/voice-previews/matilda.mp3',  hasPreview: true },
  { key: 'jessica',  name: 'Jessica', label: 'Jessica', gender: 'female',  style: 'Playful & Bright',        previewUrl: '/voice-previews/jessica.mp3',  hasPreview: true },
  { key: 'lily',     name: 'Lily',    label: 'Lily',    gender: 'female',  style: 'Velvety & Dramatic',      previewUrl: '/voice-previews/lily.mp3',     hasPreview: true },
  { key: 'bella',    name: 'Bella',   label: 'Bella',   gender: 'female',  style: 'Professional & Warm',     previewUrl: '/voice-previews/bella.mp3',    hasPreview: false },
  // NEUTRAL VOICES
  { key: 'charlie',  name: 'Charlie', label: 'Charlie', gender: 'neutral', style: 'Deep & Confident',        previewUrl: '/voice-previews/charlie.mp3',  hasPreview: true },
  { key: 'river',    name: 'River',   label: 'River',   gender: 'neutral', style: 'Relaxed & Neutral',       previewUrl: '/voice-previews/river.mp3',    hasPreview: true },
]

// Split by gender for the picker UI
export const maleVoices    = VOICE_ROSTER.filter(v => v.gender === 'male')
export const femaleVoices  = VOICE_ROSTER.filter(v => v.gender === 'female')
export const neutralVoices = VOICE_ROSTER.filter(v => v.gender === 'neutral')

// Legacy key map for backwards compat with existing voice_key values in DB
export const LEGACY_VOICE_MAP: Record<string, string> = {
  deep_male:    'George',
  male:         'Liam',
  old_male:     'Bill',
  female:       'Charlotte',
  young_female: 'Alice',
  default:      'Charlie',
  narrator:     'Daniel',
}

export function voiceNameForKey(key: string): string {
  const v = VOICE_ROSTER.find(v => v.key === key)
  if (v) return v.name
  return LEGACY_VOICE_MAP[key] || 'Daniel'
}

export const NARRATOR_VOICE = 'Daniel'
