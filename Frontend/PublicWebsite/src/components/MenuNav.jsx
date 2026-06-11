const NAV_LINKS = [
  { label: 'Home',        id: 'home' },
  { label: 'Menu',        id: 'menu' },
  { label: 'Reservation', id: 'reservation' },
  { label: 'About',       id: 'about' },
  { label: 'Blog',        id: 'blog' },
  { label: 'Contact',     id: 'contact' },
]

export default function MenuNav({ isOpen, onClose }) {
  function handleLink(id) {
    onClose()
    setTimeout(() => {
      if (id === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }
    }, 350)
  }

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className={`fixed inset-0 z-40 bg-[#0a0b0a] transition-opacity duration-500 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed inset-0 z-50 transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="absolute top-10 right-10 text-[#efe7d2] flex items-center justify-center size-10 hover:opacity-60 transition-opacity"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-6">
            <path stroke="#efe7d2" strokeWidth="1.5" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* Nav links — centered in full overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 pointer-events-auto">

            {/* Top decorator ◇—◇ */}
            <Decorator />

            {NAV_LINKS.map(({ label, id }, i) => (
              <button
                key={id}
                onClick={() => handleLink(id)}
                className={`text-[#efe7d2] uppercase text-center leading-none hover:opacity-60 transition-opacity cursor-pointer ${
                  isOpen ? 'animate-fade-up' : 'opacity-0'
                }`}
                style={{
                  fontFamily: 'Forum, serif',
                  fontSize: 'clamp(36px, 4.5vw, 64px)',
                  width: 'min(667px, 80vw)',
                  animationDelay: isOpen ? `${80 + i * 60}ms` : '0ms',
                }}
              >
                {label}
              </button>
            ))}

            {/* Bottom decorator ◇—◇ */}
            <Decorator />
          </div>
        </div>
      </div>
    </>
  )
}

function Decorator() {
  return (
    <div className="flex items-center">
      <div className="flex items-center justify-center size-[11.3px]">
        <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
      </div>
      <div className="bg-[rgba(239,231,210,0.15)] h-px w-[20px]" />
      <div className="flex items-center justify-center size-[11.3px]">
        <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
      </div>
    </div>
  )
}
