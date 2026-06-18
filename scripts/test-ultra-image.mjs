import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('/root/bookreel/.env.local', 'utf8')
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null }

const FAL_API_KEY = getEnv('FAL_API_KEY')
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

const prompt = `a gaunt pale vampire count standing in a moonlit Gothic castle courtyard, dramatic shadows, gothic mood, cinematic film still, shot on ARRI Alexa, anamorphic lens, shallow depth of field, dramatic atmospheric lighting, ultra-realistic, photorealistic, 8K, no text, no watermarks, no logos, tasteful, general audience`

console.log('Testing flux-pro/v1.1-ultra...')
const res = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
  method: 'POST',
  headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, aspect_ratio: '16:9', num_images: 1, output_format: 'jpeg', raw: true, safety_tolerance: '6' })
})
if (!res.ok) { console.error('FAILED:', res.status, await res.text()); process.exit(1) }
const data = await res.json()
const falUrl = data.images?.[0]?.url
if (!falUrl) { console.error('No URL in response:', JSON.stringify(data)); process.exit(1) }
console.log('fal.ai URL:', falUrl)

// Download
const imgRes = await fetch(falUrl)
if (!imgRes.ok) { console.error('Download failed:', imgRes.status); process.exit(1) }
const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
console.log(`Downloaded: ${imgBuffer.length} bytes`)

// Upload to Supabase
const storagePath = `scene-images/ultra-test-${Date.now()}.jpg`
const { error } = await supabase.storage.from('media').upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: false })
if (error) { console.error('Upload failed:', error.message); process.exit(1) }
const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
console.log('✅ Public URL:', urlData.publicUrl)
