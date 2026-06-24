import type { Metadata } from 'next'
import AuthorPageClient from '@/components/AuthorPageClient'

export const metadata: Metadata = {
  title: 'Author — BookReel',
}

export default function AuthorPage() {
  return <AuthorPageClient />
}
