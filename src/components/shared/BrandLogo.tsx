export function BrandLogo({ size = 24, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-playfair), serif', fontSize: size, fontWeight: 900, textDecoration: 'none' }}>
      <span style={{ color: inverted ? '#FAFAF7' : '#0D0D0B' }}>Book</span>
      <span style={{
        display: 'inline-block',
        width: size * 0.6,
        height: size * 0.6,
        border: `2px solid ${inverted ? '#FAFAF7' : '#0D0D0B'}`,
        borderRadius: '2px',
        flexShrink: 0
      }} />
      <span style={{ color: '#C8402F', fontStyle: 'italic' }}>Reel</span>
    </span>
  )
}
