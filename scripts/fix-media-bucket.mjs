import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('/root/bookreel/.env.local', 'utf8')
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
)

// Inspect current config
const { data: before, error: getErr } = await supabase.storage.getBucket('media')
if (getErr) { console.error('❌ getBucket:', getErr.message); process.exit(1) }
console.log('BEFORE:', JSON.stringify({
  public: before.public,
  allowedMimeTypes: before.allowed_mime_types,
  fileSizeLimit: before.file_size_limit,
}, null, 2))

// Update: allow the mime types the pipeline actually uploads (jpeg images + mp4 video).
const { error: updErr } = await supabase.storage.updateBucket('media', {
  public: true,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg'],
  fileSizeLimit: '50MB', // Supabase free-tier project ceiling; can't exceed without a plan upgrade
})
if (updErr) { console.error('❌ updateBucket:', updErr.message); process.exit(1) }

const { data: after } = await supabase.storage.getBucket('media')
console.log('AFTER:', JSON.stringify({
  public: after.public,
  allowedMimeTypes: after.allowed_mime_types,
  fileSizeLimit: after.file_size_limit,
}, null, 2))
console.log('✅ media bucket updated')
