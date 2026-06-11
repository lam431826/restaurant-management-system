import { useInView } from '../hooks/useInView'
import InstagramIcon from '../assets/icons/InstagramIcon'
import FacebookIcon from '../assets/icons/FacebookIcon'
import TwitterIcon from '../assets/icons/TwitterIcon'
import IMG_LEFT from '../assets/images/contact-left.jpg'
import IMG_GRID_TR from '../assets/images/contact-grid-tr.jpg'
import IMG_GRID_BL from '../assets/images/contact-grid-bl.jpg'
import IMG_GRID_BR from '../assets/images/contact-grid-br.jpg'
import IMG_MAP from '../assets/images/contact-map.png'

const HOURS = [
  { day: 'Thứ hai',             time: '16:00 - 22:30' },
  { day: 'Thứ ba',              time: '16:00 - 22:30' },
  { day: 'Thứ tư',              time: '16:00 - 22:30' },
  { day: 'Thứ năm',             time: '16:00 - 22:30' },
  { day: 'Thứ sáu',             time: '16:00 - 22:30' },
  { day: 'Thứ bảy & Chủ nhật', time: '16:00 - 22:30' },
]

export default function ContactSection() {
  const [row1Ref, row1In] = useInView()
  const [row2Ref, row2In] = useInView()
  return (
    <section id="contact" className="bg-[#0a0b0a] p-6">
      <div className="flex gap-4 items-start">

        {/* Left — sticky image */}
        <div className="flex-1 sticky top-6 self-start h-[calc(100vh-3rem)] overflow-hidden rounded-2xl relative bg-black min-w-0">
          <img
            src={IMG_LEFT}
            alt="Contact"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-black opacity-60 pointer-events-none" />
          <p
            className="absolute bottom-[140px] left-[67px] text-[#efe7d2] uppercase tracking-[2px] leading-[0.63]"
            style={{ fontFamily: 'Forum, serif', fontSize: 'clamp(52px, 7vw, 112px)' }}
          >
            Contact
          </p>
        </div>

        {/* Right — content grid */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Row 1: Opening Hours + Photo grid */}
          <div ref={row1Ref} className={`flex gap-4 min-h-[400px] ${row1In ? 'animate-fade-up' : 'opacity-0'}`}>

            {/* Opening Hours card */}
            <div className="flex-1 border border-[rgba(239,231,210,0.15)] rounded-2xl flex flex-col justify-between px-12 py-14 min-w-0">
              <CardHeading>Opening Hours</CardHeading>
              <div className="flex flex-col gap-4">
                {HOURS.map(({ day, time }) => (
                  <div key={day} className="flex gap-4 items-end">
                    <span
                      className="text-[#efe7d2] text-base shrink-0"
                      style={{ fontFamily: "'MJ Satoshi', sans-serif", fontWeight: 300, lineHeight: 1.8 }}
                    >
                      {day}
                    </span>
                    <div className="flex-1 pb-[5px] min-w-0">
                      <div className="border-b border-dashed border-[rgba(239,231,210,0.15)] w-full" />
                    </div>
                    <span
                      className="text-[#efe7d2] text-base shrink-0"
                      style={{ fontFamily: "'MJ Satoshi', sans-serif", fontWeight: 300, lineHeight: 1.8 }}
                    >
                      {time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2×2 Photo grid */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className="flex gap-4 flex-1 min-h-0">
                {/* Instagram photo */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-black rounded-2xl overflow-hidden relative min-w-0 group"
                >
                  <img
                    src={IMG_LEFT}
                    alt="Instagram"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[#efe7d2] group-hover:opacity-60 transition-opacity">
                    <InstagramIcon className="w-[30px] h-[30px]" />
                  </div>
                </a>
                <div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-w-0">
                  <img
                    src={IMG_GRID_TR}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 flex-1 min-h-0">
                <div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-w-0">
                  <img
                    src={IMG_GRID_BL}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                </div>
                <div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-w-0">
                  <img
                    src={IMG_GRID_BR}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Map + Contact info */}
          <div ref={row2Ref} className={`flex gap-4 min-h-[350px] ${row2In ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '100ms' }}>

            {/* Map */}
            <div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-w-0">
              <img
                src={IMG_MAP}
                alt="Map"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              {/* "Chỉ đường" button — bottom-right */}
              <a
                href="https://maps.google.com/?q=151+Phung+Hung+Cua+Dong+Hoan+Kiem+Ha+Noi"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-0 right-0 bg-[#0a0b0a] flex items-center gap-3 pl-6 py-3 pr-3 rounded-tl-[24px] hover:opacity-80 transition-opacity"
                style={{ isolation: 'isolate' }}
              >
                {/* Rounded corner decorations */}
                <MapCorner side="left" />
                <MapCorner side="top" />
                <span
                  className="text-[#efe7d2] uppercase tracking-[1px] shrink-0"
                  style={{ fontFamily: 'Forum, serif', fontSize: 16, lineHeight: 1 }}
                >
                  Chỉ đường
                </span>
                <div className="bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.15)] flex items-center justify-center rounded-full size-8 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path stroke="#efe7d2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </a>
            </div>

            {/* Contact info card */}
            <div className="flex-1 border border-[rgba(239,231,210,0.15)] rounded-2xl flex flex-col justify-between px-12 py-14 min-w-0">
              <CardHeading>Liên lạc ngay</CardHeading>
              <div className="flex flex-col gap-6">
                <ContactRow label="Địa chỉ" value="151 Phùng Hưng, Cửa Đông, Hoàn Kiếm, Hà Nội" />
                <ContactRow label="SĐT" value="+86 0975 919999" />
                <ContactRow label="Email" value="wasabisushi@gmail.com" />
                <div className="flex gap-6 items-center">
                  <span
                    className="text-[rgba(245,242,234,0.5)] text-sm tracking-[1px] uppercase w-[80px] shrink-0"
                    style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.6 }}
                  >
                    Follow
                  </span>
                  <div className="flex gap-3 items-center justify-end flex-1">
                    {[
                      { href: 'https://facebook.com', Icon: FacebookIcon, label: 'Facebook' },
                      { href: 'https://instagram.com', Icon: InstagramIcon, label: 'Instagram' },
                      { href: 'https://twitter.com', Icon: TwitterIcon, label: 'Twitter' },
                    ].map(({ href, Icon, label }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="text-[#efe7d2] hover:opacity-60 transition-opacity"
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CardHeading({ children }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex items-center">
        <div className="flex items-center justify-center size-[11.3px]">
          <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
        </div>
        <div className="bg-[rgba(239,231,210,0.15)] h-px w-5" />
      </div>
      <p
        className="text-[#efe7d2] text-[24px] tracking-[1px] uppercase whitespace-nowrap"
        style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
      >
        {children}
      </p>
      <div className="flex items-center">
        <div className="bg-[rgba(239,231,210,0.15)] h-px w-5" />
        <div className="flex items-center justify-center size-[11.3px]">
          <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
        </div>
      </div>
    </div>
  )
}

function ContactRow({ label, value }) {
  return (
    <div className="flex gap-6 items-start">
      <span
        className="text-[rgba(245,242,234,0.5)] text-sm tracking-[1px] uppercase w-[80px] shrink-0 pt-[2px]"
        style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.6 }}
      >
        {label}
      </span>
      <span
        className="flex-1 text-[#efe7d2] text-base text-right"
        style={{ fontFamily: "'MJ Satoshi', sans-serif", fontWeight: 400, lineHeight: 1.7 }}
      >
        {value}
      </span>
    </div>
  )
}

function MapCorner({ side }) {
  return (
    <div
      className={`absolute size-6 overflow-hidden ${
        side === 'left' ? 'bottom-0 left-[-24px]' : 'top-[-24px] right-0'
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="absolute inset-0 w-full h-full">
        <path
          d={side === 'left' ? 'M24 24 Q0 24 0 0 L24 0 Z' : 'M0 0 Q24 0 24 24 L0 24 Z'}
          fill="#0a0b0a"
        />
      </svg>
    </div>
  )
}
