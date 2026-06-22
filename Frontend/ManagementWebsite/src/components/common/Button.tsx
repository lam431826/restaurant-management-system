import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'outline-primary' | 'text-primary' | 'neutral'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  iconOnly?: boolean
  children?: ReactNode
}

const Button = ({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  className = '',
  children,
  ...rest
}: Props) => {
  const classes = [
    'kv-btn',
    `kv-btn-${variant}`,
    size !== 'md' ? `kv-btn-${size}` : '',
    iconOnly ? 'kv-btn-icon-only' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}

export default Button
