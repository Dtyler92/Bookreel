'use client'

import { useActionState } from 'react'
import { oauthAction } from '@/app/(auth)/actions'

const providers = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Continue with Facebook',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M18 9a9 9 0 1 0-10.406 8.89v-6.288H5.311V9h2.283V7.017c0-2.254 1.343-3.5 3.398-3.5.984 0 2.014.176 2.014.176v2.213h-1.135c-1.118 0-1.466.694-1.466 1.406V9h2.496l-.399 2.602H10.405V17.89A9.003 9.003 0 0 0 18 9Z" fill="#1877F2"/>
        <path d="m12.502 11.602.399-2.602h-2.496V7.312c0-.712.348-1.406 1.466-1.406h1.135V3.693s-1.03-.176-2.014-.176c-2.055 0-3.398 1.246-3.398 3.5V9H5.311v2.602h2.283v6.288a9.07 9.07 0 0 0 2.811 0v-6.288h2.097Z" fill="white"/>
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M14.93 9.555c-.02-2.021 1.648-2.994 1.724-3.042-0.94-1.372-2.4-1.56-2.922-1.58-1.243-.126-2.432.733-3.062.733-.63 0-1.603-.716-2.635-.697-1.355.02-2.607.793-3.304 2.008-1.41 2.448-.362 6.082 1.014 8.07.672.972 1.473 2.063 2.523 2.024 1.013-.04 1.395-.655 2.62-.655 1.224 0 1.573.655 2.643.634 1.087-.019 1.778-.99 2.445-1.964.768-1.126 1.086-2.214 1.104-2.27-.024-.01-2.12-.815-2.15-3.24Zm-2.02-5.953c.558-.676.934-1.614.832-2.549-.805.033-1.78.537-2.357 1.213-.518.6-.97 1.558-.849 2.476.897.069 1.816-.456 2.374-1.14Z" fill="currentColor"/>
      </svg>
    ),
  },
] as const

function OAuthButton({ provider }: { provider: typeof providers[number] }) {
  const [, formAction, pending] = useActionState(oauthAction, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="provider" value={provider.id} />
      <button
        type="submit"
        disabled={pending}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: '#FFFFFF',
          border: '1px solid #E8E2D5',
          borderRadius: '8px',
          padding: '11px 16px',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: '#2B2B2B',
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.7 : 1,
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          boxSizing: 'border-box' as const,
        }}
        onMouseEnter={e => {
          if (!pending) {
            ;(e.target as HTMLButtonElement).style.borderColor = '#C8402F'
            ;(e.target as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(200,64,47,0.10)'
          }
        }}
        onMouseLeave={e => {
          ;(e.target as HTMLButtonElement).style.borderColor = '#E8E2D5'
          ;(e.target as HTMLButtonElement).style.boxShadow = 'none'
        }}
      >
        {provider.icon}
        {pending ? 'Redirecting…' : provider.label}
      </button>
    </form>
  )
}

export function OAuthButtons() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {providers.map(p => <OAuthButton key={p.id} provider={p} />)}
    </div>
  )
}

export function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E8E2D5' }} />
      <span style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: '12px',
        color: '#8A8278',
        whiteSpace: 'nowrap',
        fontWeight: 500,
      }}>or continue with email</span>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E8E2D5' }} />
    </div>
  )
}
