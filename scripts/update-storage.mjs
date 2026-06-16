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

// Update bucket to allow txt files too
const { data, error } = await supabase.storage.updateBucket('books', {
  public: false,
  fileSizeLimit: 52428800,
  allowedMimeTypes: ['application/pdf', 'text/plain']
})

if (error) {
  console.error('❌ Error updating bucket:', error.message)
} else {
  console.log('✅ Storage bucket updated to allow PDF and TXT')
}
