import type { ReactNode } from 'react'

type Color = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

interface Props {
  children: ReactNode
  color?: Color
  outline?: boolean
  className?: string
}

const Badge = ({ children, color = 'neutral', outline = false, className = '' }: Props) => (
  <span
    className={[
      'kv-badge',
      `kv-badge-${color}`,
      outline ? 'kv-badge-outline' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
)

export default Badge
