const bgImage = '/images/bg-food.jpg'
const logoImage = '/images/logo.png'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left — hero image panel */}
      <div className="relative flex-1 overflow-hidden">
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div className="absolute bottom-0 left-0 right-0 h-[52%] bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute" style={{ left: 138, top: 102 }}>
          <p
            className="font-bitter-rose text-[#face8d]"
            style={{ fontSize: 160, lineHeight: 0.9 }}
          >
            The pure taste of
          </p>
          <p
            className="font-forum text-white uppercase"
            style={{ fontSize: 140, lineHeight: 1, letterSpacing: '3px' }}
          >
            Japan
          </p>
        </div>
      </div>

      {/* Right — form panel (520 × 1024 per design) */}
      <div className="bg-white flex flex-col items-center px-[62px] py-8 w-[520px] shrink-0 h-screen overflow-y-auto">
        <img
          src={logoImage}
          alt="Aleo Cafe & Resto"
          className="h-10 w-auto shrink-0"
        />

        {/* spacer: logo bottom (72px) → title top (222px) = 150px */}
        <div className="mt-[150px] flex flex-col gap-[10px] items-center text-center shrink-0 w-full">
          <h2 className="text-[28px] font-bold text-[#025cca] tracking-[-0.28px] leading-[1.5]">
            {title}
          </h2>
          <p className="text-[14px] text-[#636566] leading-[1.5]">{subtitle}</p>
        </div>

        {/* spacer: title bottom (~315px) → form top (465px) = 150px */}
        <div className="mt-[150px] flex flex-col gap-[10px] w-[396px] shrink-0">
          {children}
        </div>
      </div>
    </div>
  )
}
