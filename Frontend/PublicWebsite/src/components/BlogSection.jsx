import { useInView } from '../hooks/useInView'
import IMG_LEFT from '../assets/images/blog-left.jpg'
import blogPost1 from '../assets/images/blog-post-1.jpg'
import blogPost2 from '../assets/images/blog-post-2.jpg'
import blogPost3 from '../assets/images/blog-post-3.jpg'
import blogPost4 from '../assets/images/blog-post-4.jpg'
import blogPost5 from '../assets/images/blog-post-5.jpg'

const POSTS = [
  {
    id: 1,
    img: blogPost1,
    date: '24th Aug 2023',
    title: 'wasabi Tái Định Nghĩa Sự Hài Hòa Hương Vị',
    excerpt: 'Khám phá bản giao hưởng vị giác tinh tế, nơi mỗi miếng sushi là sự cân bằng hoàn hảo của nghệ thuật ẩm thực.',
  },
  {
    id: 2,
    img: blogPost2,
    date: '24th Aug 2023',
    title: 'Hé Lộ Tinh Hoa Đằng Sau Nghệ Thuật Ẩm Thực',
    excerpt: 'Bước vào thế giới của sự tỉ mỉ và đam mê tạo nên những tuyệt tác sushi trứ danh của Wasabi.',
  },
  {
    id: 3,
    img: blogPost3,
    date: '24th Aug 2023',
    title: 'Hành Trình Của Sự Tươi Mới & Tuyển Chọn Thượng Hạng',
    excerpt: 'Trải nghiệm hành trình vị giác từ nguồn hải sản tươi ngon đến những sáng tạo sushi đầy tinh tế.',
  },
  {
    id: 4,
    img: blogPost4,
    date: '24th Aug 2023',
    title: 'Thăng Hoa Vị Giác Cùng Tuyệt Tác Sushi wasabi',
    excerpt: 'Khám phá đỉnh cao ẩm thực, nơi sushi đưa bạn bước vào một thế giới hương vị hoàn toàn khác biệt.',
  },
  {
    id: 5,
    img: blogPost5,
    date: '24th Aug 2023',
    title: 'Trải Nghiệm wasabi — Không Chỉ Là Sushi',
    excerpt: 'Đắm mình trong niềm đam mê ẩm thực đỉnh cao, nơi sushi không chỉ là món ăn mà còn là một trải nghiệm nghệ thuật.',
  },
]

function handlePostClick() {
  document.getElementById('blog-single')?.scrollIntoView({ behavior: 'smooth' })
}

export default function BlogSection() {
  const [headingRef, headingIn] = useInView()
  return (
    <section id="blog" className="bg-[#0a0b0a] p-6">
      <div className="flex gap-4 items-start">

        {/* Left — sticky image */}
        <div className="flex-1 sticky top-6 self-start h-[calc(100vh-3rem)] overflow-hidden rounded-2xl relative bg-black min-w-0">
          <img
            src={IMG_LEFT}
            alt="Blog"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-black opacity-60 pointer-events-none" />
          <p
            className="absolute bottom-[140px] left-[67px] text-[#efe7d2] uppercase tracking-[2px] leading-[0.63]"
            style={{ fontFamily: 'Forum, serif', fontSize: 'clamp(52px, 7vw, 112px)' }}
          >
            Blog
          </p>
        </div>

        {/* Right — content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl flex flex-col gap-20 px-24 py-20">

            {/* Section heading */}
            <div ref={headingRef} className={`flex items-center justify-center gap-4 ${headingIn ? 'animate-fade-up' : 'opacity-0'}`}>
              <div className="flex items-center">
                <div className="flex items-center justify-center size-[11.3px]">
                  <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                </div>
                <div className="bg-[rgba(239,231,210,0.15)] h-px w-[50px]" />
              </div>
              <p
                className="text-[#efe7d2] text-[40px] tracking-[1px] uppercase text-center leading-[1.2] w-[375px]"
                style={{ fontFamily: 'Forum, serif' }}
              >
                Behind the Scenes<br />&amp; Latest News
              </p>
              <div className="flex items-center">
                <div className="bg-[rgba(239,231,210,0.15)] h-px w-[50px]" />
                <div className="flex items-center justify-center size-[11.3px]">
                  <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                </div>
              </div>
            </div>

            {/* Posts list */}
            <div className="flex flex-col gap-12">
              {POSTS.map((post, i) => (
                <BlogPost key={post.id} post={post} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function BlogPost({ post, index }) {
  const [ref, inView] = useInView()
  return (
    <button
      ref={ref}
      onClick={handlePostClick}
      className={`flex gap-12 items-center w-full text-left bg-transparent border-0 p-0 cursor-pointer group ${inView ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="h-[210px] overflow-hidden rounded-2xl shrink-0 w-[280px] bg-[#050505] relative">
        <img
          src={post.img}
          alt={post.title}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-200"
        />
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
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
            {post.date}
          </span>
        </div>
        <p
          className="text-[#efe7d2] text-[24px] tracking-[1px] uppercase leading-[1.2] group-hover:opacity-80 transition-opacity duration-200"
          style={{ fontFamily: 'Forum, serif' }}
        >
          {post.title}
        </p>
        <p
          className="text-[rgba(245,242,234,0.7)] text-base leading-[1.8]"
          style={{ fontFamily: "'MJ Satoshi', sans-serif", fontWeight: 300 }}
        >
          {post.excerpt}
        </p>
      </div>
    </button>
  )
}
