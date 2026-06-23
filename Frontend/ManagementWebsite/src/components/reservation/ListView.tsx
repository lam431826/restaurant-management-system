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

/* ── Icons ────────────────────────────────────────────────────────────────── */
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

/* ── Detail panel info item ───────────────────────────────────────────────── */
const DItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-xs text-ink-muted font-medium">{label}</span>
    <span className="text-md text-ink font-medium truncate">{value}</span>
  </div>
)

/* ── Sidebar collapsible section ─────────────────────────────────────────── */
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

/* ── Status filter chips ──────────────────────────────────────────────────── */
const ACTIVE_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED']
const TERMINAL_STATUSES: ReservationStatus[] = ['CHECKED_IN', 'CANCELLED', 'NO_SHOW']

const StatusChip = ({ status, checked, onChange }: { status: ReservationStatus; checked: boolean; onChange: () => void }) => {
  const meta = reservationStatusMeta[status]
  return (
    <button
      onClick={onChange}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[12px] font-medium transition-colors cursor-pointer select-none"
      style={checked
        ? { background: meta.color + '20', borderColor: meta.color, color: meta.color }
        : { background: 'transparent', borderColor: 'var(--kv-line-default)', color: 'var(--kv-ink-muted)' }
      }
    >
      <span className="w-2 h-2 rounded-full" style={{ background: checked ? meta.color : 'var(--kv-ink-muted)' }} />
      {meta.label}
    </button>
  )
}

/* ── Table cell styles ────────────────────────────────────────────────────── */
const fieldCls = 'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary'
const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-2.5 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-2.5 border-b border-line align-middle'

/* ── Inline action buttons per row ───────────────────────────────────────── */
const ActionButtons = ({ r, busy, onConfirm, onCheckIn, onNoShow, onCancel }: {
  r: Reservation
  busy: boolean
  onConfirm: () => void
  onCheckIn: () => void
  onNoShow: () => void
  onCancel: () => void
}) => {
  if (r.status === 'PENDING') return (
    <div className="flex items-center gap-1.5">
      <button disabled={busy} onClick={onConfirm}
        className="h-7 px-2.5 text-[12px] font-semibold rounded-md bg-[var(--kv-success)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer whitespace-nowrap">
        Xác nhận
      </button>
      <button disabled={busy} onClick={onCancel}
        className="h-7 px-2 text-[12px] font-semibold rounded-md border border-danger text-danger hover:bg-red-50 disabled:opacity-50 cursor-pointer whitespace-nowrap">
        Hủy
      </button>
    </div>
  )

  if (r.status === 'CONFIRMED') return (
    <div className="flex items-center gap-1.5">
      <button disabled={busy} onClick={onCheckIn}
        className="h-7 px-2.5 text-[12px] font-semibold rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer whitespace-nowrap">
        Check-in
      </button>
      <button disabled={busy} onClick={onNoShow}
        className="h-7 px-2 text-[12px] font-semibold rounded-md border border-line-strong text-ink-muted hover:bg-fill disabled:opacity-50 cursor-pointer whitespace-nowrap">
        Không đến
      </button>
      <button disabled={busy} onClick={onCancel}
        className="h-7 px-2 text-[12px] font-semibold rounded-md border border-danger text-danger hover:bg-red-50 disabled:opacity-50 cursor-pointer whitespace-nowrap">
        Hủy
      </button>
    </div>
  )

  return <span className="text-ink-muted text-[12px]">—</span>
}

/* ── Main component ───────────────────────────────────────────────────────── */
const ListView = ({ reservations, onConfirm, onCheckIn, onNoShow, onCancel }: Props) => {
  const [code, setCode] = useState('')
  const [timeMode, setTimeMode] = useState<'all' | 'other'>('all')
  const [statuses, setStatuses] = useState<Set<ReservationStatus>>(new Set(['PENDING', 'CONFIRMED']))
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [detail, setDetail] = useState<Reservation | null>(null)

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
    try {
      await fn()
      setDetail(prev => (prev?.id === id ? null : prev))
    } finally {
      setActionLoading(null)
    }
  }

  const displayedDetail = detail ? (reservations.find(r => r.id === detail.id) ?? null) : null

  const closeDetail = () => setDetail(null)
  const actDetail = (fn: (id: string) => Promise<void>) => {
    if (displayedDetail) act(() => fn(displayedDetail.id), displayedDetail.id)
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-[22rem] shrink-0 flex flex-col border-r border-line bg-card overflow-y-auto p-4 gap-3">
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
          <span className="text-md font-semibold text-ink">Tổng số bản ghi:</span>
          <span className="text-md text-ink">{filtered.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-md font-semibold text-ink">Tổng số khách:</span>
          <span className="text-md text-ink">{totalGuests}</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Status filter bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line flex-wrap bg-card shrink-0">
          <span className="text-[12px] text-ink-muted font-medium mr-1">Trạng thái:</span>
          {ACTIVE_STATUSES.map(s => (
            <StatusChip key={s} status={s} checked={statuses.has(s)} onChange={() => toggleStatus(s)} />
          ))}
          <span className="w-px h-5 bg-line mx-1" />
          {TERMINAL_STATUSES.map(s => (
            <StatusChip key={s} status={s} checked={statuses.has(s)} onChange={() => toggleStatus(s)} />
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-[9rem]`}>Mã</th>
                <th className={`${th} w-[14rem]`}>Giờ đến</th>
                <th className={th}>Khách hàng</th>
                <th className={`${th} w-[12rem]`}>Điện thoại</th>
                <th className={`${th} w-[9rem]`}>Email</th>
                <th className={`${th} text-center w-[7rem]`}>Số khách</th>
                <th className={`${th} w-[12rem]`}>Trạng thái</th>
                <th className={`${th} w-[18rem]`}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const meta = reservationStatusMeta[r.status]
                const busy = actionLoading === r.id
                const isSelected = displayedDetail?.id === r.id
                return (
                  <tr key={r.id}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary-50' : 'hover:bg-primary-25'}`}
                    onClick={() => setDetail(prev => prev?.id === r.id ? null : r)}>
                    <td className={`${td} font-mono text-[12px] text-primary font-semibold`}>
                      #{r.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className={td}>{r.arriveTime}</td>
                    <td className={`${td} font-medium`}>{r.customer}</td>
                    <td className={td}>{r.phone}</td>
                    <td className={`${td} max-w-[9rem]`}>
                      {r.guestEmail
                        ? <span className="truncate block text-[12px] text-ink-muted" title={r.guestEmail}>{r.guestEmail}</span>
                        : <span className="text-ink-muted">—</span>
                      }
                    </td>
                    <td className={`${td} text-center`}>{r.guests}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                        <span className="text-[12px]">{meta.label}</span>
                      </span>
                    </td>
                    <td className={td} onClick={e => e.stopPropagation()}>
                      <ActionButtons r={r} busy={busy}
                        onConfirm={() => act(() => onConfirm(r.id), r.id)}
                        onCheckIn={() => act(() => onCheckIn(r.id), r.id)}
                        onNoShow={() => act(() => onNoShow(r.id), r.id)}
                        onCancel={() => act(() => onCancel(r.id), r.id)} />
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td className={`${td} text-center text-ink-muted py-10`} colSpan={8}>
                    Không có phiếu đặt bàn nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Detail panel — mở rộng xuống dưới ────────────────────────────── */}
        {displayedDetail && (() => {
          const r = displayedDetail
          const meta = reservationStatusMeta[r.status]
          const s = r.status
          const busy = actionLoading === r.id
          const canAct = s === 'PENDING' || s === 'CONFIRMED'
          return (
            <div className="shrink-0 border-t-[3px] bg-card" style={{ borderColor: meta.color }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-line">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-md font-bold text-ink truncate">{r.customer}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: meta.color, background: `${meta.color}22` }}
                  >{meta.label}</span>
                  <span className="font-mono text-xs text-primary font-semibold shrink-0">#{r.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-md text-ink-muted shrink-0">{r.phone}</span>
                  {r.guestEmail && (
                    <a href={`mailto:${r.guestEmail}`} onClick={e => e.stopPropagation()}
                      className="text-md text-primary hover:underline shrink-0 truncate max-w-[14rem]">
                      {r.guestEmail}
                    </a>
                  )}
                </div>
                <button
                  onClick={closeDetail}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-fill cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex items-start gap-8 px-5 py-3">
                <div className="grid grid-cols-4 gap-x-8 gap-y-3 flex-1 min-w-0">
                  <DItem label="Giờ đến" value={r.arriveTime} />
                  <DItem label="Số khách" value={`${r.guests} người`} />
                  <DItem label="Bàn" value={
                    r.table !== '—'
                      ? r.table
                      : <span className="text-ink-muted font-normal">Chưa xếp bàn</span>
                  } />
                  {r.area
                    ? <DItem label="Khu vực" value={r.area} />
                    : <div />
                  }
                  {r.note && (
                    <div className="col-span-4 flex flex-col gap-0.5">
                      <span className="text-xs text-ink-muted font-medium">Ghi chú</span>
                      <span className="text-md text-ink">{r.note}</span>
                    </div>
                  )}
                </div>

                {canAct && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {s === 'PENDING' && (
                      <button disabled={busy} onClick={() => actDetail(onConfirm)}
                        className="kv-btn kv-btn-primary h-9 text-sm min-w-[7rem] disabled:opacity-50">
                        Xác nhận
                      </button>
                    )}
                    {s === 'CONFIRMED' && (
                      <button disabled={busy} onClick={() => actDetail(onCheckIn)}
                        className="kv-btn kv-btn-primary h-9 text-sm min-w-[7rem] disabled:opacity-50">
                        Check-in
                      </button>
                    )}
                    {s === 'CONFIRMED' && (
                      <button disabled={busy} onClick={() => actDetail(onNoShow)}
                        className="kv-btn kv-btn-outline-neutral h-9 text-sm min-w-[7rem] disabled:opacity-50">
                        Không đến
                      </button>
                    )}
                    <button disabled={busy}
                      onClick={() => actDetail(onCancel)}
                      className="kv-btn h-9 text-sm min-w-[7rem] disabled:opacity-50"
                      style={{ borderColor: 'var(--kv-danger)', color: 'var(--kv-danger)' }}
                    >
                      Hủy đặt bàn
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default ListView
