'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderBottom: '1px solid var(--color-border)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 24, userSelect: 'none' }}>
            <span style={{ color: 'var(--color-text-heading)', fontFamily: 'var(--font-playfair), serif', fontWeight: 900 }}>
              Book
            </span>
            <span
              style={{
                display: 'inline-block',
                width: 11,
                height: 11,
                border: '2px solid var(--color-accent)',
                outline: '1px solid var(--color-accent)',
                outlineOffset: 2,
                backgroundColor: 'var(--color-bg-primary)',
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-playfair), serif', fontWeight: 900, fontStyle: 'italic' }}>
              Reel
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
          className="landing-nav-desktop"
        >
          <a href="#how-it-works" className="text-sm font-medium" style={{ color: 'var(--color-text-heading)', textDecoration: 'none' }}>
            How It Works
          </a>
          <Link href="/reel" className="text-sm font-medium" style={{ color: 'var(--color-text-heading)', textDecoration: 'none' }}>
            The Reel
          </Link>
          <Link href="/pricing" className="text-sm font-medium" style={{ color: 'var(--color-text-heading)', textDecoration: 'none' }}>
            Pricing
          </Link>
          <Link href="/for-authors" className="text-sm font-medium" style={{ color: 'var(--color-text-heading)', textDecoration: 'none' }}>
            For Authors
          </Link>
          <Link href="/login" className="text-sm font-medium" style={{ color: 'var(--color-text-heading)', textDecoration: 'none' }}>
            Login
          </Link>
          <Link
            href="/signup"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-inverse)',
              borderRadius: 4,
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Make My Trailer
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="landing-nav-mobile-btn"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <span
            style={{
              display: 'block',
              width: 22,
              height: 2,
              background: 'var(--color-text-heading)',
              borderRadius: 2,
              transition: 'all 200ms ease',
              transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: 22,
              height: 2,
              background: 'var(--color-text-heading)',
              borderRadius: 2,
              transition: 'all 200ms ease',
              opacity: open ? 0 : 1,
            }}
          />
          <span
            style={{
              display: 'block',
              width: 22,
              height: 2,
              background: 'var(--color-text-heading)',
              borderRadius: 2,
              transition: 'all 200ms ease',
              transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="landing-nav-mobile-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--color-bg-primary)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0 16px',
          }}
        >
          {[
            { label: 'The Reel', href: '/reel' },
          { label: 'How It Works', href: '#how-it-works' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'For Authors', href: '/for-authors' },
            { label: 'Login', href: '/login' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '12px 32px',
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--color-text-heading)',
                textDecoration: 'none',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              {label}
            </a>
          ))}
          <div style={{ padding: '8px 32px 0' }}>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                textAlign: 'center',
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-inverse)',
                borderRadius: 4,
                padding: '12px 20px',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Make My Trailer
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .landing-nav-desktop { display: flex; }
        .landing-nav-mobile-btn { display: none; }
        .landing-nav-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .landing-nav-desktop { display: none !important; }
          .landing-nav-mobile-btn { display: flex !important; }
          .landing-nav-mobile-menu { display: flex !important; }
        }
      `}</style>
    </header>
  )
}
