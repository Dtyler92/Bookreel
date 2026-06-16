export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      color: '#0D0D0B',
      textAlign: 'center',
      padding: '24px'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📖</div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '12px' }}>
        You&apos;re offline
      </h1>
      <p style={{ color: '#8A8278', maxWidth: '360px', lineHeight: 1.6 }}>
        It looks like you&apos;ve lost your connection. Check your internet and try again — your story will be waiting.
      </p>
    </div>
  )
}
