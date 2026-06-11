export default function SocialBadge({ children, href = '#', label }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.15)] flex items-center justify-center rounded-full text-[#efe7d2] shrink-0 size-9 hover:bg-[rgba(239,231,210,0.1)] transition-colors"
    >
      {children}
    </a>
  )
}
