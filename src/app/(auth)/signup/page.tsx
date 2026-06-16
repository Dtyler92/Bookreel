'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction } from '../actions'
import { BrandLogo } from '@/components/shared/BrandLogo'

const inputStyle = {
  width: '100%',
  background: '#F4F1EB',
  border: '1px solid #E8E2D5',
  borderRadius: '8px',
  padding: '12px 14px',
  fontFamily: 'var(--font-inter), sans-serif',
  fontSize: '15px',
  color: '#0D0D0B',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-inter), sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#8A8278',
  marginBottom: '6px',
}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, null)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#F4F1EB',
        border: '1px solid #E8E2D5',
        borderRadius: '12px',
        padding: '48px 40px',
        boxShadow: '0 4px 24px rgba(13,13,11,0.08)',
      }}>
        {/* Brand Logo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <BrandLogo size={28} />
        </div>

        {/* Diamond Rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E8E2D5' }} />
          <span style={{ color: '#C8402F', fontSize: '10px' }}>◆</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E8E2D5' }} />
        </div>

        {/* Social proof */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '13px',
          color: '#C8402F',
          fontWeight: 600,
          letterSpacing: '0.04em',
          marginBottom: '12px',
        }}>
          ✦ Join 100+ indie authors
        </p>

        {/* Heading */}
        <h1 style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '28px',
          fontWeight: 700,
          color: '#0D0D0B',
          textAlign: 'center',
          marginBottom: '32px',
          lineHeight: 1.3,
        }}>
          Your book&apos;s trailer starts here.
        </h1>

        {/* Error */}
        {state?.error && (
          <div style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '14px',
            color: '#991B1B',
          }}>
            {state.error}
          </div>
        )}

        {/* Form */}
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="full_name" style={labelStyle}>Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              placeholder="Jane Austen"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#C8402F'; e.target.style.boxShadow = '0 0 0 3px rgba(200,64,47,0.12)' }}
              onBlur={e => { e.target.style.borderColor = '#E8E2D5'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#C8402F'; e.target.style.boxShadow = '0 0 0 3px rgba(200,64,47,0.12)' }}
              onBlur={e => { e.target.style.borderColor = '#E8E2D5'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#C8402F'; e.target.style.boxShadow = '0 0 0 3px rgba(200,64,47,0.12)' }}
              onBlur={e => { e.target.style.borderColor = '#E8E2D5'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            style={{
              width: '100%',
              background: pending ? '#E8A090' : '#C8402F',
              color: '#FAFAF7',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 24px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 600,
              fontSize: '15px',
              letterSpacing: '0.02em',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.75 : 1,
              transition: 'background 150ms ease',
              marginTop: '4px',
            }}
          >
            {pending ? 'Creating account…' : 'Create My Account →'}
          </button>
        </form>

        {/* Value reminder */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-playfair), serif',
          fontStyle: 'italic',
          fontSize: '14px',
          color: '#8A8278',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #E8E2D5',
        }}>
          Built entirely from your manuscript.
        </p>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          color: '#8A8278',
          marginTop: '16px',
        }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#C8402F', textDecoration: 'none', fontWeight: 600 }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
