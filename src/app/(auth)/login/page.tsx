'use client'

import { useActionState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginAction } from '../actions'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { OAuthButtons, Divider } from '@/components/auth/OAuthButtons'

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

/** Reads ?error param — must be inside a Suspense boundary */
function ConfirmationErrorBanner() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  if (errorParam !== 'confirmation_failed') return null

  return (
    <div style={{
      background: '#FEF3C7',
      border: '1px solid #FDE68A',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '20px',
      fontFamily: 'var(--font-inter), sans-serif',
      fontSize: '14px',
      color: '#92400E',
    }}>
      Your confirmation link has expired. Please{' '}
      <Link href="/signup" style={{ color: '#92400E', fontWeight: 600 }}>
        sign up again
      </Link>
      .
    </div>
  )
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)

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

        {/* Heading */}
        <h1 style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '28px',
          fontWeight: 700,
          color: '#0D0D0B',
          textAlign: 'center',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}>
          Welcome back, author.
        </h1>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '15px',
          color: '#8A8278',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          Your stories are waiting.
        </p>

        {/* Confirmation failed error (wrapped in Suspense for useSearchParams) */}
        <Suspense fallback={null}>
          <ConfirmationErrorBanner />
        </Suspense>

        {/* Form error */}
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

        {/* Social OAuth buttons */}
        <OAuthButtons />

        {/* Divider */}
        <Divider />

        {/* Email + Password Form */}
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '12px',
                color: '#8A8278',
                textDecoration: 'none',
              }}>
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
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
            {pending ? 'Signing in…' : 'Sign In with Email'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          color: '#8A8278',
          marginTop: '28px',
        }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#C8402F', textDecoration: 'none', fontWeight: 600 }}>
            Start here →
          </Link>
        </p>
      </div>
    </div>
  )
}
