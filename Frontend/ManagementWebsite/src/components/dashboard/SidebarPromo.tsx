import { promoLinks } from '../../data/mockData'

const ICON_BG: Record<string, string> = {
  green: 'bg-success-50 text-success',
  blue: 'bg-primary-50 text-primary',
  gold: 'bg-warning-50 text-warning',
}

const iconWrap = (color: string) =>
  `w-[3.6rem] h-[3.6rem] rounded-md flex items-center justify-center shrink-0 ${ICON_BG[color]}`

const PromoIcon = ({ type }: { type: string }) => {
  if (type === 'delivery')
    return (
      <span className={iconWrap('green')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5.5" cy="17.5" r="2.5" /><circle cx="18.5" cy="17.5" r="2.5" />
          <path d="M8 17.5h8M5.5 15V9h7l3 4.5M12 9V6h3" />
        </svg>
      </span>
    )
  if (type === 'payment')
    return (
      <span className={iconWrap('blue')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
        </svg>
      </span>
    )
  return (
    <span className={iconWrap('gold')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5a2.5 2 0 0 1 5 0c0 1.5-2.5 1.5-2.5 2.5M9.5 14.5a2.5 2 0 0 0 5 0" />
      </svg>
    </span>
  )
}

const SidebarPromo = () => (
  <div className="flex flex-col gap-3">
    <ul className="flex flex-col gap-1 bg-card border border-line rounded-lg p-2 list-none m-0">
      {promoLinks.map(p => (
        <li key={p.id}>
          <a href="#" className="flex items-center gap-3 p-2 rounded-md transition-colors no-underline hover:bg-fill">
            <PromoIcon type={p.icon} />
            <div className="flex-1 min-w-0 flex flex-col gap-[0.1rem]">
              <span className="text-md font-semibold text-ink">{p.title}</span>
              <span className="text-xs text-ink-subtle overflow-hidden text-ellipsis whitespace-nowrap">{p.subtitle}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </li>
      ))}
    </ul>

    <a
      href="#"
      className="relative flex items-center justify-between gap-2 px-4 py-3 rounded-lg overflow-hidden no-underline bg-[linear-gradient(110deg,#fff4e6_0%,#ffe0c2_100%)]"
    >
      <div className="flex flex-col gap-1">
        <div className="flex">
          <img src="/assets/wasabi-logo.svg" alt="Wasabi" className="h-[2.2rem] w-auto" />
        </div>
        <div className="flex flex-col leading-[1.2]">
          <strong className="text-lg font-extrabold text-warning-700">Miễn phí</strong>
          <span className="text-md font-bold text-ink">10 đơn đầu tiên</span>
          <small className="text-xs text-ink-subtle">Tối đa 30k/đơn hàng</small>
        </div>
        <span className="mt-1 self-start text-xs font-semibold text-white bg-warning rounded-full px-3 py-[0.3rem]">Lên đơn ngay</span>
      </div>
      <span className="text-[4rem] shrink-0">🛵</span>
    </a>
  </div>
)

export default SidebarPromo
