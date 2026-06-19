interface Props {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Avatar = ({ src, alt = '', size = 'md', className = '' }: Props) => (
  <div className={`kv-avatar kv-avatar-${size} ${src ? '' : 'kv-avatar-empty'} ${className}`}>
    <img
      src={src ?? '/assets/avatar-empty.svg'}
      alt={alt}
      className="kv-avatar-image"
    />
  </div>
)

export default Avatar
