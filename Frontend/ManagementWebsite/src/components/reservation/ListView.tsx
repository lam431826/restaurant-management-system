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
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.4 19.79 19.79 0 0 1 1.61 3.84 2 2 0 0 1 3.6 1.66h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.31a16 16 0 0 0 6.22 6.22l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)
const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
)
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const GuestsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="10" rx="2" /><line x1="12" y1="13" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" />
  </svg>
)
const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

/* ── Detail panel ─────────────────────────────────────────────────────────── */
const DetailPanel = ({ reservation, onClose, onConfirm, onCheckIn, onNoShow, onCancel, actionLoading }: {
  reservation: Reservation
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
  onCheckIn: (id: string) => Promise<void>
  onNoShow: (id: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
  actionLoading: string | null
}) => {
  const r = reservation
  const meta = reservationStatusMeta[r.status]
  const busy = actionLoading === r.id

  return (
    <aside className="w-[22rem] shrink-0 border-l border-line bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-line shrink-0 gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-mono text-primary font-semibold tracking-wide mb-1">
            #{r.id.slice(0, 8).toUpperCase()}
          </p>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold"
            style={{ background: meta.color + '22', color: meta.color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-ink transition-colors cursor-pointer shrink-0 mt-0.5">
          <CloseIcon />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Guest info section */}
        <div className="px-4 py-3 border-b border-line">
          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">Thông tin khách</p>
          <div className="flex flex-col gap-2.5">
            <InfoRow icon={<UserIcon />} label="Họ tên" value={r.customer} />
            <InfoRow icon={<PhoneIcon />} label="Điện thoại" value={r.phone} />
            <InfoRow
              icon={<MailIcon />}
              label="Email"
              value={r.guestEmail
                ? <a href={`mailto:${r.guestEmail}`} className="text-primary hover:underline break-all">{r.guestEmail}</a>
                : <span className="text-ink-muted">Chưa có</span>
              }
            />
          </div>
        </div>

        {/* Booking info section */}
        <div className="px-4 py-3">
          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2.5">Chi tiết đặt bàn</p>
          <div className="flex flex-col gap-2.5">
            <InfoRow icon={<ClockIcon />} label="Thời gian" value={r.arriveTime} />
            <InfoRow icon={<GuestsIcon />} label="Số khách" value={`${r.guests} người`} />
            <InfoRow
              icon={<TableIcon />}
              label="Bàn"
              value={r.table !== '—' ? r.table : <span className="text-ink-muted">Chưa xếp bàn</span>}
            />
            {r.area && <InfoRow icon={<TableIcon />} label="Khu vực" value={r.area} />}
            <InfoRow
              icon={<NoteIcon />}
              label="Ghi chú"
              value={r.note ? <span className="break-words">{r.note}</span> : <span className="text-ink-muted">Không có</span>}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
        <div className="shrink-0 border-t border-line px-4 py-3 flex flex-wrap gap-2">
          {r.status === 'PENDING' && (
            <>
              <button disabled={busy} onClick={() => onConfirm(r.id)}
                className="h-8 px-3 text-[12px] font-semibold rounded-md bg-[var(--kv-success)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer flex-1">
                Xác nhận
              </button>
              <button disabled={busy} onClick={() => onCancel(r.id)}
                className="h-8 px-3 text-[12px] font-semibold rounded-md border border-danger text-danger hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                Hủy
              </button>
            </>
          )}
          {r.status === 'CONFIRMED' && (
            <>
              <button disabled={busy} onClick={() => onCheckIn(r.id)}
                className="h-8 px-3 text-[12px] font-semibold rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer flex-1">
                Check-in
              </button>
              <button disabled={busy} onClick={() => onNoShow(r.id)}
                className="h-8 px-3 text-[12px] font-semibold rounded-md border border-line-default text-ink-subtle hover:bg-fill disabled:opacity-50 cursor-pointer">
                Không đến
              </button>
              <button disabled={busy} onClick={() => onCancel(r.id)}
                className="h-8 px-3 text-[12px] font-semibold rounded-md border border-danger text-danger hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                Hủy
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-2.5">
    <span className="shrink-0 text-ink-muted mt-0.5">{icon}</span>
    <span className="w-[5.5rem] shrink-0 text-[12px] text-ink-muted">{label}</span>
    <span className="flex-1 text-[13px] text-ink font-medium leading-snug">{value}</span>
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

/* ── Status filter ─────────────────────────────────────────────────────── */
// Active statuses shown first, terminal statuses after a separator
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

        {/* Table + Detail side-by-side */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 overflow-auto">
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
                        <ActionButtons r={r} busy={busy} onConfirm={() => act(() => onConfirm(r.id), r.id)}
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

          {displayedDetail && (
            <DetailPanel
              reservation={displayedDetail}
              onClose={() => setDetail(null)}
              onConfirm={id => act(() => onConfirm(id), id)}
              onCheckIn={id => act(() => onCheckIn(id), id)}
              onNoShow={id => act(() => onNoShow(id), id)}
              onCancel={id => act(() => onCancel(id), id)}
              actionLoading={actionLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Action buttons per row ───────────────────────────────────────────────── */
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

export default ListView
