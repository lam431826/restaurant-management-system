import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NotificationLogDto } from '../../api/notifications'

type Tab = 'calendar' | 'list'

const TEMPLATE_LABELS: Record<string, string> = {
  RESERVATION_CONFIRMATION: 'Xác nhận đặt bàn',
  RESERVATION_CANCELLATION: 'Hủy đặt bàn',
  RESERVATION_REMINDER: 'Nhắc lịch đặt bàn',
  RESERVATION_PENDING: 'Đặt bàn chờ duyệt',
  RESERVATION_TABLE_UPDATE: 'Cập nhật bàn ngồi',
  PAYMENT_CONFIRMATION: 'Xác nhận thanh toán',
  MANUAL: 'Thủ công',
}

const timeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Vừa xong'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  onLogout?: () => void
  onChangePassword?: () => void
  notifLogs?: NotificationLogDto[]
  notifLoading?: boolean
  bellOpen?: boolean
  onBellToggle?: () => void
}

const ReservationHeader = ({ tab, onTab, onLogout, onChangePassword, notifLogs = [], notifLoading = false, bellOpen = false, onBellToggle }: Props) => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node) && bellOpen) onBellToggle?.()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bellOpen, onBellToggle])

  const tabCls = (active: boolean) =>
    [
      'h-9 px-5 rounded-t-md text-md font-semibold cursor-pointer transition-colors',
      active ? 'bg-card text-primary' : 'bg-transparent text-white/90 hover:bg-white/10',
    ].join(' ')

  const failedCount = notifLogs.filter(n => n.status === 'FAILED').length

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

        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <div className="relative inline-flex">
            <button
              onClick={onBellToggle}
              className="hover:opacity-90 cursor-pointer w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
              aria-label="Thông báo email"
              aria-expanded={bellOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            {failedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 bg-red-400 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5 pointer-events-none">
                {failedCount > 9 ? '9+' : failedCount}
              </span>
            )}
          </div>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-[10px] shadow-lg border border-[#e8e8e8] w-[36rem] z-50 flex flex-col overflow-hidden max-h-[50rem]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8]">
                <span className="text-[15px] font-bold text-[#202325]">Kết quả gửi email thông báo</span>
              </div>

              <div className="overflow-y-auto flex-1">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-10 text-[14px] text-[#797b7c]">Đang tải...</div>
                ) : notifLogs.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-[14px] text-[#797b7c]">Chưa có thông báo nào</div>
                ) : notifLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#e8e8e8] last:border-b-0 hover:bg-[#f9fafb]">
                    <div className="text-[1.3rem] mt-0.5 shrink-0">📧</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-[#202325]">
                          {TEMPLATE_LABELS[log.template] ?? log.template}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                            log.status === 'SENT'   ? 'bg-green-500 text-white' :
                            log.status === 'FAILED' ? 'bg-red-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}
                          title={log.status === 'SENT' ? 'Server đã chấp nhận — không đảm bảo vào hòm thư (có thể bị bounce hoặc vào thư rác)' : undefined}
                        >
                          {log.status === 'SENT' ? 'Đã gửi đi' : log.status === 'FAILED' ? 'Thất bại' : 'Đang gửi'}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#636566] mt-0.5 truncate">{log.recipient}</div>
                      {log.status === 'FAILED' && log.errorMessage && (
                        <div className="text-[11px] text-red-400 mt-0.5 truncate">{log.errorMessage}</div>
                      )}
                      <div className="text-[11px] text-[#797b7c] mt-0.5">{log.sentAt ? timeAgo(log.sentAt) : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-[#e8e8e8] bg-[#f9fafb]">
                <p className="text-[11px] text-[#979899] leading-relaxed">
                  * "Đã gửi đi" = server nhận thư thành công. Email vẫn có thể bị bounce hoặc vào thư rác nếu địa chỉ không hợp lệ.
                </p>
              </div>
            </div>
          )}
        </div>

        <button className="hover:opacity-90 cursor-pointer" aria-label="Thiết lập">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button className="w-6 h-6 rounded-full border border-white/70 flex items-center justify-center text-sm hover:opacity-90 cursor-pointer" aria-label="Thông tin">i</button>
        <span className="text-md font-semibold">0975919813</span>

        {/* Hamburger + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="hover:opacity-90 cursor-pointer"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-[10px] shadow-lg border border-[#e8e8e8] w-[180px] py-1 z-50">
              <button
                onClick={() => { setMenuOpen(false); navigate('/my-schedule') }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors text-left"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Lịch làm việc của tôi
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button
                onClick={() => { setMenuOpen(false); onChangePassword?.() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors text-left"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Đổi mật khẩu
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button
                onClick={() => { setMenuOpen(false); onLogout?.() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default ReservationHeader
export type { Tab as ReservationTab }
