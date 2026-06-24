'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { BrandLogo } from './BrandLogo'
import { CoinIconSm, QuillIcon } from '@/components/icons'

interface GlobalNavProps {
  userName?: string
  userTier?: 'free' | 'hobbyist' | 'author' | 'publisher' | 'pro'
  credits?: number
  authorPhotoUrl?: string
}

export function GlobalNav({ userName, userTier = 'free', credits, authorPhotoUrl }: GlobalNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll-based header opacity
  useEffect(() => {
    const onScroll = () => {
      requestAnimationFrame(() => setScrolled(window.scrollY > 20))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll lock when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const links = [
    { href: '/browse',    label: 'Browse' },
    { href: '/pricing',   label: 'Pricing' },
    { href: '/dashboard', label: 'Dashboard', authOnly: true },
  ]

  const initial = userName
    ? userName.charAt(0).toUpperCase()
    : null

  // Colors
  const ink    = '#0D0D0B'
  const muted  = '#8A8278'
  const border = '#E8E2D5'
  const red    = '#C8402F'
  const paper  = '#FDFCF9'

  const navBg = scrolled
    ? 'rgba(253,252,249,0.92)'
    : 'rgba(253,252,249,0.0)'
  const navBorder = scrolled
    ? `1px solid rgba(232,226,213,0.7)`
    : '1px solid transparent'

  return (
    <>
      <style>{`
        .br-nav-link { transition: color 180ms ease; position: relative; }
        .br-nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 0;
          width: 0; height: 2px;
          background: #C8402F;
          transition: width 200ms ease;
        }
        .br-nav-link:hover::after,
        .br-nav-link.active::after { width: 100%; }
        .br-credit-chip { transition: all 180ms ease; }
        .br-credit-chip:hover {
          background: #E5DDD2 !important;
          border-color: rgba(200,64,47,0.4) !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(200,64,47,0.12);
        }
        .br-seal { transition: border-color 200ms ease; cursor: pointer; }
        .br-seal:hover { border-color: #C8402F !important; }
        .br-dropdown-item { transition: background 120ms ease; }
        .br-dropdown-item:hover { background: #F5F0E8 !important; }
        .br-hamburger { cursor: pointer; background: none; border: none; padding: 10px; display: flex; flex-direction: column; gap: 5px; }
        .br-hamburger span { display: block; width: 22px; height: 1.5px; background: #0D0D0B; transition: all 300ms ease; }
        .br-hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(4.5px, 4.5px); }
        .br-hamburger.open span:nth-child(2) { opacity: 0; }
        .br-hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(4.5px, -4.5px); }
        .br-drawer-backdrop { position: fixed; inset: 0; background: rgba(13,13,11,0.4); z-index: 98; }
        .br-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: 280px; background: #FDFCF9;
          border-left: 1px solid #E8E2D5;
          z-index: 99; padding: 24px;
          transform: translateX(100%);
          transition: transform 300ms ease;
        }
        .br-drawer.open { transform: translateX(0); }
        @media (min-width: 768px) {
          .br-nav-desktop { display: flex !important; }
          .br-hamburger { display: none !important; }
          .br-mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .br-nav-desktop { display: none !important; }
        }
      `}</style>

      {/* Main Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '64px',
        background: navBg,
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        borderBottom: navBorder,
        zIndex: 100,
        transition: 'background 300ms ease, border-color 300ms ease',
        display: 'flex', alignItems: 'center',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{
          maxWidth: '1400px', width: '100%',
          margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* Zone 1 — Logo */}
          <Link href="/" style={{ textDecoration: 'none', opacity: 1, transition: 'opacity 180ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <BrandLogo size={22} />
          </Link>

          {/* Zone 2 — Nav links (desktop) */}
          <div className="br-nav-desktop" style={{ display: 'none', gap: '32px', alignItems: 'center' }}>
            {links.map(link => {
              if (link.authOnly && !userName) return null
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`br-nav-link${isActive ? ' active' : ''}`}
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.01em',
                    color: isActive ? ink : muted,
                    textDecoration: 'none',
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Zone 3 — Right cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* Credit chip — desktop */}
            {typeof credits === 'number' && (
              <Link href="/pricing#packs" style={{ textDecoration: 'none' }}>
                <div
                  className="br-credit-chip"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#EDE9E0',
                    border: `1px solid ${credits === 0 ? 'rgba(200,64,47,0.35)' : '#D9D2C5'}`,
                    borderRadius: '100px',
                    height: '44px', padding: '0 14px 0 10px',
                    cursor: 'pointer',
                  }}
                >
                  <CoinIconSm size={16} />
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '14px', fontWeight: 600,
                    color: credits === 0 ? red : ink,
                  }}>
                    {credits.toLocaleString()}
                  </span>
                </div>
              </Link>
            )}

            {/* Embossed Initial Seal / Author Photo */}
            {userName ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div
                  className="br-seal"
                  onClick={() => setDropdownOpen(o => !o)}
                  style={{
                    width: '44px', height: '44px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `1.5px solid ${dropdownOpen ? '#C8402F' : '#3A3835'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    background: authorPhotoUrl ? 'transparent' : `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.07) 0%, transparent 60%), ${ink}`,
                    transition: 'border-color 200ms ease',
                  }}
                >
                  {authorPhotoUrl ? (
                    <Image
                      src={authorPhotoUrl}
                      alt={userName}
                      width={44}
                      height={44}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <span style={{
                      fontFamily: 'var(--font-playfair), serif',
                      fontSize: '16px', fontWeight: 700,
                      color: paper,
                      letterSpacing: '0.02em',
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                      userSelect: 'none',
                      lineHeight: 1,
                    }}>
                      {initial}
                    </span>
                  )}
                </div>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    minWidth: '200px',
                    background: paper,
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    boxShadow: '0 4px 24px rgba(13,13,11,0.12)',
                    overflow: 'hidden',
                    zIndex: 200,
                  }}>
                    {/* User info header */}
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid #EDE9E0` }}>
                      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', fontWeight: 600, color: ink, margin: 0 }}>{userName}</p>
                    </div>
                    {[
                      { href: '/dashboard', label: 'My Books' },
                      { href: '/account',   label: '⚙️  Account Settings' },
                      { href: '/pricing#packs', label: '🪙  Buy Credits' },
                    ].map(item => (
                      <Link key={item.label} href={item.href}
                        onClick={() => setDropdownOpen(false)}
                        className="br-dropdown-item"
                        style={{
                          display: 'block',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '14px', color: '#2B2B2B',
                          padding: '10px 16px',
                          textDecoration: 'none',
                        }}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ height: '1px', background: '#EDE9E0' }} />
                    <Link href="/api/auth/signout"
                      className="br-dropdown-item"
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '14px', color: muted,
                        padding: '10px 16px',
                        textDecoration: 'none',
                      }}
                    >
                      Sign Out
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Unauthenticated — quill icon */
              <Link href="/login" style={{ display: 'flex', alignItems: 'center', color: muted, padding: '10px' }}>
                <QuillIcon size={24} color={muted} />
              </Link>
            )}

            {/* Hamburger (mobile) */}
            <button
              className={`br-hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      {menuOpen && (
        <div className="br-drawer-backdrop" onClick={() => setMenuOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`br-drawer${menuOpen ? ' open' : ''}`}>
        <div style={{ marginBottom: '32px' }}>
          <BrandLogo size={20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {links.map(link => {
            if (link.authOnly && !userName) return null
            return (
              <Link key={link.href} href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontSize: '18px', fontWeight: 700,
                  color: ink, textDecoration: 'none',
                  padding: '13px 0',
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
        <div style={{ height: '1px', background: border, margin: '20px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {typeof credits === 'number' && (
            <Link href="/pricing#packs" onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px', color: muted,
                textDecoration: 'none', padding: '13px 0',
              }}
            >
              {credits.toLocaleString()} credits
            </Link>
          )}
          {userName && (
            <Link href="/api/auth/signout"
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px', color: muted,
                textDecoration: 'none', padding: '13px 0',
              }}
            >
              Sign Out
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
