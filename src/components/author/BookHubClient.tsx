'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface Book {
  id: string
  title: string
  genre?: string | null
  description?: string | null
  cover_image_url?: string | null
}

interface Trailer {
  id: string
  status: string
  video_url?: string | null
  quality_tier?: string | null
}

interface Character {
  id: string
  name: string
  image_url?: string | null
  author_approved?: boolean | null
}

interface Scene {
  id: string
  scene_number: number
  description?: string | null
  screenplay_text?: string | null
}

interface Audiobook {
  id: string
  status: string
  audio_url?: string | null
}

interface Props {
  book: Book
  trailer: Trailer | null
  characters: Character[]
  scenes: Scene[]
  audiobook: Audiobook | null
  userName: string
}

function HubCard({
  icon,
  title,
  description,
  status,
  statusLabel,
  href,
  addLabel,
  addHref,
  onClick,
}: {
  icon: string
  title: string
  description: string
  status: 'complete' | 'in-progress' | 'empty'
  statusLabel?: string
  href?: string
  addLabel?: string
  addHref?: string
  onClick?: () => void
}) {
  const statusColors = {
    complete: 'bg-green-50 border-green-200',
    'in-progress': 'bg-amber-50 border-amber-200',
    empty: 'bg-[#FAFAF7] border-[#E8E2D5]',
  }
  const statusDot = {
    complete: 'bg-green-500',
    'in-progress': 'bg-amber-400',
    empty: 'bg-gray-300',
  }
  const statusText = {
    complete: statusLabel ?? 'Ready',
    'in-progress': statusLabel ?? 'In progress',
    empty: statusLabel ?? 'Not created',
  }

  const cardContent = (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md cursor-pointer ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        <div className="text-3xl">{icon}</div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
          <span className="text-xs font-medium text-gray-500">{statusText[status]}</span>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-[#2B2B2B] text-base">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{description}</p>
      </div>
      {status === 'empty' && addHref && (
        <Link
          href={addHref}
          onClick={e => e.stopPropagation()}
          className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-[#C8402F] hover:text-[#A8321F] transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          {addLabel ?? `Create ${title}`}
        </Link>
      )}
      {status === 'empty' && !addHref && onClick && (
        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-[#C8402F] hover:text-[#A8321F] transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          {addLabel ?? `Create ${title}`}
        </button>
      )}
    </div>
  )

  if (href && status !== 'empty') {
    return <Link href={href} className="block no-underline">{cardContent}</Link>
  }
  if (onClick && status !== 'empty') {
    return <div onClick={onClick}>{cardContent}</div>
  }
  return cardContent
}

export default function BookHubClient({ book, trailer, characters, scenes, audiobook, userName }: Props) {
  const router = useRouter()

  const hasTrailer = trailer && (trailer.status === 'complete' || !!trailer.video_url)
  const trailerInProgress = trailer && (trailer.status === 'pending' || trailer.status === 'processing' || trailer.status === 'generating')
  const hasCharacters = characters.length > 0
  const hasScreenplay = scenes.length > 0 && scenes.some(s => s.screenplay_text)
  const hasAudiobook = !!audiobook && (audiobook.status === 'complete' || !!audiobook.audio_url)
  const audiobookInProgress = !!audiobook && (audiobook.status === 'pending' || audiobook.status === 'processing')

  type SectionDef = {
    icon: string
    title: string
    description: string
    status: 'complete' | 'in-progress' | 'empty'
    statusLabel?: string
    href?: string
    addLabel?: string
    addHref?: string
    onClick?: () => void
  }

  const sections: SectionDef[] = [
    {
      icon: '🎬',
      title: 'Book Trailer',
      description: 'Cinematic video trailer to market your book',
      status: hasTrailer ? 'complete' : trailerInProgress ? 'in-progress' : 'empty',
      statusLabel: hasTrailer ? `${trailer?.quality_tier ?? ''} trailer ready`.trim() : trailerInProgress ? 'Generating…' : undefined,
      href: hasTrailer ? `/review/${book.id}` : undefined,
      addLabel: 'Generate Trailer',
      addHref: !trailer ? `/upload?book=${book.id}` : undefined,
      onClick: trailerInProgress ? () => router.push(`/review/${book.id}`) : undefined,
    },
    {
      icon: '👥',
      title: 'Character Images',
      description: '3-angle character sheets for your cast',
      status: hasCharacters ? 'complete' : 'empty',
      statusLabel: hasCharacters ? `${characters.length} character${characters.length !== 1 ? 's' : ''}` : undefined,
      href: hasCharacters ? `/review-images/${book.id}` : undefined,
      addLabel: 'Generate Characters',
      addHref: `/upload?book=${book.id}`,
    },
    {
      icon: '📝',
      title: 'Screenplay',
      description: 'Scene-by-scene cinematic screenplay',
      status: hasScreenplay ? 'complete' : scenes.length > 0 ? 'in-progress' : 'empty',
      statusLabel: hasScreenplay ? `${scenes.length} scenes` : scenes.length > 0 ? 'Scenes ready, screenplay pending' : undefined,
      href: hasScreenplay ? `/review/${book.id}` : undefined,
      addLabel: 'Generate Screenplay',
      addHref: `/upload?book=${book.id}`,
    },
    {
      icon: '🎧',
      title: 'Audiobook',
      description: 'Full-cast AI-voiced audiobook',
      status: hasAudiobook ? 'complete' : audiobookInProgress ? 'in-progress' : 'empty',
      statusLabel: audiobookInProgress ? 'Generating…' : undefined,
      href: hasAudiobook || audiobookInProgress ? `/audiobook/${book.id}` : undefined,
      addLabel: 'Create Audiobook',
      addHref: `/audiobook/${book.id}`,
    },
    {
      icon: '📱',
      title: 'Social Media Clips',
      description: 'Short-form clips for TikTok, Instagram & more',
      status: 'empty' as const,
      addLabel: 'Coming Soon',
    },
    {
      icon: '✉️',
      title: 'Email Templates',
      description: 'Launch emails, ARC requests & newsletters',
      status: 'empty' as const,
      addLabel: 'Coming Soon',
    },
  ] as const

  return (
    <main className="min-h-screen bg-[#FAFAF7] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2B2B2B] transition-colors mb-6"
        >
          ← My Books
        </button>

        {/* Book header */}
        <div className="flex gap-5 items-start mb-8">
          <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 shadow">
            {book.cover_image_url ? (
              <Image src={book.cover_image_url} alt={book.title} width={80} height={112} className="object-cover w-full h-full" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#2B2B2B] leading-tight">{book.title}</h1>
            {book.genre && <p className="text-sm text-gray-500 mt-1 capitalize">{book.genre}</p>}
            {book.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{book.description}</p>
            )}
          </div>
        </div>

        {/* Section cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <HubCard
              key={section.title}
              icon={section.icon}
              title={section.title}
              description={section.description}
              status={section.status}
              statusLabel={section.statusLabel}
              href={section.href}
              addLabel={section.addLabel}
              addHref={section.addHref}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
