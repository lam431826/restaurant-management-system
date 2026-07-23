import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card, { CardHeader, CardBody } from '../common/Card'
import { EmptyState, ErrorState, Skeleton } from './DashboardStates'
import { listAuditLogs, type AuditLogDto } from '../../api/auditLogs'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

// Readable Vietnamese phrasing for audit actions. Rendered as "<actor> <label>"; labels never
// include signatures, gateway payloads or internal detail — only what is safe to show a manager.
const ACTION_META: Record<string, { label: string; tone: Tone }> = {
  // Payments — CASH / QR / VNPAY
  PAYMENT_PROCESS: { label: 'đã xác nhận thanh toán', tone: 'success' },
  PAYMENT_QR_INITIATE: { label: 'đã tạo giao dịch QR', tone: 'info' },
  PAYMENT_QR_CONFIRM: { label: 'đã xác nhận thanh toán QR', tone: 'success' },
  PAYMENT_QR_CANCEL: { label: 'đã hủy giao dịch QR', tone: 'warning' },
  PAYMENT_VNPAY_CREATE: { label: 'đã tạo giao dịch VNPAY', tone: 'info' },
  PAYMENT_VNPAY_RETURN: { label: 'đã nhận kết quả trả về từ VNPAY', tone: 'info' },
  PAYMENT_VNPAY_RETURN_TERMINAL: { label: 'kết thúc giao dịch VNPAY', tone: 'info' },
  PAYMENT_VNPAY_RETURN_AMOUNT_MISMATCH: { label: 'ghi nhận số tiền VNPAY không khớp', tone: 'danger' },
  PAYMENT_VNPAY_IPN_FAILED: { label: 'ghi nhận thanh toán VNPAY thất bại', tone: 'danger' },
  PAYMENT_VNPAY_IPN_SUCCESS: { label: 'đã xác nhận thanh toán VNPAY thành công', tone: 'success' },
  PAYMENT_VNPAY_IPN_INVALID_SIGNATURE: { label: 'ghi nhận chữ ký phản hồi VNPAY không hợp lệ', tone: 'danger' },
  PAYMENT_VNPAY_IPN_INVALID_TMNCODE: { label: 'ghi nhận mã đối tác VNPAY không hợp lệ', tone: 'danger' },
  PAYMENT_VNPAY_IPN_AMOUNT_MISMATCH: { label: 'ghi nhận số tiền VNPAY không khớp', tone: 'danger' },
  PAYMENT_VNPAY_QUERYDR_FAILED: { label: 'đối soát VNPAY thất bại', tone: 'warning' },
  PAYMENT_VNPAY_QUERYDR_INVALID_SIGNATURE: { label: 'ghi nhận chữ ký đối soát VNPAY không hợp lệ', tone: 'danger' },
  PAYMENT_VNPAY_QUERYDR_INVALID_TMNCODE: { label: 'ghi nhận mã đối tác đối soát không hợp lệ', tone: 'danger' },
  PAYMENT_VNPAY_QUERYDR_TXNREF_MISMATCH: { label: 'ghi nhận mã giao dịch đối soát không khớp', tone: 'danger' },
  PAYMENT_VNPAY_QUERYDR_AMOUNT_MISMATCH: { label: 'ghi nhận số tiền đối soát không khớp', tone: 'danger' },
  PAYMENT_VNPAY_QUERYDR_NO_RESULT: { label: 'không nhận được kết quả đối soát VNPAY', tone: 'warning' },
  PAYMENT_VNPAY_QUERYDR_SUCCESS: { label: 'đã xác nhận thanh toán VNPAY qua đối soát', tone: 'success' },
  PAYMENT_ATTEMPT_EXPIRED: { label: 'có giao dịch thanh toán hết hạn', tone: 'warning' },
  // Invoices
  INVOICE_GENERATE: { label: 'đã tạo hóa đơn', tone: 'info' },
  INVOICE_APPLY_DISCOUNT: { label: 'đã áp dụng giảm giá cho hóa đơn', tone: 'info' },
  // Shifts / cash
  SHIFT_OPEN: { label: 'đã mở ca làm việc', tone: 'success' },
  SHIFT_CLOSE: { label: 'đã đóng ca làm việc', tone: 'neutral' },
  SHIFT_CASH_MOVEMENT: { label: 'đã ghi nhận thu/chi tiền mặt', tone: 'info' },
  // Reservations
  RESERVATION_CREATE: { label: 'đã tạo đặt bàn', tone: 'info' },
  RESERVATION_CONFIRM: { label: 'đã xác nhận đặt bàn', tone: 'info' },
  RESERVATION_TRANSFER_TABLE: { label: 'đã chuyển bàn', tone: 'info' },
  RESERVATION_CHECK_IN: { label: 'đã check-in khách', tone: 'success' },
  RESERVATION_NO_SHOW: { label: 'đã đánh dấu khách không đến', tone: 'warning' },
  RESERVATION_CANCEL: { label: 'đã hủy đặt bàn', tone: 'danger' },
  RESERVATION_COMPLETE: { label: 'đã hoàn tất đặt bàn', tone: 'success' },
  // Menu / promotions / tables
  MENU_ITEM_CREATE: { label: 'đã thêm món mới', tone: 'info' },
  MENU_ITEM_UPDATE: { label: 'đã cập nhật món', tone: 'info' },
  MENU_ITEM_DELETE: { label: 'đã xóa món', tone: 'warning' },
  MENU_IMPORT: { label: 'đã nhập thực đơn', tone: 'info' },
  PROMOTION_CREATE: { label: 'đã tạo khuyến mãi', tone: 'info' },
  PROMOTION_UPDATE: { label: 'đã cập nhật khuyến mãi', tone: 'info' },
  PROMOTION_DELETE: { label: 'đã xóa khuyến mãi', tone: 'warning' },
  TABLE_CREATE: { label: 'đã thêm bàn', tone: 'info' },
  TABLE_UPDATE: { label: 'đã cập nhật bàn', tone: 'info' },
  TABLE_DELETE: { label: 'đã xóa bàn', tone: 'warning' },
  // Staff / auth
  EMPLOYEE_CREATE: { label: 'đã tạo hồ sơ nhân viên', tone: 'info' },
  EMPLOYEE_UPDATE: { label: 'đã cập nhật nhân viên', tone: 'info' },
  EMPLOYEE_DEACTIVATE: { label: 'đã ngưng hoạt động nhân viên', tone: 'warning' },
  USER_CREATE: { label: 'đã tạo tài khoản', tone: 'info' },
  USER_UPDATE: { label: 'đã cập nhật tài khoản', tone: 'info' },
  USER_DELETE: { label: 'đã xóa tài khoản', tone: 'danger' },
  USER_UNLOCK: { label: 'đã mở khóa tài khoản', tone: 'success' },
  AUTH_LOGIN: { label: 'đã đăng nhập', tone: 'neutral' },
  AUTH_LOGIN_FAILED: { label: 'đăng nhập thất bại', tone: 'danger' },
  AUTH_LOGOUT: { label: 'đã đăng xuất', tone: 'neutral' },
  AUTH_PASSWORD_CHANGED: { label: 'đã đổi mật khẩu', tone: 'neutral' },
  AUTH_PASSWORD_RESET: { label: 'đã đặt lại mật khẩu', tone: 'warning' },
  AUTH_ACCOUNT_ACTIVATED: { label: 'đã kích hoạt tài khoản', tone: 'success' },
}

const TONE_DOT: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
  neutral: 'bg-[var(--kv-text-subtle)]',
}

// Fallback for an unmapped action: derive a plain lowercase phrase, never leak the raw code.
const fallbackLabel = (action: string) => action.toLowerCase().replace(/_/g, ' ')

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

const ActivityRow = ({ log }: { log: AuditLogDto }) => {
  const meta = ACTION_META[log.action]
  const tone: Tone = meta?.tone ?? 'neutral'
  return (
    <li className="flex gap-3 items-start py-3 border-b border-line last:border-b-0">
      <span className={`w-[0.9rem] h-[0.9rem] rounded-full shrink-0 mt-1 ${TONE_DOT[tone]}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-subtle m-0 leading-[1.5]">
          <span className="text-ink font-semibold">{log.actorUsername}</span>{' '}
          <span>{meta?.label ?? fallbackLabel(log.action)}</span>
        </p>
        <span className="text-xs text-ink-muted">{timeAgo(log.createdAt)}</span>
      </div>
    </li>
  )
}

const RecentActivities = () => {
  const [logs, setLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    listAuditLogs({ size: 8 })
      .then(r => setLogs(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <Card className="h-full">
      <CardHeader
        title="Hoạt động gần đây"
        actions={
          <Link to="/manager/audit-logs" className="text-sm font-medium text-primary hover:underline">
            Xem tất cả
          </Link>
        }
      />
      <CardBody className="flex-1" noPad>
        {loading ? (
          <div className="flex flex-col gap-3 px-5 py-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : logs.length === 0 ? (
          <EmptyState message="Chưa có hoạt động nào" />
        ) : (
          <ul className="list-none m-0 px-5 pt-0 pb-2 flex flex-col">
            {logs.map(log => <ActivityRow key={log.id} log={log} />)}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

export default RecentActivities
