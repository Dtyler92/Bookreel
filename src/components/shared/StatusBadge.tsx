type Status = 'pending' | 'processing' | 'review' | 'generating' | 'complete' | 'failed' | 'free' | 'author' | 'pro'

const statusConfig: Record<Status, { bg: string; color: string; label: string }> = {
  pending:    { bg: '#F3F3F3', color: '#8A8278', label: 'Pending' },
  processing: { bg: '#FFF3CD', color: '#B45309', label: 'Processing' },
  review:     { bg: '#DBEAFE', color: '#1D40AE', label: 'In Review' },
  generating: { bg: '#FFF3CD', color: '#B45309', label: 'Generating' },
  complete:   { bg: '#DCFCE7', color: '#166534', label: 'Complete' },
  failed:     { bg: '#FEE2E2', color: '#991B1B', label: 'Failed' },
  free:       { bg: '#EDE9E0', color: '#8A8278', label: 'Free' },
  author:     { bg: 'rgba(200,64,47,0.10)', color: '#C8402F', label: 'Author' },
  pro:        { bg: 'rgba(200,64,47,0.15)', color: '#C8402F', label: 'Pro' },
}

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] || statusConfig.pending
  return (
    <span style={{
      display: 'inline-block',
      background: config.bg,
      color: config.color,
      fontFamily: 'var(--font-inter), sans-serif',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '3px 10px',
      borderRadius: '100px',
    }}>
      {config.label}
    </span>
  )
}
