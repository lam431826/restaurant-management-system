import type { ReactNode } from 'react'

interface CardProps {
  children?: ReactNode
  size?: 'md' | 'lg'
  variant?: 'default' | 'kpi'
  accent?: string        /* extra CSS class e.g. "net-revenue" */
  className?: string
}

interface CardHeaderProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  prefix?: ReactNode
  className?: string
}

interface CardBodyProps {
  children?: ReactNode
  noPad?: boolean
  className?: string
  id?: string
}

interface CardFooterProps {
  children?: ReactNode
  className?: string
}

export const CardHeader = ({ title, subtitle, actions, prefix, className = '' }: CardHeaderProps) => (
  <div className={`kv-card-header ${className}`}>
    {prefix && <div className="kv-card-header-prefix">{prefix}</div>}
    <div className="kv-card-header-text">
      {title && <div className="kv-card-title">{title}</div>}
      {subtitle && <div className="kv-card-subtitle">{subtitle}</div>}
    </div>
    {actions && <div className="kv-card-header-actions">{actions}</div>}
  </div>
)

export const CardBody = ({ children, noPad = false, className = '', id }: CardBodyProps) => (
  <div
    id={id}
    className={`kv-card-body ${noPad ? 'kv-card-body-no-pad' : ''} ${className}`}
  >
    {children}
  </div>
)

export const CardFooter = ({ children, className = '' }: CardFooterProps) => (
  <div className={`kv-card-footer ${className}`}>{children}</div>
)

const Card = ({ children, size = 'md', variant = 'default', accent = '', className = '' }: CardProps) => {
  const classes = [
    'kv-card',
    size === 'lg' ? 'kv-card-lg' : '',
    variant === 'kpi' ? 'kv-card-kpi' : '',
    accent,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={classes}>{children}</div>
}

export default Card
