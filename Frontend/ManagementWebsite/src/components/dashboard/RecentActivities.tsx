import { useEffect, useState } from 'react'
import Card, { CardHeader, CardBody } from '../common/Card'
import { listAuditLogs, type AuditLogDto } from '../../api/auditLogs'

// ── Action labels ─────────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  RESERVATION_CREATE:          'tạo đặt bàn',
  RESERVATION_CONFIRM:         'xác nhận đặt bàn',
  RESERVATION_ASSIGN_TABLE:    'xếp bàn',
  RESERVATION_TRANSFER_TABLE:  'chuyển bàn',
  RESERVATION_CHECK_IN:        'check-in khách',
  RESERVATION_NO_SHOW:         'đánh dấu không đến',
  RESERVATION_CANCEL:          'hủy đặt bàn',
  RESERVATION_UPDATE:          'cập nhật đặt bàn',
  USER_CREATE:              'tạo tài khoản nhân viên',
  USER_UPDATE:              'cập nhật nhân viên',
  USER_DELETE:              'xóa nhân viên',
  USER_UNLOCK:              'mở khóa tài khoản',
  AUTH_LOGIN:               'đăng nhập',
  AUTH_LOGIN_FAILED:        'đăng nhập thất bại',
  AUTH_LOGOUT:              'đăng xuất',
  AUTH_PASSWORD_CHANGED:    'đổi mật khẩu',
  AUTH_PASSWORD_RESET:      'reset mật khẩu',
  AUTH_ACCOUNT_ACTIVATED:   'kích hoạt tài khoản',
}

const ACTION_COLOR: Record<string, { bg: string; text: string }> = {
  RESERVATION_CREATE:       { bg: '#e8f0fe', text: '#025cca' },
  RESERVATION_CONFIRM:      { bg: '#e8f0fe', text: '#025cca' },
  RESERVATION_ASSIGN_TABLE:    { bg: '#e8f0fe', text: '#025cca' },
  RESERVATION_TRANSFER_TABLE:  { bg: '#e8f0fe', text: '#025cca' },
  RESERVATION_CHECK_IN:        { bg: '#e6f7f1', text: '#0d9e6e' },
  RESERVATION_NO_SHOW:      { bg: '#f0f0f0', text: '#666' },
  RESERVATION_CANCEL:       { bg: '#fdecea', text: '#e53935' },
  RESERVATION_UPDATE:       { bg: '#e8f0fe', text: '#025cca' },
  USER_CREATE:              { bg: '#f3e8ff', text: '#7c3aed' },
  USER_UPDATE:              { bg: '#f3e8ff', text: '#7c3aed' },
  USER_DELETE:              { bg: '#fdecea', text: '#e53935' },
  USER_UNLOCK:              { bg: '#e6f7f1', text: '#0d9e6e' },
  AUTH_LOGIN:               { bg: '#fff4e5', text: '#e67e00' },
  AUTH_LOGIN_FAILED:        { bg: '#fdecea', text: '#e53935' },
  AUTH_LOGOUT:              { bg: '#fff4e5', text: '#e67e00' },
  AUTH_PASSWORD_CHANGED:    { bg: '#fff4e5', text: '#e67e00' },
  AUTH_PASSWORD_RESET:      { bg: '#fff4e5', text: '#e67e00' },
  AUTH_ACCOUNT_ACTIVATED:   { bg: '#e6f7f1', text: '#0d9e6e' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

// ── Icon ──────────────────────────────────────────────────────────────────────

const ActivityIcon = ({ action }: { action: string }) => {
  const c = ACTION_COLOR[action] ?? { bg: '#f0f0f0', text: '#888' }

  if (action.startsWith('RESERVATION')) {
    return (
      <span className="w-[3.2rem] h-[3.2rem] rounded-full flex items-center justify-center shrink-0"
            style={{ background: c.bg, color: c.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    )
  }
  if (action.startsWith('USER')) {
    return (
      <span className="w-[3.2rem] h-[3.2rem] rounded-full flex items-center justify-center shrink-0"
            style={{ background: c.bg, color: c.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      </span>
    )
  }
  return (
    <span className="w-[3.2rem] h-[3.2rem] rounded-full flex items-center justify-center shrink-0"
          style={{ background: c.bg, color: c.text }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

const ActivityRow = ({ log }: { log: AuditLogDto }) => (
  <li className="flex gap-3 items-start py-3 border-b border-line last:border-b-0">
    <ActivityIcon action={log.action} />
    <div className="flex-1 min-w-0">
      <p className="text-sm text-ink-subtle m-0 mb-1 leading-[1.5]">
        <span className="text-primary font-medium">{log.actorUsername}</span>
        {' '}vừa{' '}
        <span className="font-medium text-ink">
          {ACTION_LABEL[log.action] ?? log.action.toLowerCase().replace(/_/g, ' ')}
        </span>
      </p>
      <span className="text-xs text-ink-muted">{timeAgo(log.createdAt)}</span>
    </div>
  </li>
)

// ── Main ──────────────────────────────────────────────────────────────────────

const RecentActivities = () => {
  const [logs, setLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listAuditLogs({ size: 10 })
      .then(r => setLogs(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="w-full">
      <CardHeader title="Hoạt động gần đây" />
      <CardBody className="flex-1" noPad>
        {loading ? (
          <div className="px-5 py-6 text-sm text-ink-muted">Đang tải...</div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-6 text-sm text-ink-muted">Chưa có hoạt động nào</div>
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
