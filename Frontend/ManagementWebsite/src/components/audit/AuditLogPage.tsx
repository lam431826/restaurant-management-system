import { useCallback, useEffect, useState } from 'react'
import { listAuditLogs, type AuditLogDto } from '../../api/auditLogs'
import { useRealtime } from '../../hooks/useRealtime'

// ── Action metadata ──────────────────────────────────────────────────────────

interface ActionMeta { label: string; color: string; bg: string }

// Every action string ever emitted, including ones from now-removed modules
// (ROSTER_*, see CLAUDE.md) — kept so historic rows still render a readable
// label instead of a raw backend string. FILTERABLE_ACTIONS below is the
// reachable subset offered in the "Hành động" dropdown.
const ACTION_META: Record<string, ActionMeta> = {
  RESERVATION_CREATE:         { label: 'Tạo đặt bàn',          color: '#025cca', bg: '#025cca18' },
  RESERVATION_CONFIRM:        { label: 'Xác nhận đặt bàn',     color: '#025cca', bg: '#025cca18' },
  RESERVATION_ASSIGN_TABLE:   { label: 'Xếp bàn',              color: '#025cca', bg: '#025cca18' },
  RESERVATION_CHECK_IN:       { label: 'Check-in',              color: '#0d9e6e', bg: '#0d9e6e18' },
  RESERVATION_COMPLETE:       { label: 'Hoàn tất lượt khách',   color: '#0d9e6e', bg: '#0d9e6e18' },
  RESERVATION_TRANSFER_TABLE: { label: 'Chuyển bàn đặt trước',  color: '#025cca', bg: '#025cca18' },
  RESERVATION_NO_SHOW:        { label: 'Không đến',             color: '#888',    bg: '#88888818' },
  RESERVATION_CANCEL:         { label: 'Hủy đặt bàn',          color: '#e53935', bg: '#e5393518' },
  RESERVATION_UPDATE:         { label: 'Sửa đặt bàn',          color: '#025cca', bg: '#025cca18' },
  USER_CREATE:                { label: 'Tạo tài khoản',         color: '#7c3aed', bg: '#7c3aed18' },
  USER_UPDATE:                { label: 'Sửa tài khoản',         color: '#7c3aed', bg: '#7c3aed18' },
  USER_DELETE:                { label: 'Xóa tài khoản',         color: '#e53935', bg: '#e5393518' },
  USER_UNLOCK:                { label: 'Mở khóa tài khoản',     color: '#0d9e6e', bg: '#0d9e6e18' },
  EMPLOYEE_CREATE:              { label: 'Tạo hồ sơ nhân viên',   color: '#9333ea', bg: '#9333ea18' },
  EMPLOYEE_UPDATE:              { label: 'Sửa hồ sơ nhân viên',   color: '#9333ea', bg: '#9333ea18' },
  EMPLOYEE_DEACTIVATE:          { label: 'Vô hiệu hóa nhân viên', color: '#e53935', bg: '#e5393518' },
  EMPLOYEE_SELF_UPDATE:         { label: 'Tự cập nhật hồ sơ',     color: '#9333ea', bg: '#9333ea18' },
  EMPLOYEE_SELF_CREATE:         { label: 'Tự tạo hồ sơ',          color: '#9333ea', bg: '#9333ea18' },
  EMPLOYEE_SALARY_SETTING_SAVE: { label: 'Cập nhật lương',        color: '#9333ea', bg: '#9333ea18' },
  AUTH_LOGIN:                 { label: 'Đăng nhập',             color: '#e67e00', bg: '#e67e0018' },
  AUTH_LOGIN_FAILED:          { label: 'Đăng nhập thất bại',    color: '#e53935', bg: '#e5393518' },
  AUTH_LOGOUT:                { label: 'Đăng xuất',             color: '#e67e00', bg: '#e67e0018' },
  AUTH_PASSWORD_CHANGED:      { label: 'Đổi mật khẩu',         color: '#e67e00', bg: '#e67e0018' },
  AUTH_PASSWORD_RESET:        { label: 'Reset mật khẩu',       color: '#e67e00', bg: '#e67e0018' },
  AUTH_ACCOUNT_ACTIVATED:     { label: 'Kích hoạt tài khoản',   color: '#0d9e6e', bg: '#0d9e6e18' },
  PAYMENT_PROCESS:            { label: 'Thanh toán',            color: '#0891b2', bg: '#0891b218' },
  PAYMENT_QR_INITIATE:        { label: 'Khởi tạo thanh toán QR', color: '#0891b2', bg: '#0891b218' },
  PAYMENT_QR_CONFIRM:         { label: 'Xác nhận thanh toán QR', color: '#0891b2', bg: '#0891b218' },
  PAYMENT_QR_CANCEL:          { label: 'Hủy thanh toán QR',     color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_CREATE:                       { label: 'Tạo giao dịch VNPAY',              color: '#0891b2', bg: '#0891b218' },
  PAYMENT_VNPAY_RETURN:                       { label: 'VNPAY: khách quay lại',            color: '#0891b2', bg: '#0891b218' },
  PAYMENT_VNPAY_RETURN_AMOUNT_MISMATCH:       { label: 'VNPAY Return: sai số tiền',         color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_RETURN_TERMINAL:              { label: 'VNPAY: giao dịch kết thúc',         color: '#888',    bg: '#88888818' },
  PAYMENT_VNPAY_IPN_INVALID_SIGNATURE:        { label: 'VNPAY IPN: chữ ký không hợp lệ',    color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_IPN_INVALID_TMNCODE:          { label: 'VNPAY IPN: mã đối tác không hợp lệ', color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_IPN_AMOUNT_MISMATCH:          { label: 'VNPAY IPN: sai số tiền',            color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_IPN_FAILED:                   { label: 'VNPAY IPN: thanh toán thất bại',    color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_IPN_SUCCESS:                  { label: 'VNPAY IPN: thanh toán thành công',  color: '#0d9e6e', bg: '#0d9e6e18' },
  PAYMENT_VNPAY_QUERYDR_INVALID_SIGNATURE:    { label: 'VNPAY đối soát: chữ ký không hợp lệ', color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_QUERYDR_INVALID_TMNCODE:      { label: 'VNPAY đối soát: mã đối tác không hợp lệ', color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_QUERYDR_TXNREF_MISMATCH:      { label: 'VNPAY đối soát: sai mã giao dịch',  color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_QUERYDR_NO_RESULT:            { label: 'VNPAY đối soát: không có kết quả',  color: '#888',    bg: '#88888818' },
  PAYMENT_VNPAY_QUERYDR_AMOUNT_MISMATCH:      { label: 'VNPAY đối soát: sai số tiền',       color: '#e53935', bg: '#e5393518' },
  PAYMENT_VNPAY_QUERYDR_SUCCESS:               { label: 'VNPAY đối soát: xác nhận thành công', color: '#0d9e6e', bg: '#0d9e6e18' },
  PAYMENT_VNPAY_QUERYDR_FAILED:                { label: 'VNPAY đối soát: xác nhận thất bại', color: '#e53935', bg: '#e5393518' },
  INVOICE_GENERATE:           { label: 'Tạo hóa đơn',          color: '#0891b2', bg: '#0891b218' },
  INVOICE_APPLY_DISCOUNT:     { label: 'Áp mã giảm giá',       color: '#0891b2', bg: '#0891b218' },
  PROMOTION_CREATE:           { label: 'Tạo khuyến mãi',        color: '#c026d3', bg: '#c026d318' },
  PROMOTION_UPDATE:           { label: 'Sửa khuyến mãi',        color: '#c026d3', bg: '#c026d318' },
  PROMOTION_DELETE:           { label: 'Xóa khuyến mãi',        color: '#e53935', bg: '#e5393518' },
  MENU_ITEM_CREATE:           { label: 'Tạo món',               color: '#4f46e5', bg: '#4f46e518' },
  MENU_ITEM_UPDATE:           { label: 'Sửa món',               color: '#4f46e5', bg: '#4f46e518' },
  MENU_ITEM_DELETE:           { label: 'Xóa món',               color: '#e53935', bg: '#e5393518' },
  MENU_CATEGORY_CREATE:       { label: 'Tạo danh mục',          color: '#4f46e5', bg: '#4f46e518' },
  MENU_CATEGORY_UPDATE:       { label: 'Sửa danh mục',          color: '#4f46e5', bg: '#4f46e518' },
  MENU_CATEGORY_DELETE:       { label: 'Xóa danh mục',          color: '#e53935', bg: '#e5393518' },
  MENU_CATEGORY_REORDER:      { label: 'Sắp xếp danh mục',      color: '#4f46e5', bg: '#4f46e518' },
  MENU_IMPORT:                { label: 'Nhập thực đơn',         color: '#4f46e5', bg: '#4f46e518' },
  TABLE_CREATE:                { label: 'Tạo bàn',               color: '#0ea5e9', bg: '#0ea5e918' },
  TABLE_UPDATE:                { label: 'Sửa bàn',               color: '#0ea5e9', bg: '#0ea5e918' },
  TABLE_DELETE:                { label: 'Xóa bàn',               color: '#e53935', bg: '#e5393518' },
  TABLE_IMPORT:                { label: 'Nhập danh sách bàn',    color: '#0ea5e9', bg: '#0ea5e918' },
  AREA_CREATE:                 { label: 'Tạo khu vực',           color: '#0ea5e9', bg: '#0ea5e918' },
  AREA_DELETE:                 { label: 'Xóa khu vực',           color: '#e53935', bg: '#e5393518' },
  SHIFT_OPEN:                  { label: 'Mở ca',                  color: '#ca8a04', bg: '#ca8a0418' },
  SHIFT_CLOSE:                  { label: 'Đóng ca',                color: '#ca8a04', bg: '#ca8a0418' },
  SHIFT_CASH_MOVEMENT:          { label: 'Thu/chi tiền mặt',       color: '#ca8a04', bg: '#ca8a0418' },
  // Legacy — emitted by the roster/ module before it was removed. No longer
  // reachable via the filter dropdown (see FILTERABLE_ACTIONS), kept only so
  // pre-existing rows still render a readable label instead of a raw string.
  ROSTER_ASSIGNMENT_CREATE:    { label: 'Xếp lịch làm việc',      color: '#0f766e', bg: '#0f766e18' },
  ROSTER_ASSIGNMENT_UPDATE:    { label: 'Sửa lịch làm việc',      color: '#0f766e', bg: '#0f766e18' },
  ROSTER_ASSIGNMENT_DELETE:    { label: 'Xóa lịch làm việc',      color: '#e53935', bg: '#e5393518' },
  ROSTER_WEEK_PUBLISH:         { label: 'Công bố lịch tuần',      color: '#0f766e', bg: '#0f766e18' },
  ROSTER_REQUEST_APPROVE:      { label: 'Duyệt yêu cầu ca',       color: '#0d9e6e', bg: '#0d9e6e18' },
  ROSTER_REQUEST_REJECT:       { label: 'Từ chối yêu cầu ca',     color: '#e53935', bg: '#e5393518' },
}

const FILTERABLE_ACTIONS = Object.keys(ACTION_META).filter(a => !a.startsWith('ROSTER_'))

const ENTITY_LABELS: Record<string, string> = {
  Reservation: 'Đặt bàn',
  User: 'Tài khoản',
  Employee: 'Nhân viên',
  Payment: 'Thanh toán',
  Invoice: 'Hóa đơn',
  Promotion: 'Khuyến mãi',
  MenuItem: 'Món ăn',
  MenuCategory: 'Danh mục món',
  Table: 'Bàn',
  Area: 'Khu vực',
  Shift: 'Ca làm việc',
  // Legacy, same reasoning as the ROSTER_* actions above.
  RosterAssignment: 'Lịch làm việc',
  RosterRequest: 'Yêu cầu đổi/nghỉ ca',
  RosterWeek: 'Công bố lịch tuần',
}

const FILTERABLE_ENTITIES = Object.keys(ENTITY_LABELS).filter(e => !e.startsWith('Roster'))

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

type DetailValue = string | number | boolean

const parseDetail = (raw: string | null): Record<string, DetailValue> => {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return { raw } }
}

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'px-3 py-3 border-b border-line align-middle text-md'

// ── Detail-column formatting ─────────────────────────────────────────────────
// The `detail` JSON is hand-built per module (see CLAUDE.md's audit() helper
// convention) — plain field names like `reason`/`code`/`status` mean different
// things depending on the row's action/entity, so labels are resolved with
// that context rather than from a flat key→label map alone.

const MONEY_KEYS = new Set(['amount', 'totalAmount', 'discountAmount', 'openingCash', 'closingCash', 'cashVariance', 'totalRevenue'])

const PAYMENT_METHOD_LABELS: Record<string, string> = { CASH: 'Tiền mặt', CARD: 'Thẻ', QR: 'QR', E_WALLET: 'Ví điện tử' }
const CASH_MOVEMENT_TYPE_LABELS: Record<string, string> = { CASH_IN: 'Thu tiền', CASH_OUT: 'Chi tiền' }
const ROLE_LABELS: Record<string, string> = { WAITER: 'Phục vụ', CASHIER: 'Thu ngân', MANAGER: 'Quản lý', ADMIN: 'Quản trị viên' }
const USER_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Hoạt động', UN_ACTIVE: 'Chưa kích hoạt', INACTIVE: 'Ngừng hoạt động', LOCKED: 'Bị khóa' }
const SHIFT_STATUS_LABELS: Record<string, string> = { OPEN: 'Đang mở', CLOSED: 'Đã đóng', PENDING_RECON: 'Chờ đối soát' }
const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', CHECKED_IN: 'Đã check-in',
  NO_SHOW: 'Không đến', CANCELLED: 'Đã hủy', COMPLETED: 'Hoàn tất',
}

const DETAIL_KEY_LABELS: Record<string, string> = {
  guestName: 'Tên khách', tableId: 'Mã bàn', channel: 'Kênh đặt', invoiceId: 'Hóa đơn',
  amount: 'Số tiền', method: 'Phương thức', transactionRef: 'Mã giao dịch', orderId: 'Đơn hàng',
  totalAmount: 'Tổng tiền', promotionCode: 'Mã khuyến mãi', discountAmount: 'Số tiền giảm',
  active: 'Kích hoạt', available: 'Còn hàng', bulk: 'Thao tác hàng loạt', count: 'Số lượng',
  created: 'Số bản ghi tạo mới', updated: 'Số bản ghi cập nhật', errors: 'Số dòng lỗi',
  cashierId: 'Thu ngân', openingCash: 'Tiền đầu ca', closingCash: 'Tiền cuối ca',
  cashVariance: 'Chênh lệch tiền mặt', totalRevenue: 'Tổng doanh thu', type: 'Loại giao dịch',
  username: 'Tài khoản', role: 'Vai trò', reason: 'Lý do', locked: 'Tài khoản bị khóa',
  name: 'Tên', code: 'Mã', status: 'Trạng thái', from: 'Trước', to: 'Sau', raw: 'Nội dung',
}

// Fallback for any key not covered above: someNewField -> "Some New Field".
const humanize = (key: string) => {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const resolveDetailField = (
  key: string, value: DetailValue, action: string, targetEntity: string | null,
): { label: string; text: string } => {
  let label = DETAIL_KEY_LABELS[key] ?? humanize(key)
  let text = typeof value === 'boolean'
    ? (value ? 'Có' : 'Không')
    : typeof value === 'number'
      ? (MONEY_KEYS.has(key) ? `${value.toLocaleString('vi-VN')}đ` : value.toLocaleString('vi-VN'))
      : String(value)

  if (key === 'code' && targetEntity) {
    label = targetEntity === 'Employee' ? 'Mã nhân viên' : targetEntity === 'Promotion' ? 'Mã khuyến mãi' : label
  } else if (key === 'status') {
    if (targetEntity === 'Shift') { label = 'Trạng thái ca'; text = SHIFT_STATUS_LABELS[String(value)] ?? text }
    else if (targetEntity === 'User') { label = 'Trạng thái tài khoản'; text = USER_STATUS_LABELS[String(value)] ?? text }
  } else if (key === 'from' || key === 'to') {
    if (action === 'RESERVATION_TRANSFER_TABLE') {
      label = key === 'from' ? 'Bàn cũ' : 'Bàn mới'
    } else if (action.startsWith('RESERVATION_')) {
      label = key === 'from' ? 'Trạng thái trước' : 'Trạng thái sau'
      text = RESERVATION_STATUS_LABELS[String(value)] ?? text
    }
  } else if (key === 'method') {
    text = PAYMENT_METHOD_LABELS[String(value)] ?? text
  } else if (key === 'type') {
    text = CASH_MOVEMENT_TYPE_LABELS[String(value)] ?? text
  } else if (key === 'role') {
    text = ROLE_LABELS[String(value)] ?? text
  } else if (key === 'reason' && action === 'AUTH_LOGIN_FAILED') {
    text = value === 'INVALID_CREDENTIALS' ? 'Sai tên đăng nhập hoặc mật khẩu' : text
  } else if (key === 'channel' && value === 'ONLINE') {
    text = 'Đặt online'
  }

  return { label, text }
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

const DetailCell = ({ raw, action, targetEntity }: { raw: string | null; action: string; targetEntity: string | null }) => {
  const obj = parseDetail(raw)
  const keys = Object.keys(obj)
  if (!keys.length) return <span className="text-ink-muted">—</span>

  return (
    <div className="flex flex-col gap-0.5">
      {keys.map(k => {
        const { label, text } = resolveDetailField(k, obj[k], action, targetEntity)
        return (
          <div key={k} className="text-xs text-ink">
            <span className="font-medium text-ink-muted">{label}:</span> {text}
          </div>
        )
      })}
    </div>
  )
}

interface FilterState {
  actorUsername: string
  action: string
  targetEntity: string
  from: string
  to: string
}

const EMPTY_FILTERS: FilterState = { actorUsername: '', action: '', targetEntity: '', from: '', to: '' }

const fieldCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary'
const selectCls = fieldCls + ' cursor-pointer'

const AuditLogFilters = ({ initialState, onApply }: { initialState: FilterState; onApply: (f: FilterState) => void }) => {
  const [draft, setDraft] = useState<FilterState>(initialState)

  // yyyy-MM-dd strings compare correctly as plain strings.
  const dateRangeInvalid = Boolean(draft.from && draft.to && draft.to < draft.from)

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault()
    if (dateRangeInvalid) return
    onApply({ ...draft, actorUsername: draft.actorUsername.trim() })
  }

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS)
    onApply(EMPTY_FILTERS)
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-5">
      <div>
        <h2 className="text-h3 font-bold text-ink">Lọc nhật ký</h2>
        <p className="text-sm text-ink-subtle mt-1">
          Tìm theo nhân viên, hành động, đối tượng và khoảng thời gian
        </p>
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <label className="text-md font-semibold text-ink">Nhân viên</label>
        <input
          className={fieldCls}
          placeholder="Nhập một phần tên đăng nhập..."
          value={draft.actorUsername}
          onChange={e => setDraft(d => ({ ...d, actorUsername: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <label className="text-md font-semibold text-ink">Hành động</label>
        <select
          className={selectCls}
          value={draft.action}
          onChange={e => setDraft(d => ({ ...d, action: e.target.value }))}
        >
          <option value="">Tất cả hành động</option>
          {FILTERABLE_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <label className="text-md font-semibold text-ink">Đối tượng</label>
        <select
          className={selectCls}
          value={draft.targetEntity}
          onChange={e => setDraft(d => ({ ...d, targetEntity: e.target.value }))}
        >
          <option value="">Tất cả</option>
          {FILTERABLE_ENTITIES.map(en => (
            <option key={en} value={en}>{ENTITY_LABELS[en] ?? en}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <span className="text-md font-semibold text-ink">Khoảng thời gian</span>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted">Từ ngày</label>
          <input
            type="date"
            className={fieldCls}
            value={draft.from}
            max={draft.to || undefined}
            onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted">Đến ngày</label>
          <input
            type="date"
            className={fieldCls}
            value={draft.to}
            min={draft.from || undefined}
            onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
          />
        </div>
        {dateRangeInvalid && (
          <p className="text-sm text-danger-700">Đến ngày phải sau hoặc bằng Từ ngày.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button type="submit" className="kv-btn kv-btn-primary h-10 w-full" disabled={dateRangeInvalid}>
          Áp dụng bộ lọc
        </button>
        <button type="button" className="kv-btn kv-btn-outline-neutral h-10 w-full" onClick={resetFilters}>
          Đặt lại
        </button>
      </div>
    </form>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({ page: 0, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)

  const load = useCallback(async (page = 0) => {
    setLoading(true)
    setError('')
    try {
      const res = await listAuditLogs({
        actorUsername: filters.actorUsername || undefined,
        action: filters.action || undefined,
        targetEntity: filters.targetEntity || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        size: 30,
      })
      setLogs(res.data.data)
      setPagination({ page, total: res.data.pagination.total, totalPages: res.data.pagination.totalPages })
    } catch {
      setError('Không thể tải nhật ký thao tác.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load(0) }, [load])

  // New audit entries pushed over WS re-run the current query — this page has no
  // polling of its own today, so this is the only thing that keeps it live.
  useRealtime('/topic/audit', () => { load(pagination.page) })

  return (
    <div className="flex h-full min-h-0 bg-surface overflow-hidden">
      <aside className="w-96 shrink-0 flex flex-col px-4 pt-5 pb-4 overflow-y-auto border-r border-line bg-card">
        <AuditLogFilters initialState={filters} onApply={setFilters} />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col p-5 gap-4 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-h3 font-bold text-ink">Nhật ký thao tác</h1>
            <p className="text-md text-ink-subtle mt-1">Theo dõi lịch sử thao tác của nhân viên trên hệ thống</p>
          </div>
          <button
            type="button"
            className="kv-btn kv-btn-outline-neutral h-10 bg-card shrink-0"
            onClick={() => load(pagination.page)}
            disabled={loading}
          >
            Làm mới
          </button>
        </div>

        {error && (
          <div
            className="flex items-center justify-between gap-4 px-4 py-3 rounded-md bg-danger-50 text-danger-700 text-md shrink-0"
            role="alert"
          >
            <span>{error}</span>
            <button type="button" className="font-semibold hover:underline" onClick={() => load(pagination.page)}>
              Thử lại
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto rounded-md border border-line">
          <table className="w-full text-md border-collapse">
            <thead>
              <tr>
                <th className={th}>Thời gian</th>
                <th className={th}>Nhân viên</th>
                <th className={th}>Hành động</th>
                <th className={th}>Đối tượng</th>
                <th className={th}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-ink-muted">Đang tải...</td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-ink-muted">Không có dữ liệu</td>
                </tr>
              )}
              {!loading && logs.map(log => (
                <tr key={log.id} className="hover:bg-primary-25">
                  <td className={td + ' text-ink-muted whitespace-nowrap font-mono text-xs'}>{fmtDate(log.createdAt)}</td>
                  <td className={td + ' text-ink font-medium'}>{log.actorUsername}</td>
                  <td className={td}><ActionBadge action={log.action} /></td>
                  <td className={td + ' text-ink-muted'}>
                    {log.targetEntity ? (ENTITY_LABELS[log.targetEntity] ?? log.targetEntity) : '—'}
                  </td>
                  <td className={td}><DetailCell raw={log.detail} action={log.action} targetEntity={log.targetEntity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between shrink-0">
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
      </section>
    </div>
  )
}

export default AuditLogPage
