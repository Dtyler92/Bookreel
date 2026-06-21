'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'bookreel_consent_v1'

export function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 999,
      background: 'rgba(13,13,11,0.96)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px',
      flexWrap: 'wrap',
    }}>
      <p style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: '13px',
        color: 'rgba(253,252,249,0.75)',
        margin: 0,
        lineHeight: 1.6,
        maxWidth: '700px',
      }}>
        BookReel uses cookies to keep you signed in and improve your experience.
        By continuing, you agree to our{' '}
        <Link href="/terms" style={{ color: '#C8402F', textDecoration: 'underline' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" style={{ color: '#C8402F', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>
      <button
        onClick={accept}
        style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '13px',
          fontWeight: 600,
          color: '#FDFCF9',
          background: '#C8402F',
          border: 'none',
          borderRadius: '6px',
          padding: '9px 20px',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#A8321F')}
        onMouseLeave={e => (e.currentTarget.style.background = '#C8402F')}
      >
        Got it
      </button>
    </div>
  )
}
