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

const { data, error } = await supabase.storage.createBucket('books', {
  public: false,
  fileSizeLimit: 52428800,
  allowedMimeTypes: ['application/pdf']
})

if (error && error.message !== 'The resource already exists') {
  console.error('❌ Error creating bucket:', error.message)
} else {
  console.log('✅ Books storage bucket ready')
}
