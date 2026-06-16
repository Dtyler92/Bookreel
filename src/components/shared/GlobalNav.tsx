'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BrandLogo } from './BrandLogo'
import { StatusBadge } from './StatusBadge'

interface GlobalNavProps {
  userName?: string
  userTier?: 'free' | 'author' | 'pro'
}

export function GlobalNav({ userName, userTier = 'free' }: GlobalNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/browse', label: 'Browse' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '64px',
      background: '#FAFAF7', borderBottom: '1px solid #E8E2D5',
      boxShadow: '0 1px 8px rgba(13,13,11,0.04)',
      zIndex: 100, display: 'flex', alignItems: 'center',
      padding: '0 32px', justifyContent: 'space-between'
    }}>
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <BrandLogo size={22} />
      </Link>

      {/* Desktop Links */}
      <div style={{ display: 'flex', gap: '32px' }} className="nav-links-desktop">
        {links.map(link => (
          <Link key={link.href} href={link.href} style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '15px',
            fontWeight: pathname === link.href ? 600 : 500,
            color: pathname === link.href ? '#0D0D0B' : '#8A8278',
            textDecoration: pathname === link.href ? 'underline' : 'none',
            textDecorationColor: '#C8402F',
            textUnderlineOffset: '4px',
          }}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <StatusBadge status={userTier} />
        {userName && (
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #EDE9E0, #C8402F)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '13px', fontWeight: 700, color: '#FAFAF7',
            cursor: 'pointer', border: '2px solid transparent',
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        <Link href="/api/auth/signout" style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '13px', color: '#8A8278', textDecoration: 'none'
        }}>
          Sign Out
        </Link>
      </div>
    </nav>
  )
}
