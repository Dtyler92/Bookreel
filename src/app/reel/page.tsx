import type { Metadata } from 'next'
import ReelClient from '@/components/ReelClient'

export const metadata: Metadata = {
  title: 'BookReel — The Reel',
  description: 'Discover your next favourite book through cinematic trailers. Swipe through the BookReel feed.',
}

export default function ReelPage() {
  return <ReelClient />
}
