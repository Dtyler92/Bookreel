'use client'

import Link from 'next/link'
import { GlobalNav } from '@/components/shared/GlobalNav'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PrimaryButton } from '@/components/shared/PrimaryButton'
import type { TrailerStatus } from '@/types/database'

interface BookWithStatus {
  id: string
  title: string
  genre: string | null
  created_at: string
  trailerStatus: TrailerStatus | null
  viewCount: number
}

interface DashboardClientProps {
  firstName: string
  userTier: 'free' | 'author' | 'pro'
  userName: string
  books: BookWithStatus[]
  trailersGenerated: number
  totalViews: number
}

export function DashboardClient({
  firstName,
  userTier,
  userName,
  books,
  trailersGenerated,
  totalViews,
}: DashboardClientProps) {
  const stats = [
    { label: 'Trailers Generated', value: trailersGenerated },
    { label: 'Total Views', value: totalViews },
    { label: 'Books Listed', value: books.length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7' }}>
      <GlobalNav userName={userName} userTier={userTier} />

      <main style={{
        paddingTop: '64px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '104px 24px 64px',
      }}>
        {/* Welcome */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            fontSize: '36px',
            color: '#0D0D0B',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Welcome back, {firstName}.
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '15px',
            color: '#8A8278',
            marginTop: '8px',
            marginBottom: 0,
          }}>
            Here&apos;s what&apos;s happening with your books.
          </p>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '48px',
        }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{
              background: '#F4F1EB',
              border: '1px solid #E8E2D5',
              borderRadius: '12px',
              padding: '24px 28px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
            }}>
              {/* Accent bar */}
              <div style={{
                width: '3px',
                height: '40px',
                background: '#C8402F',
                borderRadius: '2px',
                flexShrink: 0,
              }} />
              <div>
                <div style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 900,
                  fontSize: '48px',
                  color: '#0D0D0B',
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#8A8278',
                  marginTop: '4px',
                }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Books Section */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#0D0D0B',
              margin: 0,
            }}>
              My Books
            </h2>
            <Link href="/upload" style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: '#C8402F',
              textDecoration: 'none',
            }}>
              Add My First Book →
            </Link>
          </div>

          {books.length === 0 ? (
            /* Empty State */
            <div style={{
              background: '#F4F1EB',
              border: '2px dashed #E8E2D5',
              borderRadius: '16px',
              padding: '80px 40px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '56px', marginBottom: '20px' }}>📚</div>
              <h3 style={{
                fontFamily: 'var(--font-playfair), serif',
                fontWeight: 700,
                fontSize: '22px',
                color: '#0D0D0B',
                margin: '0 0 12px',
              }}>
                Your shelf is empty.
              </h3>
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '15px',
                color: '#8A8278',
                margin: '0 0 28px',
                maxWidth: '380px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}>
                Upload your manuscript and we&apos;ll turn it into a cinematic trailer.
              </p>
              <Link href="/upload">
                <PrimaryButton>Add My First Book →</PrimaryButton>
              </Link>
            </div>
          ) : (
            /* Book Cards Grid */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '20px',
            }}>
              {books.map((book) => (
                <Link key={book.id} href={`/review/${book.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #E8E2D5',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    transition: 'box-shadow 150ms ease, border-color 150ms ease',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(13,13,11,0.08)'
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = '#C8402F'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E8E2D5'
                    }}
                  >
                    {/* Cover placeholder */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '2/3',
                      background: 'linear-gradient(145deg, #C8402F 0%, #8A1C10 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.2)',
                      fontSize: '48px',
                    }}>
                      📖
                    </div>
                    {/* Card body */}
                    <div style={{ padding: '16px' }}>
                      <p style={{
                        fontFamily: 'var(--font-playfair), serif',
                        fontWeight: 700,
                        fontSize: '16px',
                        color: '#0D0D0B',
                        margin: '0 0 8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {book.title}
                      </p>
                      {book.genre && (
                        <span style={{
                          display: 'inline-block',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '100px',
                          background: '#EDE9E0',
                          color: '#8A8278',
                          marginBottom: '10px',
                        }}>
                          {book.genre}
                        </span>
                      )}
                      {book.trailerStatus && (
                        <div>
                          <StatusBadge status={book.trailerStatus} />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <Link href="/upload" style={{ textDecoration: 'none' }}>
        <div style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          background: '#C8402F',
          color: '#FAFAF7',
          borderRadius: '50px',
          padding: '14px 20px',
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          boxShadow: '0 4px 20px rgba(200,64,47,0.35)',
          cursor: 'pointer',
          zIndex: 50,
          transition: 'background 150ms ease, transform 100ms ease',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#A8321F' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#C8402F' }}
        >
          + Add Book
        </div>
      </Link>
    </div>
  )
}
