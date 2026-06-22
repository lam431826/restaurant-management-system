import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconFileText,
  IconChevronDown,
  IconBell,
  IconCircleHelp,
  IconCalendar,
  IconConciergeBell,
} from '../common/Icon'
import { helpLinks, cashierModes } from '../../data/mockData'

type DropdownName = 'cashier' | 'notifications' | 'help' | 'user' | null

const listItem =
  'flex items-center gap-3 px-5 py-2 text-md text-ink cursor-pointer min-h-[3.6rem] no-underline transition-colors hover:bg-[var(--kv-state-hover-bg)] hover:text-primary'

const menuRow =
  'flex items-center justify-between px-5 py-2 min-h-[3.6rem] text-md cursor-pointer text-ink transition-colors hover:bg-[var(--kv-state-hover-bg)]'

const ActionArea = () => {
  const [open, setOpen] = useState<DropdownName>(null)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const selectCashierMode = (id: number) => {
    setOpen(null)
    if (id === 12) navigate('/waiter') // Lễ tân
    else if (id === 11) window.alert('Màn hình Nhà bếp đang được phát triển')
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (name: DropdownName) => setOpen(prev => (prev === name ? null : name))

  const cashierIcon = (icon: string) =>
    icon === 'ik-calendar-day' ? <IconCalendar size={16} /> : <IconConciergeBell size={16} />

  return (
    <div className="flex items-center gap-2" ref={ref}>
      {/* ── Thu ngân button group ── */}
      <div className="relative flex items-center">
        <div className="kv-btn-group">
          <button
            className="kv-btn kv-btn-outline-primary"
            onClick={() => { setOpen(null); navigate('/cashier') }}
          >
            <IconFileText size={15} />
            Thu ngân
          </button>
          <button
            className="kv-btn kv-btn-outline-primary"
            onClick={() => toggle('cashier')}
            aria-expanded={open === 'cashier'}
          >
            <IconChevronDown size={14} />
          </button>
        </div>

        {open === 'cashier' && (
          <div className="kv-float-container min-w-[15rem]">
            <ul className="list-none m-0 py-1">
              {cashierModes.map(m => (
                <li key={m.id}>
                  <button type="button" className={`${listItem} w-full bg-transparent border-none text-left`} onClick={() => selectCashierMode(m.id)}>
                    {cashierIcon(m.icon)}
                    <span>{m.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Notification bell ── */}
      <div className="relative flex items-center">
        <button
          className="kv-btn kv-btn-icon-only kv-btn-outline-primary"
          onClick={() => toggle('notifications')}
          aria-label="Hộp thư đến"
          aria-expanded={open === 'notifications'}
        >
          <IconBell size={16} />
        </button>

        {open === 'notifications' && (
          <div className="kv-float-container w-[36rem] max-h-[58rem] overflow-hidden flex flex-col p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h6 className="text-xl font-bold m-0">Hộp thư đến</h6>
            </div>
            <div className="flex px-5 gap-4 border-b border-line">
              <span className="py-3 text-md text-primary font-semibold border-b-2 border-primary cursor-pointer">
                Tất cả
              </span>
              <span className="py-3 text-md text-ink-subtle border-b-2 border-transparent cursor-pointer hover:text-ink">
                Ưu đãi
              </span>
              <span className="py-3 text-md text-ink-subtle border-b-2 border-transparent cursor-pointer hover:text-ink">
                Cập nhật
              </span>
            </div>
            <div className="flex items-center justify-center px-5 py-12 text-md text-ink-muted">
              Không có thông báo
            </div>
          </div>
        )}
      </div>

      {/* ── Help ── */}
      <div className="relative flex items-center">
        <button
          className="kv-btn kv-btn-icon-only kv-btn-outline-primary"
          onClick={() => toggle('help')}
          aria-label="Hướng dẫn"
          aria-expanded={open === 'help'}
        >
          <IconCircleHelp size={16} />
        </button>

        {open === 'help' && (
          <div className="kv-float-container min-w-[21.5rem]">
            <ul className="list-none m-0 py-1">
              {helpLinks.map((link, i) => (
                <li key={i}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className={listItem}>
                    {link.img ? (
                      <img src={link.img} alt="" className="w-[1.8rem] h-[1.8rem] object-contain shrink-0" />
                    ) : (
                      <IconCircleHelp size={16} color="var(--kv-primary)" />
                    )}
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── User / Avatar ── */}
      <div className="relative flex items-center">
        <button
          className="bg-none border-none p-0 cursor-pointer rounded-full flex items-center"
          onClick={() => toggle('user')}
          aria-label="Tài khoản"
          aria-expanded={open === 'user'}
        >
          <div className="kv-avatar kv-avatar-md">
            <img src="/assets/avatar-empty.svg" alt="" className="kv-avatar-image" />
          </div>
        </button>

        {open === 'user' && (
          <div className="kv-float-container w-[26rem]">
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="kv-avatar kv-avatar-md">
                <img src="/assets/avatar-empty.svg" alt="" className="kv-avatar-image" />
              </div>
              <div>
                <div className="text-md font-semibold text-ink">Nguyen Duc Anh</div>
                <div className="text-sm text-ink-muted mt-0.5">Chưa bật xác thực 2 lớp</div>
              </div>
            </div>

            <div className="h-px bg-line my-1" />

            <div className={menuRow}>
              <div>
                <div>Hồ sơ cửa hàng</div>
                <div className="text-sm text-ink-muted">restaurant101</div>
              </div>
            </div>

            <div className={menuRow}>
              <div>
                <div>Chi nhánh</div>
                <div className="text-sm text-ink-muted">Chi nhánh trung tâm</div>
              </div>
            </div>

            <div className="h-px bg-line my-1" />

            <div className={menuRow}>
              <span>Chủ đề</span>
            </div>

            <div className={menuRow}>
              <span>Ngôn ngữ</span>
              <div className="flex items-center gap-2">
                <img src="/assets/flagsquare-vn.svg" alt="Vietnamese" className="w-5 h-5 rounded-xxs object-cover inline-block" />
                <span>Tiếng Việt</span>
              </div>
            </div>

            <div className="h-px bg-line my-1" />

            <div className={`${menuRow} text-danger hover:!bg-[var(--kv-action-danger-faded-bg)]`}>
              Đăng xuất
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActionArea
