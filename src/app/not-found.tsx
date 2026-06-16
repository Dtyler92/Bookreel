import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      textAlign: 'center',
    }}>
      {/* Large 404 */}
      <div style={{
        fontFamily: 'var(--font-playfair), serif',
        fontSize: '160px',
        fontWeight: 900,
        color: '#EDE9E0',
        lineHeight: 1,
        marginBottom: '8px',
        userSelect: 'none',
      }}>
        404
      </div>

      {/* Heading */}
      <h1 style={{
        fontFamily: 'var(--font-playfair), serif',
        fontSize: '28px',
        fontWeight: 700,
        color: '#0D0D0B',
        marginBottom: '16px',
        lineHeight: 1.3,
        maxWidth: '480px',
      }}>
        This page seems to have closed its covers.
      </h1>

      {/* Body */}
      <p style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: '16px',
        color: '#8A8278',
        maxWidth: '400px',
        lineHeight: 1.6,
        marginBottom: '40px',
      }}>
        The chapter you&apos;re looking for has wandered off. Let&apos;s get you back to the story.
      </p>

      {/* CTA Button */}
      <Link href="/" style={{
        display: 'inline-block',
        background: '#C8402F',
        color: '#FAFAF7',
        fontFamily: 'var(--font-inter), sans-serif',
        fontWeight: 600,
        fontSize: '15px',
        letterSpacing: '0.02em',
        padding: '14px 28px',
        borderRadius: '8px',
        textDecoration: 'none',
        marginBottom: '20px',
        transition: 'background 150ms ease',
      }}>
        Return to the Shelf →
      </Link>

      {/* Muted browse link */}
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px' }}>
        <Link href="/browse" style={{
          color: '#8A8278',
          textDecoration: 'none',
        }}>
          or Browse reader trailers →
        </Link>
      </p>
    </div>
  )
}
