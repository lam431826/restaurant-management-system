import { useState, useEffect } from 'react'
import { useInView } from '../hooks/useInView'
import IMG_BG from '../assets/images/menu-bg.jpg'
import imgMakiSpicyTuna from '../assets/images/menu-maki-spicy-tuna.jpg'

export default function MenuSection({ onAddToCart }) {
  const [menuData, setMenuData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/menu/public')
      .then(res => res.json())
      .then(data => {
        setMenuData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch menu:', err)
        setLoading(false)
      })
  }, [])

  function scrollToCategory(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="menu" className="bg-[#0a0b0a] p-6">
      <div className="flex gap-4 items-start">
        {/* Left — sticky food image */}
        <div className="flex-1 sticky top-6 self-start h-[calc(100vh-3rem)] overflow-hidden rounded-2xl relative bg-black min-w-0">
          <img
            src={IMG_BG}
            alt="Sushi dish"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-black opacity-60 pointer-events-none" />
          <p
            className="absolute bottom-[140px] left-[66px] text-[#efe7d2] uppercase tracking-[2px] leading-[0.63]"
            style={{ fontFamily: 'Forum, serif', fontSize: 'clamp(64px, 7vw, 112px)' }}
          >
            Menu
          </p>
        </div>

        {/* Right — content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl pt-8 pb-20 px-16 flex flex-col gap-16 min-h-[500px]">
            {loading ? (
              <p className="text-[#efe7d2] text-center mt-10 text-xl" style={{ fontFamily: 'Forum, serif' }}>Đang tải thực đơn...</p>
            ) : (
              <>
                {/* Category filter tabs */}
                <div className="flex gap-2 items-center justify-center flex-wrap">
                  {menuData.map(cat => (
                    <button
                      key={cat.categoryId}
                      onClick={() => scrollToCategory(`cat-${cat.categoryId}`)}
                      className="border border-[rgba(239,231,210,0.15)] px-4 py-2.5 rounded-lg text-[#efe7d2] text-sm tracking-[1px] uppercase cursor-pointer hover:bg-[rgba(239,231,210,0.08)] transition-colors"
                      style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
                    >
                      {cat.categoryName}
                    </button>
                  ))}
                </div>

                {/* Menu categories */}
                <div className="flex flex-col gap-24">
                  {menuData.map(cat => (
                    <CategorySection key={cat.categoryId} id={`cat-${cat.categoryId}`} title={cat.categoryName} items={cat.items} onAddToCart={onAddToCart} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CategorySection({ id, title, items, onAddToCart }) {
  const [titleRef, titleIn] = useInView()
  return (
    <div id={id} className="flex flex-col gap-12">
      <div ref={titleRef} className={titleIn ? 'animate-fade-up' : 'opacity-0'}>
        <SectionTitle title={title} />
      </div>
      <div className="flex flex-col gap-8">
        {items.map((item, i) => (
          <MenuItem key={item.id} index={i} item={item} onAddToCart={onAddToCart} />
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex items-center">
        <div className="flex items-center justify-center size-[11.3px]">
          <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
        </div>
        <div className="bg-[rgba(239,231,210,0.15)] h-px w-[50px]" />
      </div>
      <p
        className="text-[#efe7d2] text-[32px] tracking-[1px] uppercase whitespace-nowrap"
        style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
      >
        {title}
      </p>
      <div className="flex items-center">
        <div className="bg-[rgba(239,231,210,0.15)] h-px w-[50px]" />
        <div className="flex items-center justify-center size-[11.3px]">
          <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
        </div>
      </div>
    </div>
  )
}

function MenuItem({ item, index = 0, onAddToCart }) {
  const [ref, inView] = useInView()
  const imgUrl = item.imageUrl || imgMakiSpicyTuna; // Fallback image if null
  return (
    <div
      ref={ref}
      className={`flex gap-6 items-center ${inView ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="w-[150px] h-[100px] bg-[#0a0b0a] overflow-hidden rounded-xl shrink-0 relative">
        <img src={imgUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-end gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <p
              className="text-[#efe7d2] text-[22px] tracking-[1px] uppercase whitespace-nowrap"
              style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
            >
              {item.name}
            </p>
          </div>
          <div className="flex-1 border-b border-dashed border-[rgba(239,231,210,0.15)] mb-1" />
          <p
            className="text-[#efe7d2] text-[22px] tracking-[1px] uppercase whitespace-nowrap shrink-0"
            style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
          >
            {item.price.toLocaleString('vi-VN')} Đ
          </p>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p
            className="text-[rgba(245,242,234,0.7)] text-sm leading-[1.5] pr-4"
            style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
          >
            {item.description || 'Hương vị tuyệt hảo từ bếp trưởng của chúng tôi.'}
          </p>
          <button 
            onClick={() => onAddToCart && onAddToCart(item)}
            className="border border-[#efe7d2] text-[#efe7d2] px-4 py-1.5 rounded-full hover:bg-[#efe7d2] hover:text-[#0a0b0a] transition-colors shrink-0 text-sm tracking-wide font-medium cursor-pointer"
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  )
}
