import { useState, useEffect } from 'react'

// ─── Mock data ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',     label: 'Tất Cả',      count: 31, active: true },
  { id: 'hot',     label: 'Bán Chạy',    count: 12 },
  { id: 'maki',    label: 'Maki',        count: 4  },
  { id: 'uramaki', label: 'Ura Maki',    count: 7  },
  { id: 'rolls',   label: 'Special Rolls', count: 5 },
  { id: 'drinks',  label: 'Nước Uống',   count: 15 },
]

const MENU_ITEMS = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: 'Item Name',
  desc: 'Lorem ipsum dolor sit amet, consecte tur adipiscing elit kesed do eiusmod',
  price: 89000,
  originalPrice: 100000,
  popular: true,
  discount: 'Disc 10%',
  qty: i < 3 ? 1 : 0,
  image: '/images/food-item.jpg',
}))

const TABLES = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Bàn ${i + 1}`,
  occupied: [1, 4, 5, 7, 9].includes(i + 1),
  selected: i + 1 === 9,
  amount: i + 1 === 9 ? 267000 : 100000,
  guests: 1,
  items: i + 1 === 9 ? 3 : 1,
}))

const ORDER_ITEMS = [
  { id: 1, name: 'Item Name', qty: 1, notes: 'Ghi chú : Notes', status: 'Đang nấu', price: 89000 },
  { id: 2, name: 'Item Name', qty: 1, notes: 'Ghi chú : Notes', status: 'Đang nấu', price: 89000 },
  { id: 3, name: 'Item Name', qty: 1, notes: 'Ghi chú : Notes', status: 'Đang nấu', price: 89000 },
]

const VAT_RATE = 0.08

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx={11} cy={11} r={8} /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}
function ChevronDownIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
function HomeIcon({ active }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function OrdersIcon({ active }) {
  return (
    <svg className="w-6 h-6" fill={active ? '#025cca' : 'none'} stroke={active ? '#025cca' : 'currentColor'} strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}
function MoreIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}
function PlusIcon({ white }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke={white ? 'white' : 'currentColor'} strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
function MinusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  )
}
function RefreshIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}
function ReceiptIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12l2.25 2.25L15 9M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" />
    </svg>
  )
}
function NoteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="#025cca" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="#286b4a" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}
function TagIcon() {
  return (
    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.186 3.548.428a18.849 18.849 0 005.441-5.44c.758-1.16.492-2.629-.428-3.548l-9.58-9.581a3 3 0 00-2.122-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" clipRule="evenodd" />
    </svg>
  )
}
function CashMethodIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  )
}
function QRMethodIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
    </svg>
  )
}
function DebitMethodIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
function DeleteDigitIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.374-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({ employeeName = 'Duy Tan', onSearch }) {
  return (
    <header className="bg-white flex items-center justify-between px-6 h-[64px] shrink-0 border-b border-[#e8e8e8]">
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-[#025cca] rounded-[10px] flex items-center justify-center text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[18px] font-bold text-[#202325]">Wasabi</span>
          <span className="text-[12px] text-[#636566]">Wasabi restaurant</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-[#f5f5f5] rounded-[12px] px-4 h-[44px] w-[180px] md:w-[260px] lg:w-[340px]">
        <SearchIcon className="w-5 h-5 text-[#797b7c] shrink-0" />
        <input
          placeholder="Tìm Kiếm"
          className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
        />
      </div>

      {/* Right: bell + employee */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative">
          <button className="text-[#202325]"><BellIcon /></button>
          <span className="absolute -top-1 -right-1 bg-[#025cca] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">2</span>
        </div>
        <button className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#5B8FE8] flex items-center justify-center text-white text-[13px] font-semibold">DT</div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[14px] font-medium text-[#202325]">{employeeName}</span>
            <span className="text-[12px] text-[#636566]">Cashier</span>
          </div>
          <ChevronDownIcon />
        </button>
      </div>
    </header>
  )
}

function BottomNav({ active = 'orders' }) {
  const items = [
    { id: 'home',       label: 'Home',       icon: <HomeIcon active={active === 'home'} /> },
    { id: 'orders',     label: 'Orders',     icon: <OrdersIcon active={active === 'orders'} /> },
    { id: 'fab',        label: null,         icon: null },
    { id: 'transition', label: 'Transition', icon: <GridIcon /> },
    { id: 'more',       label: 'More',       icon: <MoreIcon /> },
  ]
  return (
    <nav className="bg-white border-t border-[#e8e8e8] flex items-center justify-around h-[72px] shrink-0 relative px-4">
      {items.map(item =>
        item.id === 'fab' ? (
          <button
            key="fab"
            className="w-14 h-14 bg-[#025cca] rounded-full flex items-center justify-center shadow-lg -mt-7 hover:bg-[#0250b0] transition-colors"
          >
            <PlusIcon white />
          </button>
        ) : (
          <button
            key={item.id}
            className={`flex flex-col items-center gap-1 ${active === item.id ? 'text-[#025cca]' : 'text-[#636566]'}`}
          >
            {item.icon}
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        )
      )}
    </nav>
  )
}

// ─── Menu View ────────────────────────────────────────────────────────────────

function MenuItemCard({ item, onQtyChange }) {
  return (
    <div className="bg-white flex flex-col gap-4 p-4 rounded-[16px] w-[220px] shrink-0 overflow-hidden relative">
      {/* Badges */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {item.popular && (
          <span className="bg-[#fda62b] flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-[16px] text-[12px] font-semibold text-white">
            <StarIcon /> Popular
          </span>
        )}
        {item.discount && (
          <span className="bg-[#ee4e4f] flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-[16px] text-[12px] font-semibold text-white">
            <TagIcon /> {item.discount}
          </span>
        )}
      </div>

      {/* Image */}
      <div className="h-[150px] rounded-[16px] overflow-hidden shrink-0">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2">
        <p className="text-[16px] font-medium text-[#202325]">{item.name}</p>
        <p className="text-[12px] text-[#636566] leading-[1.5] line-clamp-2">{item.desc}</p>
      </div>

      {/* Price + Controls */}
      <div className="flex items-end justify-between">
        <div className="relative">
          <p className="absolute -top-4 left-0 text-[14px] text-[#636566] line-through">
            {item.originalPrice.toLocaleString('vi-VN')}đ
          </p>
          <p className="text-[20px] font-semibold text-[#202325]">
            {item.price.toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQtyChange(item.id, -1)}
            className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center hover:bg-[#e8e8e8] transition-colors"
          >
            <MinusIcon />
          </button>
          <span className="text-[20px] font-semibold text-[#202325] w-5 text-center">{item.qty}</span>
          <button
            onClick={() => onQtyChange(item.id, 1)}
            className="w-8 h-8 rounded-full bg-[#025cca] flex items-center justify-center hover:bg-[#0250b0] transition-colors"
          >
            <PlusIcon white />
          </button>
        </div>
      </div>
    </div>
  )
}

function MenuView({ items, onQtyChange, searchValue, onSearch }) {
  const [activeCategory, setActiveCategory] = useState('all')

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 h-[38px] px-2 rounded-[8px] border shrink-0 transition-colors ${
              activeCategory === cat.id
                ? 'bg-white border-[#e8e8e8] text-[#37383a]'
                : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#797b7c]'
            }`}
          >
            <span className="text-[14px]">{cat.label}</span>
            <span className={`flex items-center justify-center h-6 w-7 rounded-[12px] text-[14px] ${
              activeCategory === cat.id ? 'bg-[#68b5fb] text-white' : 'bg-[#e8e8e8] text-[#797b7c]'
            }`}>
              {cat.count}
            </span>
          </button>
        ))}
        <button className="ml-auto shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#636566] hover:bg-[#f5f5f5]">
          <RefreshIcon />
        </button>
      </div>

      {/* Menu grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2.5 p-2.5">
          {items.map(item => (
            <MenuItemCard key={item.id} item={item} onQtyChange={onQtyChange} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableCard({ table, onSelect }) {
  const seatColor = table.occupied ? '#ffedd5' : (table.selected ? 'white' : '#e8e8e8')

  const selectedBg = table.occupied ? 'bg-[#dceefe]' : 'bg-[#d9e7f7]'

  const Chairs = () => (
    <div className="flex gap-[15px] shrink-0">
      <div className="h-[17px] w-[63px] rounded-[12px]" style={{ backgroundColor: seatColor }} />
      <div className="h-[17px] w-[63px] rounded-[12px]" style={{ backgroundColor: seatColor }} />
    </div>
  )

  return (
    <button
      onClick={() => onSelect(table.id)}
      className={`flex flex-col gap-3 items-center p-[10px] rounded-[30px] w-[184px] shrink-0 border-2 transition-colors ${
        table.selected
          ? `${selectedBg} border-[#025cca]`
          : 'bg-white border-transparent hover:border-[#e8e8e8]'
      }`}
    >
      <Chairs />

      {/* Table body — fixed 164×80, text absolutely centred */}
      <div className="relative h-[80px] w-[164px] rounded-[12px] shrink-0" style={{ backgroundColor: seatColor }}>
        {table.occupied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <p className="text-[16px] font-semibold text-black leading-tight">
              {table.amount.toLocaleString('vi-VN')}
            </p>
            <div className="flex gap-2.5 text-[10px] text-black">
              <span>{table.guests} người</span>
              <span>{table.items} món</span>
            </div>
          </div>
        )}
      </div>

      <Chairs />

      <p className="text-[16px] font-semibold text-center leading-[1.5] text-black">
        {table.name}
      </p>
    </button>
  )
}

function TableView({ tables, onSelect, filter }) {
  const filtered = filter === 'used'  ? tables.filter(t => t.occupied)
    : filter === 'empty' ? tables.filter(t => !t.occupied)
    : tables

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-wrap gap-3 pr-2">
        {filtered.map(table => (
          <TableCard key={table.id} table={table} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

const STATUS_OPTIONS = ['Đang nấu', 'Đã nấu xong', 'Đã phục vụ']

function OrderItemRow({ item, onStatusChange, onNote }) {
  return (
    <div className="flex flex-col gap-3 py-2 border-b border-[#e8e8e8]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-medium text-[#202325]">{item.name}</span>
            <span className="text-[16px] font-medium text-[#202325] shrink-0">x{item.qty}</span>
          </div>
          {item.notes && (
            <p className="text-[12px] text-[#636566] mt-1">{item.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNote(item.id, item.notes || '')}
            className="bg-[#f0f8ff] flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full hover:bg-[#dceefe] transition-colors"
          >
            <NoteIcon />
            <span className="text-[12px] font-medium text-[#025cca]">Ghi chú</span>
          </button>
          <div className="relative">
            <select
              value={item.status}
              onChange={e => onStatusChange(item.id, e.target.value)}
              className="appearance-none bg-white border border-[#e8e8e8] rounded-[12px] text-[10px] font-medium text-[#202325] pl-3 pr-6 py-1 outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDownIcon className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#636566] pointer-events-none" />
          </div>
        </div>
        <span className="text-[16px] font-semibold text-[#202325]">
          {item.price.toLocaleString('vi-VN')}đ
        </span>
      </div>
    </div>
  )
}

function AddNoteModal({ itemId, initialText, onConfirm, onCancel }) {
  const [text, setText] = useState(initialText)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      <div className="relative bg-white rounded-[12px] p-6 w-[431px] flex flex-col gap-5 items-center shadow-xl">
        {/* Title */}
        <div className="flex items-center w-full">
          <p className="text-[24px] font-semibold text-[#202325] leading-[1.5]">Thêm ghi chú</p>
        </div>
        {/* Textarea */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
          placeholder="Nhập ghi chú..."
          rows={3}
          className="w-full bg-white border border-[#024eab] rounded-[12px] px-4 py-3 text-[14px] text-[#202325] placeholder-[#797b7c] outline-none resize-none leading-[1.5]"
          style={{ minHeight: 99 }}
        />
        {/* Buttons */}
        <div className="flex gap-2 w-full">
          <button
            onClick={onCancel}
            className="flex-1 h-[52px] bg-[#f5f5f5] rounded-[12px] text-[16px] font-medium text-[#202325] hover:bg-[#e8e8e8] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(itemId, text)}
            className="flex-1 h-[52px] bg-[#025cca] rounded-[12px] text-[16px] font-semibold text-white hover:bg-[#0250b0] transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: 'cash',  label: 'Cash'       },
  { id: 'debit', label: 'Debit Card' },
  { id: 'qr',    label: 'QR Code'    },
]

function PaymentModal({ items, table, onClose, onConfirm }) {
  const [method, setMethod] = useState('cash')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [cashInput, setCashInput] = useState('')

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  const total = subtotal + vat

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })

  const methodIcons = { cash: <CashMethodIcon />, debit: <DebitMethodIcon />, qr: <QRMethodIcon /> }

  function handleDigit(key) {
    if (key === 'del') setCashInput(v => v.slice(0, -1))
    else setCashInput(v => v.length < 12 ? v + key : v)
  }

  const displayAmount = cashInput
    ? parseInt(cashInput, 10).toLocaleString('vi-VN') + 'đ'
    : '0đ'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" style={{ opacity: 0.6 }} onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[16px] p-6 flex flex-col gap-2.5 overflow-hidden w-[95vw] max-w-[711px] max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0" style={{ height: 44 }}>
          <p className="text-[24px] font-semibold text-[#202325]">Payment</p>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center text-[#202325] hover:bg-[#e8e8e8] transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-6 lg:gap-10 items-start flex-1 min-h-0 overflow-hidden">

          {/* ── Receipt panel ── */}
          <div
            className="hidden lg:flex w-[300px] h-full bg-[#fcf7ef] overflow-y-auto flex-col gap-3 px-4 py-8 shrink-0"
            style={{ fontFamily: 'monospace' }}
          >
            <div className="flex flex-col items-center gap-3">
              <p className="text-[#3f4e4f] text-[24px] font-medium">Wasabi Sushi</p>
              <p className="text-black text-[10px] text-center tracking-tight">{dateStr} • {timeStr}</p>
            </div>

            <div className="border border-dashed border-[#b0a080] rounded px-3 py-2 text-center">
              <p className="text-[10px] tracking-widest text-black">Order Id</p>
              <p className="text-[14px] font-bold tracking-wider text-black">ORDER001</p>
            </div>

            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between"><span className="text-[#6d7278]">Cashier</span><span className="text-black">Duy Tan</span></div>
              <div className="flex justify-between"><span className="text-[#6d7278]">Working Time</span><span className="text-black">09.00 - 12.00 AM</span></div>
            </div>

            <div className="border-t border-dashed border-[#b0a080]" />

            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between gap-2"><span className="text-[#6d7278] shrink-0">Customer Name</span><span className="text-black">Nguyen Van A</span></div>
              <div className="flex justify-between gap-2"><span className="text-[#6d7278] shrink-0">Member Id Card</span><span className="text-black">-</span></div>
              <div className="flex justify-between gap-2"><span className="text-[#6d7278] shrink-0">Order Type</span><span className="text-black">Dine In</span></div>
              <div className="flex justify-between gap-2"><span className="text-[#6d7278] shrink-0">Table Number</span><span className="text-black">{table?.name?.replace('Bàn ', '') ?? '9'}</span></div>
            </div>

            <div className="border-t border-dashed border-[#b0a080]" />

            <div className="flex flex-col gap-3 text-[10px]">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 justify-between">
                  <span className="text-[#6d7278] flex-1 truncate">{item.name}</span>
                  <span className="text-[#6d7278] shrink-0">{item.qty} x {item.price.toLocaleString('vi-VN')}đ</span>
                  <span className="text-black shrink-0 font-bold">{(item.qty * item.price).toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-[#b0a080]" />

            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between"><span className="text-[#6d7278]">Subtotal</span><span className="text-black">{subtotal.toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between"><span className="text-[#6d7278]">Discount</span><span className="text-black">0đ</span></div>
              <div className="flex justify-between"><span className="text-[#6d7278]">Vat (8%)</span><span className="text-black">{vat.toLocaleString('vi-VN')}</span></div>
            </div>

            <div className="border-t border-dashed border-[#b0a080]" />

            <div className="flex justify-between text-[14px] font-bold text-[#a27b5c]">
              <span>Total Amount</span>
              <span>{total.toLocaleString('vi-VN')}đ</span>
            </div>

            <p className="text-[8px] text-black leading-relaxed">
              Thanks for fueling our passion. Drop by again, if your wallet isn't still sulking. You're always welcome here!
            </p>

            <p className="text-[#3f4e4f] text-[24px] font-medium text-center">Wasabi Sushi</p>
          </div>

          {/* ── Payment panel ── */}
          <div className="flex-1 h-full flex flex-col justify-between overflow-y-auto">

            {/* Dropdown */}
            <div className="relative flex flex-col gap-4">
              <p className="text-[16px] font-semibold text-[#202325]">Select a payment method</p>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className={`flex items-center justify-between px-2 py-3 rounded-[12px] border transition-colors ${
                  dropdownOpen ? 'border-[#025cca] bg-white' : 'border-[#e8e8e8] bg-[#f5f5f5]'
                }`}
              >
                <div className="flex items-center gap-2 px-3">
                  {methodIcons[method]}
                  <span className="text-[16px] font-medium text-[#202325]">
                    {PAYMENT_METHODS.find(m => m.id === method)?.label}
                  </span>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-[#636566] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e8e8e8] rounded-[12px] shadow-md z-10 flex flex-col gap-1 px-2 py-3">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => { setMethod(pm.id); setDropdownOpen(false) }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-[12px] w-full text-left transition-colors ${
                        method === pm.id ? 'bg-[#f0f8ff]' : 'bg-white hover:bg-[#f5f5f5]'
                      }`}
                    >
                      {methodIcons[pm.id]}
                      <span className="text-[16px] font-medium text-[#202325]">{pm.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cash: amount + dial pad */}
            {method === 'cash' && (
              <div className="flex flex-col items-center gap-2.5">
                <p className="text-[40px] font-medium text-[#202325] text-center">{displayAmount}</p>
                <div className="flex flex-wrap w-full justify-between px-2">
                  {['1','2','3','4','5','6','7','8','9','.','0','del'].map(key => (
                    <button
                      key={key}
                      onClick={() => key !== '.' && handleDigit(key)}
                      disabled={key === '.'}
                      className={`w-16 h-[54px] mb-4 flex items-center justify-center rounded-[8px] active:scale-95 transition-all ${
                        key === '.' ? 'opacity-30 cursor-default' : 'hover:bg-[#f5f5f5]'
                      }`}
                    >
                      {key === 'del'
                        ? <DeleteDigitIcon />
                        : <span className={`text-[28px] text-[#202325] ${key === '.' ? 'font-normal' : 'font-medium'}`}>{key}</span>
                      }
                    </button>
                  ))}
                </div>
                <button
                  onClick={onConfirm}
                  className="w-full h-[60px] bg-[#025cca] rounded-[12px] text-[16px] font-semibold text-white hover:bg-[#0250b0] transition-colors"
                >
                  Thanh toán
                </button>
              </div>
            )}

            {/* QR: code + bank info + spinner */}
            {method === 'qr' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-[250px] h-[250px] bg-white overflow-hidden flex items-center justify-center">
                  <img src="/images/qr-code.png" alt="QR Code" className="w-full h-full object-contain" />
                </div>
                <div className="w-full border-b border-[#e8e8e8] px-5 py-3 flex flex-col gap-2 items-center">
                  <p className="text-[20px] font-medium text-[#202325]">MB Bank</p>
                  <p className="text-[14px] text-[#636566]"><span className="text-[#a2a4a4]">STK</span>: <span className="text-[#202325]">7777777777</span></p>
                  <p className="text-[14px] text-[#636566]"><span className="text-[#a2a4a4]">Chủ tài khoản:</span> <span className="text-[#202325]">Wasabi Sushi</span></p>
                  <p className="text-[14px] text-[#636566]"><span className="text-[#a2a4a4]">Số tiền:</span> <span className="text-[#202325]">{total.toLocaleString('vi-VN')} đ</span></p>
                  <p className="text-[14px] text-[#636566]"><span className="text-[#a2a4a4]">Nội dung:</span> <span className="text-[#202325]">#200 QR Code</span></p>
                </div>
                <div className="w-10 h-10 rounded-full border-4 border-[#e8e8e8] border-t-[#025cca] animate-spin" />
                <p className="text-[14px] font-medium text-[#292c2d]">Waiting...</p>
                <button
                  onClick={onClose}
                  className="w-full h-[52px] bg-[#f5f5f5] rounded-[12px] text-[16px] font-medium text-[#202325] hover:bg-[#e8e8e8] transition-colors"
                >
                  Hủy
                </button>
              </div>
            )}

            {/* Debit placeholder */}
            {method === 'debit' && (
              <div className="flex flex-col items-center justify-center gap-4 text-[#636566]">
                <DebitMethodIcon />
                <p className="text-[16px]">Debit card payment coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

function OrderPanel({ items, onStatusChange, onCheckout, onCreateOrder, onNote, selectedTable }) {
  const isEmpty = selectedTable && !selectedTable.occupied
  const subtotal = isEmpty ? 0 : items.reduce((s, i) => s + i.price * i.qty, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  const total = subtotal + vat

  return (
    <div className="bg-white rounded-[12px] flex flex-col p-4 lg:p-6 w-[260px] md:w-[300px] lg:w-[360px] xl:w-[400px] shrink-0 h-full overflow-hidden">
      {/* Customer header */}
      <div className="flex items-start justify-between shrink-0 mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-medium text-[#202325]">
            {isEmpty ? 'Customer Name' : 'Nguyen Van A'}
          </span>
          <span className="text-[14px] text-[#636566]">
            {isEmpty ? `#000 / ${selectedTable.name}` : '#289 / Bàn 9'}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isEmpty ? (
            <>
              <div className="bg-[#dcf7ea] flex items-center gap-1 px-2 py-1 rounded-[8px]">
                <CheckIcon />
                <span className="text-[12px] font-medium text-[#286b4a]">Ready</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#48c185]" />
                <span className="text-[12px] text-[#636566]">Ready to serve</span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#f5f5f5] flex items-center gap-1 px-2 py-1 rounded-[8px]">
                <ReceiptIcon />
                <span className="text-[12px] font-medium text-[#202325]">Thanh toán</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#202325]" />
                <span className="text-[12px] text-[#636566]">Đợi thanh toán</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section title */}
      <p className="text-[16px] font-semibold text-[#202325] shrink-0 mb-3">Chi tiết đơn hàng</p>
      <div className="h-px bg-[#e8e8e8] shrink-0 mb-3" />

      {/* Items list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!isEmpty && items.map(item => (
          <OrderItemRow
            key={item.id}
            item={item}
            onStatusChange={onStatusChange}
            onNote={onNote}
          />
        ))}
      </div>

      {/* Totals */}
      <div className="shrink-0 mt-4 flex flex-col gap-3">
        <div className="h-px bg-[#e8e8e8]" />
        <div className="flex justify-between text-[14px]">
          <span className="font-medium text-[#636566]">Tổng ({isEmpty ? 0 : items.length} món)</span>
          <span className="font-semibold text-[#202325]">{isEmpty ? '0 đ' : `${subtotal.toLocaleString('vi-VN')} đ`}</span>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="font-medium text-[#636566]">Vat (8%)</span>
          <span className="font-semibold text-[#202325]">{isEmpty ? '0 đ' : `${vat.toLocaleString('vi-VN')} đ`}</span>
        </div>
        <div className="h-px bg-[#202325]" />
        <div className="flex justify-between text-[20px]">
          <span className="font-medium text-[#202325]">Tổng tiền</span>
          <span className="font-semibold text-[#202325]">{isEmpty ? '0 đ' : `${total.toLocaleString('vi-VN')} đ`}</span>
        </div>
        {isEmpty ? (
          <button
            onClick={onCreateOrder}
            className="bg-[#025cca] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors mt-1"
          >
            <span className="text-[16px] font-medium text-white">Tạo Order</span>
          </button>
        ) : (
          <button
            onClick={onCheckout}
            className="bg-[#025cca] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors mt-1"
          >
            <span className="text-[16px] font-medium text-white">Thanh Toán (F9)</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Success Toast ────────────────────────────────────────────────────────────

function SuccessToast({ total, onDismiss }) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#dcf7ea] border border-[#48c185] rounded-[16px] px-5 py-4 shadow-lg" style={{ minWidth: 360 }}>
      <div className="w-9 h-9 bg-[#48c185] rounded-full flex items-center justify-center shrink-0">
        <CheckIcon />
      </div>
      <div className="flex flex-col flex-1">
        <p className="text-[16px] font-semibold text-[#286b4a] leading-[1.5]">Thanh toán thành công!</p>
        <p className="text-[14px] text-[#286b4a] leading-[1.5]">Tổng: {total.toLocaleString('vi-VN')} đ</p>
      </div>
      <button onClick={onDismiss} className="text-[#286b4a] hover:text-[#1a4a30] transition-colors">
        <XIcon />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABLE_FILTERS = [
  { id: 'all',   label: 'Tất cả' },
  { id: 'used',  label: 'Sử dụng' },
  { id: 'empty', label: 'Còn trống' },
]

export default function OrdersPage() {
  const [tab, setTab]             = useState('menu')
  const [floor, setFloor]         = useState(0)
  const [tableFilter, setFilter]  = useState('all')
  const [menuItems, setMenuItems] = useState(MENU_ITEMS)
  const [tables, setTables]       = useState(TABLES)
  const [orderItems, setOrderItems] = useState(ORDER_ITEMS)
  const [search, setSearch]       = useState('')
  const [noteModal, setNoteModal] = useState({ open: false, itemId: null, text: '' })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [successTotal, setSuccessTotal] = useState(null)

  useEffect(() => {
    if (successTotal !== null) {
      const t = setTimeout(() => setSuccessTotal(null), 3500)
      return () => clearTimeout(t)
    }
  }, [successTotal])

  const selectedTable = tables.find(t => t.selected) ?? null

  function handleQtyChange(id, delta) {
    setMenuItems(items =>
      items.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
    )
  }

  function handleTableSelect(id) {
    setTables(ts => ts.map(t => ({ ...t, selected: t.id === id })))
  }

  function handleStatusChange(id, status) {
    setOrderItems(items => items.map(i => i.id === id ? { ...i, status } : i))
  }

  function handleOpenNote(itemId, currentText) {
    setNoteModal({ open: true, itemId, text: currentText })
  }

  function handleConfirmNote(itemId, text) {
    setOrderItems(items => items.map(i => i.id === itemId ? { ...i, notes: text } : i))
    setNoteModal({ open: false, itemId: null, text: '' })
  }

  function handleCancelNote() {
    setNoteModal({ open: false, itemId: null, text: '' })
  }

  function handleCreateOrder() {
    // Switch to Menu tab to add items for the newly selected empty table
    setTab('menu')
  }

  const filteredMenu = search
    ? menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : menuItems

  const tableCounts = {
    all:   tables.length,
    used:  tables.filter(t => t.occupied).length,
    empty: tables.filter(t => !t.occupied).length,
  }

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] overflow-hidden">
      <Header />

      <div className="flex flex-1 gap-3 lg:gap-4 p-3 lg:p-4 overflow-hidden">
        {/* ── Left panel ── */}
        <div className="flex flex-col flex-1 gap-2.5 min-w-0 overflow-hidden">

          {/* ROW 1 (table view only): floor tabs LEFT + status filters RIGHT */}
          {tab === 'table' && (
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 min-h-[38px]">
              {/* Floor tabs */}
              <div className="flex gap-2">
                {['Tầng 1', 'Tầng 2', 'Tầng 3'].map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setFloor(i)}
                    className={`px-4 py-1.5 rounded-[8px] border border-[#e8e8e8] text-[14px] transition-colors ${
                      floor === i
                        ? 'bg-white text-[#37383a]'
                        : 'bg-[#f5f5f5] text-[#797b7c] hover:bg-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {/* Status filters */}
              <div className="flex items-center gap-5">
                {TABLE_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="flex items-center gap-2 text-[14px]"
                  >
                    <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 ${
                      tableFilter === f.id ? 'border-[#025cca]' : 'border-[#37383a]'
                    }`}>
                      {tableFilter === f.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#025cca]" />
                      )}
                    </div>
                    <span className="text-black">
                      {f.label} ({tableCounts[f.id]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ROW 2: tab switcher + search */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex h-[52px] rounded-[12px] overflow-hidden border-2 border-[#e8e8e8]">
              {[['table','Phòng bàn'],['menu','Menu']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setSearch('') }}
                  className={`flex-1 min-w-[120px] text-[18px] lg:text-[20px] transition-colors ${
                    tab === id
                      ? 'bg-[#dceefe] text-[#025cca] font-semibold'
                      : 'bg-[#f5f5f5] text-[#636566] font-medium'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 bg-white rounded-[12px] px-4 h-[44px] w-[160px] md:w-[220px] lg:w-[340px]">
              <SearchIcon className="w-5 h-5 text-[#797b7c] shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === 'menu' ? 'Tìm món' : 'Tìm bàn'}
                className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
              />
            </div>
          </div>

          {/* ROW 3: title + notification */}
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-[24px] font-semibold text-[#202325]">
              {tab === 'menu' ? 'Chọn món' : 'Chọn bàn'}
            </h2>
            <div className="bg-white flex items-center gap-1.5 px-2 py-1 rounded-[16px]">
              <BellIcon />
              <span className="text-[14px] font-medium">1 lượt gọi món</span>
            </div>
          </div>

          {/* ROW 4: content */}
          <div className="flex flex-col flex-1 gap-2.5 overflow-hidden">
            {tab === 'menu' ? (
              <MenuView items={filteredMenu} onQtyChange={handleQtyChange} />
            ) : (
              <TableView
                tables={tables}
                onSelect={handleTableSelect}
                filter={tableFilter}
              />
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <OrderPanel
          items={orderItems}
          onStatusChange={handleStatusChange}
          onCheckout={() => setPaymentOpen(true)}
          onCreateOrder={handleCreateOrder}
          onNote={handleOpenNote}
          selectedTable={selectedTable}
        />
      </div>

      <BottomNav active="orders" />

      {/* Payment Modal */}
      {paymentOpen && (
        <PaymentModal
          items={orderItems}
          table={selectedTable}
          onClose={() => setPaymentOpen(false)}
          onConfirm={() => {
            const sub = orderItems.reduce((s, i) => s + i.price * i.qty, 0)
            setSuccessTotal(sub + Math.round(sub * VAT_RATE))
            setPaymentOpen(false)
          }}
        />
      )}

      {/* Success Toast */}
      {successTotal !== null && (
        <SuccessToast total={successTotal} onDismiss={() => setSuccessTotal(null)} />
      )}

      {/* Add Note Modal */}
      {noteModal.open && (
        <AddNoteModal
          itemId={noteModal.itemId}
          initialText={noteModal.text}
          onConfirm={handleConfirmNote}
          onCancel={handleCancelNote}
        />
      )}
    </div>
  )
}
