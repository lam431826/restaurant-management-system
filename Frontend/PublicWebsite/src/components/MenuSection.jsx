import { useInView } from '../hooks/useInView'
import IMG_BG from '../assets/images/menu-bg.jpg'
import IMG_LEAF from '../assets/images/menu-leaf.svg'
import imgMakiSpicyTuna from '../assets/images/menu-maki-spicy-tuna.jpg'
import imgMakiMango from '../assets/images/menu-maki-mango.jpg'
import imgMakiSalmon from '../assets/images/menu-maki-salmon.jpg'
import imgMakiTuna from '../assets/images/menu-maki-tuna.jpg'
import imgUramakiVolcano from '../assets/images/menu-uramaki-volcano.jpg'
import imgUramakiRainbow from '../assets/images/menu-uramaki-rainbow.jpg'
import imgUramakiDragon from '../assets/images/menu-uramaki-dragon.jpg'
import imgUramakiSunset from '../assets/images/menu-uramaki-sunset.jpg'
import imgUramakiMystic from '../assets/images/menu-uramaki-mystic.jpg'
import imgUramakiOcean from '../assets/images/menu-uramaki-ocean.jpg'
import imgUramakiTokyo from '../assets/images/menu-uramaki-tokyo.jpg'
import imgSpecialSunrise from '../assets/images/menu-special-sunrise.jpg'
import imgSpecialMangoTango from '../assets/images/menu-special-mango-tango.jpg'
import imgSpecialTruffle from '../assets/images/menu-special-truffle.jpg'
import imgSpecialPacific from '../assets/images/menu-special-pacific.jpg'
import imgSpecialEel from '../assets/images/menu-special-eel.jpg'

const MAKI = [
  {
    id: 'spicy-tuna-maki',
    img: imgMakiSpicyTuna,
    name: 'Spicy Tuna Maki',
    price: '99.000Đ',
    desc: 'Sự kết hợp hấp dẫn giữa cá ngừ cay, dưa leo và bơ, được cuộn hài hòa trong rong biển nori và cơm sushi tẩm vị.',
    spicy: true,
  },
  {
    id: 'mango-maki',
    img: imgMakiMango,
    name: 'Mango Maki',
    price: '99.000đ',
    desc: 'Tôm tempura chiên giòn, dưa leo và phô mai kem bao bọc phần bơ tươi bên trong, tạo nên sự tương phản thú vị về kết cấu.',
  },
  {
    id: 'salmon-maki',
    img: imgMakiSalmon,
    name: 'Salmon Maki',
    price: '109.000Đ',
    desc: 'Nấm shiitake, bơ và củ cải trắng muối được cuộn trong lớp cơm sushi tẩm vị, phủ bên ngoài bằng mè rang thơm béo.',
  },
  {
    id: 'tuna-maki',
    img: imgMakiTuna,
    name: 'Tuna Maki',
    price: '89.000Đ',
    desc: 'Sự kết hợp đầy màu sắc của cà rốt thái sợi, ớt chuông và dưa leo, được cuộn chặt trong cơm và rong biển nori.',
  },
]

const URAMAKI = [
  {
    id: 'volcano-delight',
    img: imgUramakiVolcano,
    name: 'Volcano Delight',
    price: '179.000Đ',
    desc: 'Salad cua béo ngậy, bơ và dưa leo được cuộn bên trong, phủ cá ngừ cay phía trên và rưới sốt sriracha cay nồng.',
    spicy: true,
  },
  {
    id: 'rainbow-fusion',
    img: imgUramakiRainbow,
    name: 'Rainbow Fusion',
    price: '165.000Đ',
    desc: 'Sự hòa quyện đầy màu sắc của cá ngừ tươi, cá hồi, cá cam Nhật và bơ, bao quanh phần nhân dưa leo và thanh cua.',
  },
  {
    id: 'dragon-elegance',
    img: imgUramakiDragon,
    name: 'Dragon Elegance',
    price: '180.000Đ',
    desc: 'Lươn nướng và bơ nằm gọn bên trong cuộn sushi, phủ lên bằng những lát bơ chín mềm trông như vảy rồng.',
  },
  {
    id: 'sunset-serenity',
    img: imgUramakiSunset,
    name: 'Sunset Serenity',
    price: '159.000Đ',
    desc: 'Tôm tempura, dưa leo và sốt mayonnaise cay được cuộn trong lớp giấy đậu nành, bên trên là những lát xoài mềm mịn.',
  },
  {
    id: 'mystic-garden',
    img: imgUramakiMystic,
    name: 'Mystic Garden',
    price: '209.000Đ',
    desc: 'Nấm shiitake, măng tây và dưa leo hòa quyện cùng vụn tempura giòn rụm, phủ ngoài bằng một lớp mè rang.',
  },
  {
    id: 'ocean-breeze',
    img: imgUramakiOcean,
    name: 'Ocean Breeze',
    price: '209.000Đ',
    desc: 'Sự kết hợp của tôm tươi, thanh cua và bơ, điểm thêm tobiko hương yuzu thanh nhẹ. Ăn chung với gừng và mù tạt.',
  },
  {
    id: 'tokyo-blossom',
    img: imgUramakiTokyo,
    name: 'Tokyo Blossom',
    price: '299.000Đ',
    desc: 'Lớp giấy đậu nành màu hồng nhẹ bao bọc hỗn hợp cá ngừ, thanh cua và dưa leo, trang trí bằng cánh hoa ăn được.',
  },
]

const SPECIAL_ROLLS = [
  {
    id: 'sunrise-bliss',
    img: imgSpecialSunrise,
    name: 'Sunrise Bliss',
    price: '399.000đ',
    desc: 'Sự kết hợp tinh tế giữa cá hồi tươi, phô mai kem và măng tây, được phủ tobiko màu cam rực rỡ, mang hương vị gợi nhớ bình minh.',
    spicy: true,
  },
  {
    id: 'mango-tango-fusion',
    img: imgSpecialMangoTango,
    name: 'Mango Tango Fusion',
    price: '399.000Đ',
    desc: 'Tôm tempura, dưa leo và bơ hòa quyện cùng những lát xoài ngọt, rưới thêm sốt xoài chua nhẹ đầy hấp dẫn.',
    spicy: true,
  },
  {
    id: 'truffle-indulgence',
    img: imgSpecialTruffle,
    name: 'Truffle Indulgence',
    price: '589.000Đ',
    desc: 'Những lát nấm truffle đen thượng hạng phủ lên cuộn bò wagyu mềm mọng, kết hợp cùng dưa leo và rau mầm, tạo nên bản hòa tấu umami tinh tế.',
    spicy: true,
  },
  {
    id: 'pacific-firecracker',
    img: imgSpecialPacific,
    name: 'Pacific Firecracker',
    price: '799.000Đ',
    desc: 'Salad cua cay, tôm tempura và ớt jalapeño hòa quyện trong hương vị bùng nổ, nhấn nhá bằng sốt aioli infused ớt cay.',
    spicy: true,
  },
  {
    id: 'eternal-eel-enchantment',
    img: imgSpecialEel,
    name: 'Eternal Eel Enchantment',
    price: '799.000Đ',
    desc: 'Sự hòa quyện mê hoặc của lươn tempura, gan ngỗng foie gras và dưa leo, được hoàn thiện với dầu truffle và lá vàng sang trọng.',
    spicy: true,
  },
]

const CATEGORIES = [
  { label: 'Maki', id: 'cat-maki' },
  { label: 'UraMaki', id: 'cat-uramaki' },
  { label: 'Special Rolls', id: 'cat-special-rolls' },
]

export default function MenuSection() {
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

          {/* Content card */}
          <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl pt-8 pb-20 px-16 flex flex-col gap-16">

            {/* Category filter tabs */}
            <div className="flex gap-1 items-center justify-center">
              {CATEGORIES.map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => scrollToCategory(id)}
                  className="border border-[rgba(239,231,210,0.15)] px-3 py-2 rounded-lg text-[#efe7d2] text-xs tracking-[1px] uppercase cursor-pointer hover:bg-[rgba(239,231,210,0.08)] transition-colors"
                  style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Menu categories */}
            <div className="flex flex-col gap-24">
              <CategorySection id="cat-maki" title="Maki" items={MAKI} />
              <CategorySection id="cat-uramaki" title="UraMaki" items={URAMAKI} />
              <CategorySection id="cat-special-rolls" title="Special Rolls" items={SPECIAL_ROLLS} />
            </div>
          </div>

          {/* Footer */}
        </div>
      </div>
    </section>
  )
}

function CategorySection({ id, title, items }) {
  const [titleRef, titleIn] = useInView()
  return (
    <div id={id} className="flex flex-col gap-12">
      <div ref={titleRef} className={titleIn ? 'animate-fade-up' : 'opacity-0'}>
        <SectionTitle title={title} />
      </div>
      <div className="flex flex-col gap-8">
        {items.map((item, i) => (
          <MenuItem key={item.id} index={i} {...item} />
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

function MenuItem({ img, name, price, desc, spicy, index = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`flex gap-6 items-center ${inView ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="w-[150px] h-[100px] bg-[#0a0b0a] overflow-hidden rounded-xl shrink-0 relative">
        <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-end gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <p
              className="text-[#efe7d2] text-[22px] tracking-[1px] uppercase whitespace-nowrap"
              style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
            >
              {name}
            </p>
            {spicy && (
              <img src={IMG_LEAF} alt="spicy" className="size-4 shrink-0" />
            )}
          </div>
          <div className="flex-1 border-b border-dashed border-[rgba(239,231,210,0.15)] mb-1" />
          <p
            className="text-[#efe7d2] text-[22px] tracking-[1px] uppercase whitespace-nowrap shrink-0"
            style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
          >
            {price}
          </p>
        </div>
        <p
          className="text-[rgba(245,242,234,0.7)] text-sm leading-[1.5]"
          style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
        >
          {desc}
        </p>
      </div>
    </div>
  )
}

