import AudiobookClient from '@/components/author/AudiobookClient'

export default async function AudiobookPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params
  return <AudiobookClient bookId={bookId} />
}
