'use client'
import { ButtonHTMLAttributes } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
  variant?: 'solid' | 'ghost'
}

export function PrimaryButton({ children, fullWidth, variant = 'solid', style, ...props }: PrimaryButtonProps) {
  return (
    <button
      style={{
        width: fullWidth ? '100%' : 'auto',
        background: variant === 'solid' ? '#C8402F' : 'transparent',
        color: variant === 'solid' ? '#FAFAF7' : '#0D0D0B',
        border: variant === 'ghost' ? '1.5px solid #8A8278' : 'none',
        fontFamily: 'var(--font-inter), sans-serif',
        fontWeight: 600,
        fontSize: '15px',
        letterSpacing: '0.02em',
        padding: '14px 24px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background 150ms ease, transform 100ms ease',
        opacity: props.disabled ? 0.55 : 1,
        ...style
      }}
      onMouseEnter={e => { if (!props.disabled) (e.target as HTMLButtonElement).style.background = variant === 'solid' ? '#A8321F' : 'rgba(13,13,11,0.04)' }}
      onMouseLeave={e => { if (!props.disabled) (e.target as HTMLButtonElement).style.background = variant === 'solid' ? '#C8402F' : 'transparent' }}
      {...props}
    >
      {children}
    </button>
  )
}
