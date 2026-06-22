import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as usersApi from '../../api/users'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_MAP = {
  ADMIN:   { label: 'Admin',    bg: '#ede9fe', color: '#7c3aed' },
  MANAGER: { label: 'Manager',  bg: '#dceefe', color: '#025cca' },
  CASHIER: { label: 'Cashier',  bg: '#fef3c7', color: '#d97706' },
  WAITER:  { label: 'Waiter',   bg: '#d1fae5', color: '#059669' },
}
const STATUS_MAP = {
  ACTIVE:    { label: 'Hoạt động',       bg: '#dcf7ea', color: '#286b4a' },
  LOCKED:    { label: 'Bị khóa',         bg: '#fee2e2', color: '#dc2626' },
  UN_ACTIVE: { label: 'Chưa kích hoạt', bg: '#fef3c7', color: '#d97706' },
  INACTIVE:  { label: 'Vô hiệu hóa',    bg: '#f5f5f5', color: '#636566' },
}
const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER']
const AVATAR_PALETTE = ['#5B8FE8', '#E87A5B', '#48B87A', '#E8A825', '#9B5BE8', '#E85B8F']
const PAGE_SIZE = 10

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function getAvatarColor(str) {
  let h = 0
  for (const c of (str || '')) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}
function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('vi-VN')
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)
const UnlockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx={11} cy={11} r={8} />
    <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
  </svg>
)
const XIcon = ({ size = 5 }) => (
  <svg className={`w-${size} h-${size}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const ChevronIcon = ({ open }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)
const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
)
const UsersNavIcon = ({ active }) => (
  <svg className="w-5 h-5" fill="none" stroke={active ? '#025cca' : 'currentColor'} strokeWidth={active ? 2 : 1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)
const CheckBigIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)
const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
)

// ── Shared UI ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const cfg = ROLE_MAP[role] || { label: role, bg: '#f5f5f5', color: '#636566' }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, bg: '#f5f5f5', color: '#636566' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null
  const ok = toast.type === 'success'
  return (
    <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 rounded-[16px] px-5 py-4 shadow-xl min-w-[300px]"
      style={{ backgroundColor: ok ? '#dcf7ea' : '#fee2e2', border: `1px solid ${ok ? '#48c185' : '#dc2626'}` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: ok ? '#48c185' : '#dc2626' }}>
        {ok
          ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          : <XIcon size={4} />}
      </div>
      <p className="flex-1 text-[14px] font-medium" style={{ color: ok ? '#286b4a' : '#dc2626' }}>
        {toast.message}
      </p>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: ok ? '#286b4a' : '#dc2626' }}>
        <XIcon size={4} />
      </button>
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    setOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  const displayName = user?.fullName || user?.username || 'User'
  const color = getAvatarColor(user?.username)

  return (
    <header className="bg-white flex items-center justify-between px-6 h-[64px] shrink-0 border-b border-[#e8e8e8]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#025cca] rounded-[10px] flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
          </svg>
        </div>
        <div className="leading-tight">
          <p className="text-[18px] font-bold text-[#202325]">Wasabi</p>
          <p className="text-[12px] text-[#636566]">Admin Dashboard</p>
        </div>
      </div>

      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 hover:bg-[#f5f5f5] px-2 py-1 rounded-[10px] transition-colors">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
            style={{ backgroundColor: color }}>
            {getInitials(displayName)}
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[14px] font-medium text-[#202325]">{displayName}</span>
            <span className="text-[12px] text-[#636566]">{user?.role}</span>
          </div>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#e8e8e8] rounded-[12px] shadow-lg z-50 w-[180px] py-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e8e8e8]">
              <p className="text-[13px] font-semibold text-[#202325] truncate">{displayName}</p>
              <p className="text-[12px] text-[#636566]">{user?.role}</p>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-3 text-[14px] text-red-500 hover:bg-red-50 transition-colors">
              <LogoutIcon />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside className="w-[220px] bg-white border-r border-[#e8e8e8] flex flex-col shrink-0">
      <div className="px-4 pt-6 pb-2">
        <p className="text-[11px] font-semibold text-[#797b7c] uppercase tracking-wider px-3">Quản lý</p>
      </div>
      <button className="flex items-center gap-3 mx-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium bg-[#dceefe] text-[#025cca]">
        <UsersNavIcon active />
        Người dùng
      </button>
    </aside>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, bgColor, iconBg, icon }) {
  return (
    <div className="bg-white rounded-[16px] p-5 flex items-center gap-4 flex-1 min-w-0">
      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}>
        <span style={{ color: bgColor }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[28px] font-bold text-[#202325] leading-tight">{value}</p>
        <p className="text-[13px] text-[#636566] leading-tight truncate">{label}</p>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, maxWidth = 'max-w-[480px]' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative bg-white rounded-[16px] w-full ${maxWidth} shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8] sticky top-0 bg-white z-10">
          <h2 className="text-[18px] font-semibold text-[#202325]">{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center text-[#636566] hover:bg-[#e8e8e8] transition-colors">
            <XIcon />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Form helpers ──────────────────────────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[#202325]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  )
}

function FInput({ ...props }) {
  return (
    <input {...props}
      className="bg-[#f5f5f5] border border-transparent focus:border-[#025cca] focus:bg-white h-[44px] px-4 rounded-[12px] text-[14px] text-[#202325] placeholder-[#797b7c] outline-none transition-colors w-full" />
  )
}

function FSelect({ children, ...props }) {
  return (
    <select {...props}
      className="bg-[#f5f5f5] border border-transparent focus:border-[#025cca] focus:bg-white h-[44px] px-4 rounded-[12px] text-[14px] text-[#202325] outline-none transition-colors w-full appearance-none cursor-pointer">
      {children}
    </select>
  )
}

// ── Add User Modal ────────────────────────────────────────────────────────────

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', fullName: '', email: '', phone: '', role: 'WAITER' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(null)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function validate() {
    const e = {}
    if (!form.username.trim()) e.username = 'Bắt buộc'
    if (!form.fullName.trim()) e.fullName = 'Bắt buộc'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    if (form.phone && !/^0\d{9,10}$/.test(form.phone)) e.phone = 'Bắt đầu bằng 0, 10-11 chữ số'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setErrors({})
    try {
      const { data } = await usersApi.createUser(form)
      setCreated(data.data)
    } catch (err) {
      setErrors({ api: err.response?.data?.message || 'Đã có lỗi xảy ra' })
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <Modal title="Tạo tài khoản thành công" onClose={() => { onCreated(); onClose() }}>
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="w-16 h-16 bg-[#dcf7ea] rounded-full flex items-center justify-center text-[#286b4a]">
            <CheckBigIcon />
          </div>
          <div className="text-center">
            <p className="text-[16px] font-semibold text-[#202325]">Tài khoản đã được tạo</p>
            <p className="text-[13px] text-[#636566] mt-1">Lưu lại thông tin đăng nhập bên dưới</p>
          </div>
          <div className="bg-[#f5f5f5] rounded-[12px] p-4 w-full flex flex-col gap-3">
            <Row label="Tên đăng nhập"><span className="font-semibold text-[#202325]">{created.user?.username || form.username}</span></Row>
            {created.tempPassword && (
              <Row label="Mật khẩu tạm thời">
                <span className="font-mono font-bold text-[#025cca] tracking-widest">{created.tempPassword}</span>
              </Row>
            )}
            <Row label="Vai trò"><RoleBadge role={created.user?.role || form.role} /></Row>
          </div>
          <p className="text-[12px] text-[#636566] text-center">Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.</p>
          <button onClick={() => { onCreated(); onClose() }}
            className="w-full h-[52px] bg-[#025cca] rounded-[12px] text-[15px] font-semibold text-white hover:bg-[#0250b0] transition-colors">
            Đóng
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Thêm người dùng" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.api && (
          <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-[13px] text-red-600">{errors.api}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tên đăng nhập" required error={errors.username}>
            <FInput placeholder="vd: nguyen_van_a" value={form.username} onChange={e => set('username', e.target.value)} />
          </Field>
          <Field label="Họ và tên" required error={errors.fullName}>
            <FInput placeholder="Nguyễn Văn A" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          </Field>
        </div>
        <Field label="Email" error={errors.email}>
          <FInput type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Số điện thoại" error={errors.phone}>
          <FInput placeholder="0987654321" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </Field>
        <Field label="Vai trò" required>
          <FSelect value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_MAP[r]?.label || r}</option>)}
          </FSelect>
        </Field>
        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onClose}
            className="flex-1 h-[52px] bg-[#f5f5f5] rounded-[12px] text-[15px] font-medium text-[#202325] hover:bg-[#e8e8e8] transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 h-[52px] bg-[#025cca] rounded-[12px] text-[15px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-60">
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-[#636566] shrink-0">{label}</span>
      {children}
    </div>
  )
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({ fullName: user.fullName || '', email: user.email || '', phone: user.phone || '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Bắt buộc'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    if (form.phone && !/^0\d{9,10}$/.test(form.phone)) e.phone = 'Bắt đầu bằng 0, 10-11 chữ số'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await usersApi.updateUser(user.id, form)
      onUpdated()
      onClose()
    } catch (err) {
      setErrors({ api: err.response?.data?.message || 'Đã có lỗi xảy ra' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Chỉnh sửa — ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.api && (
          <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-[13px] text-red-600">{errors.api}</div>
        )}
        <div className="bg-[#f5f5f5] rounded-[12px] p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
            style={{ backgroundColor: getAvatarColor(user.username) }}>
            {getInitials(user.fullName || user.username)}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#202325]">{user.username}</p>
            <RoleBadge role={user.role} />
          </div>
        </div>
        <Field label="Họ và tên" required error={errors.fullName}>
          <FInput value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        </Field>
        <Field label="Email" error={errors.email}>
          <FInput type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Số điện thoại" error={errors.phone}>
          <FInput value={form.phone} onChange={e => set('phone', e.target.value)} />
        </Field>
        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onClose}
            className="flex-1 h-[52px] bg-[#f5f5f5] rounded-[12px] text-[15px] font-medium text-[#202325] hover:bg-[#e8e8e8] transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 h-[52px] bg-[#025cca] rounded-[12px] text-[15px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-60">
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({ user, onClose, onConfirmed }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setLoading(true)
    try {
      await usersApi.deleteUser(user.id)
      onConfirmed()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Xóa tài khoản" onClose={onClose} maxWidth="max-w-[400px]">
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <TrashIcon />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold text-[#202325]">
            Xóa tài khoản <span className="text-[#025cca]">{user.username}</span>?
          </p>
          <p className="text-[13px] text-[#636566] mt-1 leading-[1.6]">
            Hành động này không thể hoàn tác. Tài khoản và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.
          </p>
        </div>
        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}
        <div className="flex gap-3 w-full">
          <button onClick={onClose}
            className="flex-1 h-[52px] bg-[#f5f5f5] rounded-[12px] text-[15px] font-medium text-[#202325] hover:bg-[#e8e8e8] transition-colors">
            Hủy
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 h-[52px] bg-red-500 rounded-[12px] text-[15px] font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-60">
            {loading ? 'Đang xóa...' : 'Xóa tài khoản'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1) return null
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  const pages = []
  const start = Math.max(0, page - 2)
  const end = Math.min(totalPages - 1, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-[#e8e8e8]">
      <p className="text-[13px] text-[#636566]">
        Hiển thị <span className="font-semibold text-[#202325]">{from}–{to}</span> / {total} tài khoản
      </p>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </PageBtn>
        {start > 0 && <><PageBtn onClick={() => onPageChange(0)}>1</PageBtn><span className="px-1 text-[#636566]">…</span></>}
        {pages.map(p => (
          <PageBtn key={p} active={p === page} onClick={() => onPageChange(p)}>{p + 1}</PageBtn>
        ))}
        {end < totalPages - 1 && <><span className="px-1 text-[#636566]">…</span><PageBtn onClick={() => onPageChange(totalPages - 1)}>{totalPages}</PageBtn></>}
        <PageBtn disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </PageBtn>
      </div>
    </div>
  )
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-[13px] font-medium transition-colors ${
        active ? 'bg-[#025cca] text-white' : disabled ? 'text-[#c0c0c0] cursor-not-allowed' : 'text-[#636566] hover:bg-[#f5f5f5]'
      }`}>
      {children}
    </button>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({ user, currentRole, onEdit, onDelete, onUnlock }) {
  const isAdmin = currentRole === 'ADMIN'
  const color = getAvatarColor(user.username)

  return (
    <tr className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
            style={{ backgroundColor: color }}>
            {getInitials(user.fullName || user.username)}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#202325] truncate">{user.fullName || '—'}</p>
            <p className="text-[12px] text-[#636566]">@{user.username}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] text-[#202325]">{user.email || '—'}</p>
          <p className="text-[12px] text-[#636566]">{user.phone || '—'}</p>
        </div>
      </td>
      <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
      <td className="px-6 py-4"><StatusBadge status={user.status} /></td>
      <td className="px-6 py-4 text-[13px] text-[#636566]">{fmtDate(user.createdAt)}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <ActionBtn title="Chỉnh sửa" color="blue" onClick={() => onEdit(user)}>
            <EditIcon />
          </ActionBtn>
          {isAdmin && user.status === 'LOCKED' && (
            <ActionBtn title="Mở khóa" color="green" onClick={() => onUnlock(user)}>
              <UnlockIcon />
            </ActionBtn>
          )}
          {isAdmin && (
            <ActionBtn title="Xóa" color="red" onClick={() => onDelete(user)}>
              <TrashIcon />
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  )
}

function ActionBtn({ title, color, onClick, children }) {
  const colors = {
    blue:  'text-[#025cca] hover:bg-[#dceefe]',
    green: 'text-[#059669] hover:bg-[#d1fae5]',
    red:   'text-red-500 hover:bg-red-50',
  }
  return (
    <button title={title} onClick={onClick}
      className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors ${colors[color]}`}>
      {children}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'ADMIN'

  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data } = await usersApi.listUsers()
      setAllUsers(data.data || [])
    } catch {
      showToast('Không thể tải danh sách người dùng', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  // Client-side filter
  const filtered = allUsers.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.username?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchRole = !roleFilter || u.role === roleFilter
    const matchStatus = !statusFilter || u.status === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0) }, [search, roleFilter, statusFilter])

  // Stats
  const stats = {
    total: allUsers.length,
    active: allUsers.filter(u => u.status === 'ACTIVE').length,
    locked: allUsers.filter(u => u.status === 'LOCKED').length,
    pending: allUsers.filter(u => u.status === 'UN_ACTIVE').length,
  }

  async function handleUnlock(user) {
    try {
      await usersApi.unlockUser(user.id)
      showToast(`Đã mở khóa tài khoản ${user.username}`)
      fetchUsers()
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể mở khóa tài khoản', 'error')
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f5f5f5]">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#202325]">Quản lý người dùng</h1>
              <p className="text-[14px] text-[#636566] mt-0.5">{allUsers.length} tài khoản trong hệ thống</p>
            </div>
            {isAdmin && (
              <button onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 h-[44px] px-5 bg-[#025cca] text-white rounded-[12px] text-[14px] font-semibold hover:bg-[#0250b0] transition-colors">
                <PlusIcon />
                Thêm người dùng
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <StatCard label="Tổng tài khoản" value={stats.total} bgColor="#025cca" iconBg="#dceefe"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
            />
            <StatCard label="Đang hoạt động" value={stats.active} bgColor="#059669" iconBg="#d1fae5"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard label="Bị khóa" value={stats.locked} bgColor="#dc2626" iconBg="#fee2e2"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>}
            />
            <StatCard label="Chưa kích hoạt" value={stats.pending} bgColor="#d97706" iconBg="#fef3c7"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>

          {/* Table card */}
          <div className="bg-white rounded-[16px] flex flex-col overflow-hidden flex-1 min-h-0">
            {/* Filters */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e8e8e8]">
              <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-[12px] px-4 h-[40px] flex-1 max-w-[320px]">
                <SearchIcon />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên, username, email..."
                  className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none" />
                {search && (
                  <button onClick={() => setSearch('')} className="text-[#636566] hover:text-[#202325]">
                    <XIcon size={4} />
                  </button>
                )}
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                className="bg-[#f5f5f5] h-[40px] px-3 rounded-[12px] text-[14px] text-[#636566] outline-none appearance-none cursor-pointer border border-transparent focus:border-[#025cca]">
                <option value="">Tất cả vai trò</option>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_MAP[r]?.label || r}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#f5f5f5] h-[40px] px-3 rounded-[12px] text-[14px] text-[#636566] outline-none appearance-none cursor-pointer border border-transparent focus:border-[#025cca]">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(search || roleFilter || statusFilter) && (
                <button onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}
                  className="text-[13px] text-[#636566] hover:text-red-500 transition-colors">
                  Xóa bộ lọc
                </button>
              )}
              <span className="ml-auto text-[13px] text-[#636566]">{filtered.length} kết quả</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-2 border-[#025cca] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pageUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#636566]">
                  <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <p className="text-[15px] font-medium">Không tìm thấy tài khoản nào</p>
                  <p className="text-[13px]">Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8e8]">
                      {['Nhân viên', 'Liên hệ', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-[12px] font-semibold text-[#636566] uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageUsers.map(u => (
                      <UserRow key={u.id} user={u} currentRole={currentUser?.role}
                        onEdit={setEditTarget}
                        onDelete={setDeleteTarget}
                        onUnlock={handleUnlock}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination page={page} totalPages={totalPages} total={filtered.length}
              pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </main>
      </div>

      {/* Modals */}
      {addOpen && (
        <AddUserModal
          onClose={() => setAddOpen(false)}
          onCreated={() => { fetchUsers(); showToast('Tài khoản đã được tạo thành công') }}
        />
      )}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => { fetchUsers(); showToast('Cập nhật thành công') }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={() => { fetchUsers(); showToast('Đã xóa tài khoản') }}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
