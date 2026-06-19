interface Props {
  vertical?: boolean
  className?: string
}

const Divider = ({ vertical = false, className = '' }: Props) => (
  <div
    role="separator"
    className={`kv-divider${vertical ? ' kv-divider-vertical' : ''} ${className}`}
  />
)

export default Divider
