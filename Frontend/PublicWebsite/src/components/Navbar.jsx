export default function Navbar({ className, onMenuOpen }) {
  return (
    <nav
      className={
        className ||
        'bg-[#0a0b0a] flex gap-3 items-center justify-center overflow-hidden p-2 rounded-xl'
      }
    >
      {/* Hamburger */}
      <button
        aria-label="Toggle menu"
        onClick={onMenuOpen}
        className="bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.15)] flex flex-col gap-[5px] items-center justify-center rounded-lg shrink-0 size-[41px] cursor-pointer hover:bg-[rgba(40,40,40,0.5)] transition-colors"
      >
        <span className="bg-[#efe7d2] h-px w-5 block" />
        <span className="bg-[#efe7d2] h-px w-5 block" />
        <span className="bg-[#efe7d2] h-px w-5 block" />
      </button>

      {/* Brand — click to scroll home */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="text-[#efe7d2] text-[32px] uppercase tracking-[1px] leading-none shrink-0 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ fontFamily: 'Forum, serif' }}
      >
        Wasabi
      </button>

      {/* Menu links */}
      <div className="flex gap-1 items-center">
        {[
          { label: 'Menu',    href: '#menu' },
          { label: 'About',   href: '#about' },
          { label: 'Blog',    href: '#blog' },
          { label: 'Contact', href: '#contact' },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="flex items-center justify-center px-3 py-3 rounded-lg shrink-0 text-[#efe7d2] text-xs tracking-[1px] uppercase"
            style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
          >
            {label}
          </a>
        ))}
        <a
          href="#reservation"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.15)] flex items-center justify-center px-3 py-3 rounded-lg shrink-0 text-[#efe7d2] text-xs tracking-[1px] uppercase cursor-pointer"
          style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
        >
          Đặt Bàn Ngay
        </a>
      </div>
    </nav>
  )
}
