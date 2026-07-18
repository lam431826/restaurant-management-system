import { useCallback, useEffect, useState } from 'react'
import { listAuditLogs, type AuditLogDto } from '../../api/auditLogs'
import { useRealtime } from '../../hooks/useRealtime'

// ── Action metadata ──────────────────────────────────────────────────────────

interface ActionMeta { label: string; color: string; bg: string }

const ACTION_META: Record<string, ActionMeta> = {
  RESERVATION_CREATE:       { label: 'Tạo đặt bàn',       color: '#025cca', bg: '#025cca18' },
  RESERVATION_CONFIRM:      { label: 'Xác nhận đặt bàn',  color: '#025cca', bg: '#025cca18' },
  RESERVATION_ASSIGN_TABLE: { label: 'Xếp bàn',           color: '#025cca', bg: '#025cca18' },
  RESERVATION_CHECK_IN:     { label: 'Check-in',           color: '#0d9e6e', bg: '#0d9e6e18' },
  RESERVATION_NO_SHOW:      { label: 'Không đến',          color: '#888',    bg: '#88888818' },
  RESERVATION_CANCEL:       { label: 'Hủy đặt bàn',       color: '#e53935', bg: '#e5393518' },
  RESERVATION_UPDATE:       { label: 'Sửa đặt bàn',       color: '#025cca', bg: '#025cca18' },
  USER_CREATE:              { label: 'Tạo nhân viên',      color: '#7c3aed', bg: '#7c3aed18' },
  USER_UPDATE:              { label: 'Sửa nhân viên',      color: '#7c3aed', bg: '#7c3aed18' },
  USER_DELETE:              { label: 'Xóa nhân viên',      color: '#e53935', bg: '#e5393518' },
  USER_UNLOCK:              { label: 'Mở khóa TK',         color: '#0d9e6e', bg: '#0d9e6e18' },
  AUTH_LOGIN:               { label: 'Đăng nhập',          color: '#e67e00', bg: '#e67e0018' },
  AUTH_LOGIN_FAILED:        { label: 'Đăng nhập thất bại', color: '#e53935', bg: '#e5393518' },
  AUTH_LOGOUT:              { label: 'Đăng xuất',          color: '#e67e00', bg: '#e67e0018' },
  AUTH_PASSWORD_CHANGED:    { label: 'Đổi mật khẩu',      color: '#e67e00', bg: '#e67e0018' },
  AUTH_PASSWORD_RESET:      { label: 'Reset mật khẩu',    color: '#e67e00', bg: '#e67e0018' },
  AUTH_ACCOUNT_ACTIVATED:   { label: 'Kích hoạt TK',      color: '#0d9e6e', bg: '#0d9e6e18' },
  PAYMENT_PROCESS:          { label: 'Thanh toán',         color: '#0891b2', bg: '#0891b218' },
  INVOICE_GENERATE:         { label: 'Tạo hóa đơn',       color: '#0891b2', bg: '#0891b218' },
  INVOICE_APPLY_DISCOUNT:   { label: 'Áp mã giảm giá',    color: '#0891b2', bg: '#0891b218' },
  PROMOTION_CREATE:         { label: 'Tạo khuyến mãi',     color: '#c026d3', bg: '#c026d318' },
  PROMOTION_UPDATE:         { label: 'Sửa khuyến mãi',     color: '#c026d3', bg: '#c026d318' },
  PROMOTION_DELETE:         { label: 'Xóa khuyến mãi',     color: '#e53935', bg: '#e5393518' },
  MENU_ITEM_CREATE:         { label: 'Tạo món',            color: '#4f46e5', bg: '#4f46e518' },
  MENU_ITEM_UPDATE:         { label: 'Sửa món',            color: '#4f46e5', bg: '#4f46e518' },
  MENU_ITEM_DELETE:         { label: 'Xóa món',            color: '#e53935', bg: '#e5393518' },
  MENU_CATEGORY_CREATE:     { label: 'Tạo danh mục',       color: '#4f46e5', bg: '#4f46e518' },
  MENU_CATEGORY_UPDATE:     { label: 'Sửa danh mục',       color: '#4f46e5', bg: '#4f46e518' },
  MENU_CATEGORY_DELETE:     { label: 'Xóa danh mục',       color: '#e53935', bg: '#e5393518' },
  MENU_CATEGORY_REORDER:    { label: 'Sắp xếp danh mục',   color: '#4f46e5', bg: '#4f46e518' },
  MENU_IMPORT:              { label: 'Nhập thực đơn',      color: '#4f46e5', bg: '#4f46e518' },
  TABLE_CREATE:             { label: 'Tạo bàn',            color: '#0ea5e9', bg: '#0ea5e918' },
  TABLE_UPDATE:             { label: 'Sửa bàn',            color: '#0ea5e9', bg: '#0ea5e918' },
  TABLE_DELETE:             { label: 'Xóa bàn',            color: '#e53935', bg: '#e5393518' },
  TABLE_IMPORT:             { label: 'Nhập danh sách bàn', color: '#0ea5e9', bg: '#0ea5e918' },
  AREA_CREATE:              { label: 'Tạo khu vực',        color: '#0ea5e9', bg: '#0ea5e918' },
  AREA_DELETE:              { label: 'Xóa khu vực',        color: '#e53935', bg: '#e5393518' },
  SHIFT_OPEN:               { label: 'Mở ca',               color: '#ca8a04', bg: '#ca8a0418' },
  SHIFT_CLOSE:              { label: 'Đóng ca',             color: '#ca8a04', bg: '#ca8a0418' },
  SHIFT_CASH_MOVEMENT:      { label: 'Thu/chi tiền mặt',    color: '#ca8a04', bg: '#ca8a0418' },
  ROSTER_ASSIGNMENT_CREATE: { label: 'Xếp lịch làm việc',   color: '#0f766e', bg: '#0f766e18' },
  ROSTER_ASSIGNMENT_UPDATE: { label: 'Sửa lịch làm việc',   color: '#0f766e', bg: '#0f766e18' },
  ROSTER_ASSIGNMENT_DELETE: { label: 'Xóa lịch làm việc',   color: '#e53935', bg: '#e5393518' },
  ROSTER_WEEK_PUBLISH:      { label: 'Công bố lịch tuần',   color: '#0f766e', bg: '#0f766e18' },
  ROSTER_REQUEST_APPROVE:   { label: 'Duyệt yêu cầu ca',    color: '#0d9e6e', bg: '#0d9e6e18' },
  ROSTER_REQUEST_REJECT:    { label: 'Từ chối yêu cầu ca',  color: '#e53935', bg: '#e5393518' },
}

const ENTITY_OPTIONS = ['', 'Reservation', 'User', 'Payment', 'Invoice', 'Promotion', 'MenuItem', 'MenuCategory', 'Table', 'Area', 'Shift', 'RosterAssignment', 'RosterRequest', 'RosterWeek']
const ACTION_OPTIONS = ['', ...Object.keys(ACTION_META)]

const ENTITY_LABELS: Record<string, string> = {
  Reservation: 'Đặt bàn',
  User: 'Nhân viên',
  Payment: 'Thanh toán',
  Invoice: 'Hóa đơn',
  Promotion: 'Khuyến mãi',
  MenuItem: 'Món ăn',
  MenuCategory: 'Danh mục món',
  Table: 'Bàn',
  Area: 'Khu vực',
  Shift: 'Ca làm việc',
  RosterAssignment: 'Lịch làm việc',
  RosterRequest: 'Yêu cầu đổi/nghỉ ca',
  RosterWeek: 'Công bố lịch tuần',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const parseDetail = (raw: string | null): Record<string, string> => {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return { raw } }
}

// ── Sub-components ───────────────────────────────────────────────────────────

const ActionBadge = ({ action }: { action: string }) => {
  const meta = ACTION_META[action] ?? { label: action, color: '#888', bg: '#88888818' }
  return (
    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  )
}

const DetailCell = ({ raw }: { raw: string | null }) => {
  const [open, setOpen] = useState(false)
  const obj = parseDetail(raw)
  const keys = Object.keys(obj)
  if (!keys.length) return <span className="text-ink-muted">—</span>

  const preview = keys.slice(0, 2).map(k => `${k}: ${obj[k]}`).join(', ')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-primary underline cursor-pointer"
      >
        {open ? 'Thu gọn' : preview + (keys.length > 2 ? '...' : '')}
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-0.5">
          {keys.map(k => (
            <div key={k} className="text-xs text-ink">
              <span className="font-medium text-ink-muted">{k}:</span> {obj[k]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 0, total: 0, totalPages: 0 })

  const [actorUsername, setActorUsername] = useState('')
  const [action, setAction] = useState('')
  const [targetEntity, setTargetEntity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async (page = 0) => {
    setLoading(true)
    try {
      const res = await listAuditLogs({
        actorUsername: actorUsername || undefined,
        action: action || undefined,
        targetEntity: targetEntity || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        size: 30,
      })
      setLogs(res.data.data)
      setPagination({ page, total: res.data.pagination.total, totalPages: res.data.pagination.totalPages })
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [actorUsername, action, targetEntity, from, to])

  useEffect(() => { load(0) }, [load])

  // New audit entries pushed over WS re-run the current query — this page has no
  // polling of its own today, so this is the only thing that keeps it live.
  useRealtime('/topic/audit', () => { load(pagination.page) })

  const inputCls = 'h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary'
  const selectCls = inputCls + ' cursor-pointer'

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface">
      {/* Header */}
      <div className="px-6 py-4 border-b border-line bg-card shrink-0">
        <h1 className="text-lg font-bold text-ink-strong">Nhật ký thao tác</h1>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-card border-b border-line shrink-0 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted font-medium">Nhân viên</label>
          <input
            className={inputCls + ' w-44'}
            placeholder="username..."
            value={actorUsername}
            onChange={e => setActorUsername(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted font-medium">Hành động</label>
          <select className={selectCls + ' w-52'} value={action} onChange={e => setAction(e.target.value)}>
            <option value="">Tất cả hành động</option>
            {ACTION_OPTIONS.filter(a => a).map(a => (
              <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted font-medium">Đối tượng</label>
          <select className={selectCls + ' w-40'} value={targetEntity} onChange={e => setTargetEntity(e.target.value)}>
            <option value="">Tất cả</option>
            {ENTITY_OPTIONS.filter(e => e).map(e => (
              <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted font-medium">Từ ngày</label>
          <input type="date" className={inputCls + ' w-40'} value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted font-medium">Đến ngày</label>
          <input type="date" className={inputCls + ' w-40'} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button
          className="kv-btn kv-btn-outline-neutral h-9 self-end"
          onClick={() => { setActorUsername(''); setAction(''); setTargetEntity(''); setFrom(''); setTo('') }}
        >
          Xóa bộ lọc
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-ink-muted">Đang tải...</div>
        ) : (
          <table className="w-full text-md border-collapse">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-2 pr-4 text-xs font-semibold text-ink-muted whitespace-nowrap">Thời gian</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-ink-muted">Nhân viên</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-ink-muted">Hành động</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-ink-muted">Đối tượng</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-ink-muted">ID</th>
                <th className="pb-2 text-xs font-semibold text-ink-muted">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ink-muted">Không có dữ liệu</td>
                </tr>
              )}
              {logs.map(log => (
                <tr key={log.id} className="border-b border-line hover:bg-primary-25">
                  <td className="py-2.5 pr-4 text-ink-muted whitespace-nowrap font-mono text-xs">
                    {fmtDate(log.createdAt)}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-ink">{log.actorUsername}</td>
                  <td className="py-2.5 pr-4"><ActionBadge action={log.action} /></td>
                  <td className="py-2.5 pr-4 text-ink-muted">
                    {log.targetEntity ? (ENTITY_LABELS[log.targetEntity] ?? log.targetEntity) : '—'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink-muted" title={log.targetId ?? ''}>
                    {log.targetId ? log.targetId.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="py-2.5"><DetailCell raw={log.detail} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-ink-muted">
              Tổng {pagination.total} bản ghi
            </span>
            <div className="flex gap-2">
              <button
                className="kv-btn kv-btn-outline-neutral h-8 text-sm"
                disabled={pagination.page === 0}
                onClick={() => load(pagination.page - 1)}
              >
                ← Trước
              </button>
              <span className="flex items-center text-sm text-ink-muted px-2">
                Trang {pagination.page + 1} / {pagination.totalPages}
              </span>
              <button
                className="kv-btn kv-btn-outline-neutral h-8 text-sm"
                disabled={pagination.page >= pagination.totalPages - 1}
                onClick={() => load(pagination.page + 1)}
              >
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLogPage
