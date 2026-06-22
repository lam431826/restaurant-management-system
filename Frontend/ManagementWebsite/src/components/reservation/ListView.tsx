import { useMemo, useState } from 'react'
import type { Reservation, ReservationStatus } from '../../data/mockData'
import { reservationStatusMeta } from '../../data/mockData'

interface Props {
  reservations: Reservation[]
  onConfirm: (id: string) => Promise<void>
  onCheckIn: (id: string) => Promise<void>
  onNoShow: (id: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
}

const Chevron = ({ open = true }: { open?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`text-ink-muted transition-transform ${open ? '' : '-rotate-90'}`}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-line pb-3">
      <button className="flex items-center justify-between w-full text-md font-semibold text-ink cursor-pointer py-1" onClick={() => setOpen(o => !o)}>
        {title} <Chevron open={open} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

const LIST_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED']

const StatusCheck = ({ status, checked, onChange }: { status: ReservationStatus; checked: boolean; onChange: () => void }) => {
  const meta = reservationStatusMeta[status]
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={onChange} className="absolute opacity-0 w-0 h-0" />
      <span
        className="w-[1.7rem] h-[1.7rem] rounded-xxs border-2 flex items-center justify-center transition-colors"
        style={{ borderColor: meta.color, background: checked ? meta.color : 'transparent' }}
      >
        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </span>
      <span className="text-md text-ink">{meta.label}</span>
    </label>
  )
}

const fieldCls = 'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary'
const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle'

const ListView = ({ reservations, onConfirm, onCheckIn, onNoShow, onCancel }: Props) => {
  const [code, setCode] = useState('')
  const [timeMode, setTimeMode] = useState<'all' | 'other'>('all')
  const [statuses, setStatuses] = useState<Set<ReservationStatus>>(new Set(['PENDING', 'CONFIRMED', 'CHECKED_IN']))
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const toggleStatus = (s: ReservationStatus) =>
    setStatuses(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })

  const filtered = useMemo(() => {
    const q = code.trim().toLowerCase()
    return reservations.filter(r => {
      if (!statuses.has(r.status)) return false
      if (q && !r.customer.toLowerCase().includes(q) && !r.phone.includes(q) && !r.id.toLowerCase().includes(q)) return false
      return true
    })
  }, [reservations, statuses, code])

  const totalGuests = filtered.reduce((s, r) => s + r.guests, 0)

  const act = async (fn: () => Promise<void>, id: string) => {
    setActionLoading(id)
    try { await fn() } finally { setActionLoading(null) }
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-[24rem] shrink-0 flex flex-col border-r border-line bg-card overflow-y-auto p-4 gap-3">
        <Section title="Tìm kiếm">
          <div className="relative flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 text-ink-muted pointer-events-none">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input className={`${fieldCls} pl-9`} placeholder="Tên khách / SĐT / mã đặt bàn" value={code} onChange={e => setCode(e.target.value)} />
          </div>
        </Section>

        <Section title="Thời gian đặt">
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between">
              <span className="kv-radio">
                <input type="radio" name="res-time" checked={timeMode === 'all'} onChange={() => setTimeMode('all')} />
                <span className="kv-radio-dot" /><span className="kv-radio-text">Toàn thời gian</span>
              </span>
              <CalendarIcon />
            </label>
            <label className="flex items-center justify-between">
              <span className="kv-radio">
                <input type="radio" name="res-time" checked={timeMode === 'other'} onChange={() => setTimeMode('other')} />
                <span className="kv-radio-dot" /><span className="kv-radio-text">Lựa chọn khác</span>
              </span>
              <CalendarIcon />
            </label>
          </div>
        </Section>

        <div className="flex items-center justify-between pt-1">
          <span className="text-md font-semibold text-ink">Số bản ghi:</span>
          <span className="text-md text-ink">{filtered.length}</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Status filters */}
        <div className="flex items-center gap-6 px-5 py-3 flex-wrap">
          {LIST_STATUSES.map(s => (
            <StatusCheck key={s} status={s} checked={statuses.has(s)} onChange={() => toggleStatus(s)} />
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-[10rem]`}>Mã đặt bàn</th>
                <th className={`${th} w-[16rem]`}>Giờ đến</th>
                <th className={th}>Khách hàng</th>
                <th className={`${th} w-[14rem]`}>Điện thoại</th>
                <th className={`${th} text-right w-[9rem]`}>Số khách</th>
                <th className={`${th} w-[13rem]`}>Trạng thái</th>
                <th className={`${th} w-[10rem]`}>Ghi chú</th>
                <th className={`${th} w-[20rem]`}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {/* Summary row */}
              <tr className="bg-[var(--kv-warning-50)] border-b border-line">
                <td className={td} colSpan={4} />
                <td className={`${td} text-right font-bold`}>{totalGuests}</td>
                <td className={td} colSpan={3} />
              </tr>

              {filtered.map(r => {
                const meta = reservationStatusMeta[r.status]
                const busy = actionLoading === r.id
                return (
                  <tr key={r.id} className="hover:bg-primary-25">
                    <td className={`${td} font-mono text-[12px] text-primary`}>{r.id.slice(0, 8).toUpperCase()}</td>
                    <td className={td}>{r.arriveTime}</td>
                    <td className={`${td} font-medium`}>{r.customer}</td>
                    <td className={td}>{r.phone}</td>
                    <td className={`${td} text-right`}>{r.guests}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </td>
                    <td className={`${td} text-ink-muted max-w-[10rem] truncate`}>{r.note}</td>
                    <td className={td}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              disabled={busy}
                              onClick={() => act(() => onConfirm(r.id), r.id)}
                              className="h-7 px-2.5 text-[12px] font-semibold rounded-md bg-[var(--kv-success)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                            >
                              Xác nhận
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => act(() => onCancel(r.id), r.id)}
                              className="h-7 px-2.5 text-[12px] font-semibold rounded-md border border-danger text-danger hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                            >
                              Hủy
                            </button>
                          </>
                        )}
                        {r.status === 'CONFIRMED' && (
                          <>
                            <button
                              disabled={busy}
                              onClick={() => act(() => onCheckIn(r.id), r.id)}
                              className="h-7 px-2.5 text-[12px] font-semibold rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                            >
                              Check-in
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => act(() => onNoShow(r.id), r.id)}
                              className="h-7 px-2.5 text-[12px] font-semibold rounded-md border border-line-default text-ink-subtle hover:bg-fill disabled:opacity-50 cursor-pointer"
                            >
                              Không đến
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => act(() => onCancel(r.id), r.id)}
                              className="h-7 px-2.5 text-[12px] font-semibold rounded-md border border-danger text-danger hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                            >
                              Hủy
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td className={`${td} text-center text-ink-muted`} colSpan={8}>Không có phiếu đặt nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ListView
