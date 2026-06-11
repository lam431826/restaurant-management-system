import IMG_BG from '../assets/images/about-bg.jpg'
import IMG_INTERIOR from '../assets/images/about-interior.jpg'
import IMG_CHEF from '../assets/images/about-chef.jpg'
import { useInView } from '../hooks/useInView'

const AWARDS = [
  { name: 'Trip Advisor',    sub: 'Best Sushi House\nPrague' },
  { name: 'Michelin Guide',  sub: 'Best Sushi House\nPrague' },
  { name: 'Star Dining',     sub: 'Best Sushi House\nPrague' },
]

export default function AboutSection() {
  const [row1Ref, row1In] = useInView()
  const [row2Ref, row2In] = useInView()
  const [row3Ref, row3In] = useInView()

  return (
    <section id="about" className="bg-[#0a0b0a] p-6">
      <div className="flex gap-4 items-start">

        {/* Left — sticky image */}
        <div className="flex-1 sticky top-6 self-start h-[calc(100vh-3rem)] overflow-hidden rounded-2xl relative bg-black min-w-0">
          <img
            src={IMG_BG}
            alt="Chef hands"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-black opacity-60 pointer-events-none" />
          <p
            className="absolute bottom-[140px] left-[67px] text-[#efe7d2] uppercase tracking-[2px] leading-[0.63]"
            style={{ fontFamily: 'Forum, serif', fontSize: 'clamp(52px, 7vw, 112px)' }}
          >
            About
          </p>
        </div>

        {/* Right — content grid + footer */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-4">

            {/* Row 1: tagline card + interior image */}
            <div ref={row1Ref} className={`flex gap-4 min-h-[280px] ${row1In ? 'animate-fade-up' : 'opacity-0'}`}>
              <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl flex-1 flex flex-col justify-between p-12 min-w-0 overflow-hidden">
                <p
                  className="text-[#efe7d2] text-[32px] tracking-[1px] uppercase leading-[1.2]"
                  style={{ fontFamily: 'Forum, serif' }}
                >
                  Sushi Artistry Redefined
                </p>
                <p
                  className="text-[#efe7d2] text-base leading-[1.8]"
                  style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
                >
                  Nơi tinh hoa ẩm thực hòa quyện cùng vẻ đẹp hiện đại.{' '}
                  Thưởng thức những món sushi hảo hạng, được tuyển chọn và chế biến tinh tế nhằm nâng tầm trải nghiệm ẩm thực của bạn.
                </p>
              </div>
              <div className="flex-1 bg-black overflow-hidden rounded-2xl min-w-0 relative" style={{ animationDelay: '100ms' }}>
                <img
                  src={IMG_INTERIOR}
                  alt="Restaurant interior"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              </div>
            </div>

            {/* Row 2: award cards */}
            <div ref={row2Ref} className={`flex gap-4 ${row2In ? 'animate-fade-up' : 'opacity-0'}`}>
              {AWARDS.map((award, i) => (
                <AwardCard key={award.name} delay={i * 80} {...award} />
              ))}
            </div>

            {/* Row 3: chef image + our story card */}
            <div ref={row3Ref} className={`flex gap-4 min-h-[280px] ${row3In ? 'animate-fade-up' : 'opacity-0'}`}>
              <div className="flex-1 bg-black overflow-hidden rounded-2xl min-w-0 relative">
                <img
                  src={IMG_CHEF}
                  alt="Chef at work"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              </div>
              <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl flex-1 flex flex-col justify-between p-12 min-w-0 overflow-hidden">
                {/* "Our Story" sub-title with short decorative lines */}
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center size-[11.3px]">
                      <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                    </div>
                    <div className="bg-[rgba(239,231,210,0.15)] h-px w-[20px]" />
                  </div>
                  <p
                    className="text-[#efe7d2] text-[24px] tracking-[1px] uppercase whitespace-nowrap"
                    style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
                  >
                    Our Story
                  </p>
                  <div className="flex items-center">
                    <div className="bg-[rgba(239,231,210,0.15)] h-px w-[20px]" />
                    <div className="flex items-center justify-center size-[11.3px]">
                      <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                    </div>
                  </div>
                </div>
                <p
                  className="text-[#efe7d2] text-base leading-[1.8]"
                  style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
                >
                  Được thành lập từ niềm đam mê với nghệ thuật ẩm thực đỉnh cao, hành trình của Qitchen bắt đầu tại trung tâm Prague. Qua nhiều năm, nơi đây đã trở thành điểm đến dành cho những tín đồ sushi, nổi tiếng bởi sự tinh tế trong chế biến và khát vọng tái định nghĩa nghệ thuật ẩm thực.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function AwardCard({ name, sub, delay = 0 }) {
  return (
    <div
      className="border border-[rgba(239,231,210,0.15)] rounded-2xl flex-1 flex flex-col items-center justify-center gap-2 p-8"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex gap-1 items-center py-[7px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-1">
        <p
          className="text-[#efe7d2] text-[24px] tracking-[1px] uppercase text-center whitespace-nowrap"
          style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
        >
          {name}
        </p>
        <p
          className="text-[rgba(245,242,234,0.7)] text-xs tracking-[1px] uppercase text-center whitespace-pre-line"
          style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
        >
          {sub}
        </p>
      </div>
    </div>
  )
}

function StarIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#efe7d2" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}

