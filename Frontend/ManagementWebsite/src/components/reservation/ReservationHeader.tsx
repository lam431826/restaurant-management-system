type Tab = 'calendar' | 'list'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
}

const ReservationHeader = ({ tab, onTab }: Props) => {
  const tabCls = (active: boolean) =>
    [
      'h-9 px-5 rounded-t-md text-md font-semibold cursor-pointer transition-colors',
      active ? 'bg-card text-primary' : 'bg-transparent text-white/90 hover:bg-white/10',
    ].join(' ')

  return (
    <header className="shrink-0 bg-[#3a4a8c] text-white flex items-stretch h-14 pl-5 pr-4">
      {/* Title */}
      <div className="flex items-center w-[19rem] shrink-0">
        <span className="text-lg font-bold">Đặt bàn</span>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-1 pb-0">
        <button className={tabCls(tab === 'calendar')} onClick={() => onTab('calendar')}>Theo lịch</button>
        <button className={tabCls(tab === 'list')} onClick={() => onTab('list')}>Theo danh sách</button>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-4 ml-auto text-white">
        <button className="flex items-center gap-1.5 text-md hover:opacity-90 cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          Chi nhánh trung tâm
        </button>
        <button className="hover:opacity-90 cursor-pointer" aria-label="Thiết lập">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button className="w-6 h-6 rounded-full border border-white/70 flex items-center justify-center text-sm hover:opacity-90 cursor-pointer" aria-label="Thông tin">i</button>
        <span className="text-md font-semibold">0975919813</span>
        <button className="hover:opacity-90 cursor-pointer" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default ReservationHeader
export type { Tab as ReservationTab }
