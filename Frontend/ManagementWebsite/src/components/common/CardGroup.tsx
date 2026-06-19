import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  size?: 'md' | 'lg'
  className?: string
}

const CardGroup = ({ children, size = 'md', className = '' }: Props) => (
  <div
    role="group"
    className={[
      'kv-card-group',
      'kv-card-group-horizontal',
      size === 'lg' ? 'kv-card-group-lg' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </div>
)

export default CardGroup
