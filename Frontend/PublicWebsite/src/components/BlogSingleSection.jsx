import IMG_LEFT from '../assets/images/blog-single-left.jpg'
import { useInView } from '../hooks/useInView'

const ARTICLE_SECTIONS = [
  {
    title: 'TINH HOA ẨM THỰC — HÀNH TRÌNH CHẠM ĐẾN CẢM XÚC',
    body: [
      'Giữa thế giới nơi trải nghiệm ẩm thực dần trở nên quen thuộc, Wasabi xuất hiện như biểu tượng của sự tinh tế và đam mê bất tận. Không đơn thuần là một nhà hàng sushi, Wasabi là sự giao thoa giữa nghệ thuật, sáng tạo và chuẩn mực ẩm thực đương đại.',
      'Mỗi bước chân vào Wasabi là một hành trình khám phá vị giác vượt xa khuôn khổ của một bữa ăn thông thường — nơi mọi chi tiết đều được chăm chút để tạo nên trải nghiệm đáng nhớ.',
    ],
  },
  {
    title: 'BẢN GIAO HƯỞNG DÀNH CHO MỌI GIÁC QUAN',
    body: [
      'Tinh thần của Wasabi nằm ở sự chỉn chu trong từng chi tiết — từ khâu tuyển chọn nguyên liệu đến cách trình bày đầy nghệ thuật. Với danh tiếng được xây dựng từ sự hoàn mỹ, Wasabi mang đến những tầng hương vị hòa quyện tinh tế trong từng món ăn.',
      'Đội ngũ đầu bếp tài hoa kết hợp kỹ thuật chế biến điêu luyện cùng cảm hứng sáng tạo, tạo nên những tuyệt tác sushi đánh thức mọi giác quan. Không gian tại Wasabi cũng phản chiếu triết lý ấy — nơi vẻ đẹp hiện đại hòa cùng cảm giác ấm cúng, đưa thực khách bước vào thế giới của sự thư thái và tinh tế.',
    ],
  },
  {
    title: 'HƠN CẢ SUSHI — NƠI KẾT NỐI NHỮNG KHOẢNH KHẮC',
    body: [
      'Bên cạnh nghệ thuật ẩm thực, Wasabi còn là nơi gắn kết con người qua những cuộc trò chuyện, tiếng cười và những khoảnh khắc đáng nhớ bên bàn ăn. Tại đây, việc dùng bữa không chỉ đơn thuần là thưởng thức món ăn, mà còn là nghệ thuật tận hưởng cuộc sống. Wasabi mang đến một trải nghiệm vượt khỏi giới hạn của không gian nhà hàng — nơi đam mê ẩm thực được thể hiện trong từng chi tiết, và mỗi thực khách đều trở thành một phần của hành trình đầy cảm hứng ấy.',
    ],
  },
]

export default function BlogSingleSection() {
  const [headerRef, headerIn] = useInView()
  return (
    <section id="blog-single" className="bg-[#0a0b0a] p-6">
      <div className="flex gap-4 items-start">

        {/* Left — sticky image */}
        <div className="flex-1 sticky top-6 self-start h-[calc(100vh-3rem)] overflow-hidden rounded-2xl relative bg-black min-w-0">
          <img
            src={IMG_LEFT}
            alt="Blog article"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-black opacity-60 pointer-events-none" />
        </div>

        {/* Right — article content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl flex flex-col gap-20 px-24 py-20">

            {/* Article header */}
            <div ref={headerRef} className={`flex flex-col gap-4 items-center ${headerIn ? 'animate-fade-up' : 'opacity-0'}`}>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <div className="flex items-center justify-center size-[11.3px]">
                    <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                  </div>
                  <div className="bg-[rgba(239,231,210,0.15)] h-px w-5" />
                </div>
                <span
                  className="text-[#efe7d2] text-xs tracking-[1px] uppercase"
                  style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
                >
                  24th Aug 2023
                </span>
                <div className="flex items-center">
                  <div className="bg-[rgba(239,231,210,0.15)] h-px w-5" />
                  <div className="flex items-center justify-center size-[11.3px]">
                    <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                  </div>
                </div>
              </div>

              <h1
                className="text-[#efe7d2] tracking-[1px] uppercase text-center leading-[1.1] w-full"
                style={{ fontFamily: 'Forum, serif', fontSize: 'clamp(32px, 4vw, 64px)' }}
              >
                wasabi — NƠI TÁI ĐỊNH NGHĨA SỰ HÀI HÒA HƯƠNG VỊ
              </h1>

              <div className="flex items-center gap-1">
                <div className="flex items-center justify-center size-[11.3px]">
                  <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                </div>
                <div className="bg-[rgba(239,231,210,0.15)] h-px w-5" />
                <div className="flex items-center justify-center size-[11.3px]">
                  <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                </div>
              </div>
            </div>

            {/* Article body */}
            <div className="flex flex-col gap-12">
              {ARTICLE_SECTIONS.map((section, i) => (
                <ArticleSection key={section.title} section={section} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ArticleSection({ section, index }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`flex flex-col gap-4 ${inView ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <h2
        className="text-[#efe7d2] text-[32px] tracking-[1px] uppercase leading-[1.2]"
        style={{ fontFamily: 'Forum, serif' }}
      >
        {section.title}
      </h2>
      {section.body.map((para, i) => (
        <p
          key={i}
          className="text-[rgba(245,242,234,0.7)] text-base leading-[1.8]"
          style={{ fontFamily: "'MJ Satoshi', sans-serif", fontWeight: 300 }}
        >
          {para}
        </p>
      ))}
    </div>
  )
}
