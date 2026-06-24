// BookReel custom icon system — Penny design spec June 2026
// All icons: 1.5px stroke, square terminations, 24×24px grid, currentColor
// Coin icon only: always filled red (#C8402F)

interface IconProps {
  size?: number
  className?: string
  color?: string
}

// ── Hexagonal Coin / Credit Icon ──────────────────────────────────────────────
// Always filled red. The only filled icon in the system.
export function CoinIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Hex coin — flat-top orientation */}
      <polygon
        points="12,2 19.5,6.5 19.5,15.5 12,20 4.5,15.5 4.5,6.5"
        fill="#C8402F"
        stroke="none"
      />
      {/* Inner deboss ring */}
      <polygon
        points="12,4.5 17.5,7.75 17.5,14.25 12,17.5 6.5,14.25 6.5,7.75"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
      />
      {/* B monogram */}
      <text
        x="12" y="13.5"
        textAnchor="middle"
        fontSize="7"
        fontFamily="serif"
        fontWeight="700"
        fill="rgba(255,255,255,0.75)"
      >B</text>
    </svg>
  )
}

// Small coin — simplified, no inner ring or monogram
export function CoinIconSm({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon
        points="12,2 19.5,6.5 19.5,15.5 12,20 4.5,15.5 4.5,6.5"
        fill="#C8402F"
      />
    </svg>
  )
}

// ── Quill / Profile Icon (unauthenticated state) ──────────────────────────────
export function QuillIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Nib body — diamond shape */}
      <path
        d="M12 5 L16 11 L12 19 L8 11 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Split line at nib tip */}
      <line x1="12" y1="16" x2="12" y2="19" stroke={color} strokeWidth="1" />
      {/* Quill shaft */}
      <line x1="12" y1="5" x2="7" y2="2" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      {/* Ink drop — always red */}
      <circle cx="12" cy="21" r="1.5" fill="#C8402F" />
    </svg>
  )
}

// ── Upload / Manuscript Lift Icon ─────────────────────────────────────────────
export function UploadIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Platform / stage */}
      <line x1="2" y1="21" x2="22" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      <line x1="2" y1="21" x2="2" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      <line x1="22" y1="21" x2="22" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      {/* Paper sheet */}
      <path
        d="M7 14 L7 4 L15 4 L17 6 L17 14 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="miter"
        fill="none"
      />
      {/* Dog-ear fold */}
      <path d="M15 4 L15 6 L17 6" stroke={color} strokeWidth="1" fill="none" />
      {/* Upward arrow */}
      <line x1="12" y1="17" x2="12" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      <polyline points="9,12 12,9 15,12" stroke={color} strokeWidth="1.5" strokeLinejoin="miter" fill="none" />
    </svg>
  )
}

// ── Audiobook — Open Book with Sound Wave ─────────────────────────────────────
export function AudiobookIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Left page */}
      <rect x="2" y="5" width="9" height="14" rx="0" stroke={color} strokeWidth="1.5" />
      <line x1="4" y1="9" x2="9" y2="9" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="4" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="4" y1="15" x2="9" y2="15" stroke={color} strokeWidth="1" opacity="0.4" />
      {/* Spine */}
      <line x1="11" y1="5" x2="13" y2="5" stroke={color} strokeWidth="2" />
      <line x1="11" y1="19" x2="13" y2="19" stroke={color} strokeWidth="2" />
      <line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="1.5" />
      {/* Right page */}
      <rect x="13" y="5" width="9" height="14" rx="0" stroke={color} strokeWidth="1.5" />
      <line x1="15" y1="9" x2="20" y2="9" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="15" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="15" y1="15" x2="20" y2="15" stroke={color} strokeWidth="1" opacity="0.4" />
      {/* Sound wave arcs from spine top — right side only */}
      <path d="M13 3 Q15.5 1 15.5 3" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M13 3 Q17.5 0 17.5 3" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

// ── Trailer / Film Frame Icon ─────────────────────────────────────────────────
export function TrailerIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Film frame */}
      <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      {/* Top perforations */}
      <rect x="4.5" y="2" width="3" height="4" rx="0.5" stroke={color} strokeWidth="1" />
      <rect x="10.5" y="2" width="3" height="4" rx="0.5" stroke={color} strokeWidth="1" />
      <rect x="16.5" y="2" width="3" height="4" rx="0.5" stroke={color} strokeWidth="1" />
      {/* Bottom perforations */}
      <rect x="4.5" y="18" width="3" height="4" rx="0.5" stroke={color} strokeWidth="1" />
      <rect x="10.5" y="18" width="3" height="4" rx="0.5" stroke={color} strokeWidth="1" />
      <rect x="16.5" y="18" width="3" height="4" rx="0.5" stroke={color} strokeWidth="1" />
      {/* Play triangle */}
      <polygon points="10,9 10,15 16,12" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Settings / Letterpress Compositing Rule Icon ──────────────────────────────
export function SettingsIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Three rules */}
      <line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      <line x1="4" y1="17" x2="20" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      {/* Knob on top rule at 30% */}
      <circle cx="9" cy="7" r="2.5" stroke={color} strokeWidth="1.5" fill="#FDFCF9" />
      {/* Knob on middle rule at 65% */}
      <circle cx="15" cy="12" r="2.5" stroke={color} strokeWidth="1.5" fill="#FDFCF9" />
      {/* Knob on bottom rule at 45% */}
      <circle cx="12" cy="17" r="2.5" stroke={color} strokeWidth="1.5" fill="#FDFCF9" />
    </svg>
  )
}

// ── Headphones / Listen Icon ─────────────────────────────────────────────────────
export function HeadphonesIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Headband arc */}
      <path d="M4 13V9a8 8 0 0 1 16 0v4" stroke={color} strokeWidth="1.5" strokeLinecap="square" fill="none" />
      {/* Left cup */}
      <rect x="2" y="13" width="4" height="6" rx="1" stroke={color} strokeWidth="1.5" />
      {/* Right cup */}
      <rect x="18" y="13" width="4" height="6" rx="1" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

// ── Microphone / Record Icon ────────────────────────────────────────────────
export function MicIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Capsule body */}
      <rect x="9" y="2" width="6" height="12" rx="3" stroke={color} strokeWidth="1.5" />
      {/* Stand arc */}
      <path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="1.5" strokeLinecap="square" fill="none" />
      {/* Stand stem */}
      <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      {/* Base */}
      <line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}

// ── Download Arrow ──────────────────────────────────────────────────────────────
export function DownloadArrowIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Vertical shaft */}
      <line x1="12" y1="3" x2="12" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      {/* Arrow head */}
      <polyline points="7,11 12,16 17,11" stroke={color} strokeWidth="1.5" strokeLinejoin="miter" fill="none" />
      {/* Tray */}
      <path d="M4 19 L4 21 L20 21 L20 19" stroke={color} strokeWidth="1.5" strokeLinecap="square" fill="none" />
    </svg>
  )
}

// ── Globe / Language Icon ───────────────────────────────────────────────────────
export function GlobeIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      {/* Meridian — vertical ellipse */}
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={color} strokeWidth="1.5" />
      {/* Parallels */}
      <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="3" y1="15" x2="21" y2="15" stroke={color} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

// ── Bolt / Flash Icon ────────────────────────────────────────────────────────────
export function BoltIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline
        points="13,2 6,13 12,13 11,22 18,11 12,11 13,2"
        stroke={color} strokeWidth="1.5" strokeLinejoin="miter" fill="none"
      />
    </svg>
  )
}

// ── Film Clapperboard / Trailer Large Icon ───────────────────────────────
export function ClapperIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Board body */}
      <rect x="2" y="7" width="20" height="14" rx="1" stroke={color} strokeWidth="1.5" />
      {/* Top clapper strip */}
      <rect x="2" y="3" width="20" height="5" rx="1" stroke={color} strokeWidth="1.5" />
      {/* Diagonal clapper marks */}
      <line x1="7" y1="3" x2="5" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      <line x1="12" y1="3" x2="10" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      <line x1="17" y1="3" x2="15" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
      {/* Play triangle */}
      <polygon points="10,12 10,18 16,15" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Book Cover / Open Book Placeholder ──────────────────────────────────
export function BookIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Cover */}
      <rect x="4" y="2" width="13" height="20" rx="1" stroke={color} strokeWidth="1.5" />
      {/* Spine */}
      <line x1="4" y1="2" x2="4" y2="22" stroke={color} strokeWidth="3" strokeLinecap="square" />
      {/* Page lines */}
      <line x1="8" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1" opacity="0.45" />
      <line x1="8" y1="11" x2="14" y2="11" stroke={color} strokeWidth="1" opacity="0.45" />
      <line x1="8" y1="14" x2="12" y2="14" stroke={color} strokeWidth="1" opacity="0.45" />
    </svg>
  )
}

// ── Image / Cover Placeholder Icon ───────────────────────────────────────
export function ImageIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="3" width="20" height="18" rx="1" stroke={color} strokeWidth="1.5" />
      {/* Sun / circle */}
      <circle cx="8.5" cy="8.5" r="2" stroke={color} strokeWidth="1.5" />
      {/* Mountain landscape */}
      <polyline points="2,17 8,11 13,16 16,13 22,17" stroke={color} strokeWidth="1.5" strokeLinejoin="miter" fill="none" />
    </svg>
  )
}

// ── Sparkle / Auto-fill Icon ─────────────────────────────────────────────────
export function SparkleIcon({ size = 24, className, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Main 4-point star */}
      <path
        d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"
      />
      {/* Small accent star top-right */}
      <path d="M19 3 L19.6 5.4 L22 6 L19.6 6.6 L19 9 L18.4 6.6 L16 6 L18.4 5.4 Z"
        stroke={color} strokeWidth="1" strokeLinejoin="round" fill="none" opacity="0.6"
      />
    </svg>
  )
}
