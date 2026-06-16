'use client'

export default function OfflinePage() {
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
      {/* Icon */}
      <div style={{
        fontSize: '64px',
        marginBottom: '24px',
        lineHeight: 1,
      }}>
        📡
      </div>

      {/* Heading */}
      <h1 style={{
        fontFamily: 'var(--font-playfair), serif',
        fontSize: '32px',
        fontWeight: 700,
        color: '#0D0D0B',
        marginBottom: '16px',
        lineHeight: 1.3,
      }}>
        You&apos;ve gone off the page.
      </h1>

      {/* Body */}
      <p style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: '16px',
        color: '#8A8278',
        maxWidth: '380px',
        lineHeight: 1.6,
        marginBottom: '36px',
      }}>
        Check your connection and try again — your story will be waiting.
      </p>

      {/* Try Again button */}
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#C8402F',
          color: '#FAFAF7',
          border: 'none',
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 600,
          fontSize: '15px',
          letterSpacing: '0.02em',
          padding: '14px 28px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#A8321F' }}
        onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#C8402F' }}
      >
        Try Again
      </button>
    </div>
  )
}
