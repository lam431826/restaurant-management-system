import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../api/auth'
import {
  listUsers, createUser, updateUser, deleteUser, unlockUser,
  type UserDto,
} from '../../api/users'
import ChangePasswordModal from '../auth/ChangePasswordModal'
import { SwitchScreenIcon } from '../cashier/orders/icons'

/* ── Constants ────────────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  UN_ACTIVE: 'Chưa kích hoạt',
  ACTIVE: 'Hoạt động',
  LOCKED: 'Bị khóa',
  INACTIVE: 'Vô hiệu',
}
const STATUS_CLS: Record<string, string> = {
  UN_ACTIVE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  LOCKED: 'bg-red-100 text-red-700 border-red-200',
  INACTIVE: 'bg-gray-100 text-gray-500 border-gray-200',
}
const ROLE_LABEL: Record<string, string> = {
  WAITER: 'Phục vụ',
  CASHIER: 'Thu ngân',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
}
const ROLE_CLS: Record<string, string> = {
  WAITER: 'bg-blue-100 text-blue-700',
  CASHIER: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-orange-100 text-orange-700',
  ADMIN: 'bg-red-100 text-red-600',
}
const ALL_ROLES = ['WAITER', 'CASHIER', 'MANAGER', 'ADMIN']
const ALL_STATUSES = ['UN_ACTIVE', 'ACTIVE', 'LOCKED', 'INACTIVE']

const inputCls =
  'w-full h-10 px-3 bg-[#f5f5f5] border border-[#e8e8e8] rounded-[10px] text-[14px] text-[#202325] ' +
  'placeholder-[#797b7c] outline-none focus:border-[#025cca] focus:bg-white transition-colors'

/* ── Icons ────────────────────────────────────────────────────────────────── */
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)
const SearchIcon = () => (
  <svg className="w-4 h-4 shrink-0 text-[#797b7c]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx={11} cy={11} r={8} /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
  </svg>
)
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const ChevronDownIcon = ({ cls = 'w-4 h-4' }: { cls?: string }) => (
  <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)
const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
)
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
)
const LockOpenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
)

/* ── Badge ────────────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border ${STATUS_CLS[status] ?? 'bg-gray-100 text-gray-500'}`}>
    {STATUS_LABEL[status] ?? status}
  </span>
)
const RoleBadge = ({ role }: { role: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[12px] font-medium ${ROLE_CLS[role] ?? 'bg-gray-100 text-gray-600'}`}>
    {ROLE_LABEL[role] ?? role}
  </span>
)

/* ── Select dropdown ──────────────────────────────────────────────────────── */
const Select = ({ value, placeholder, options, onChange }: {
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 h-10 px-3 bg-[#f5f5f5] border rounded-[10px] text-[14px] min-w-[150px] transition-colors ${open ? 'border-[#025cca] bg-white' : 'border-[#e8e8e8]'}`}>
        <span className={selected ? 'text-[#202325]' : 'text-[#797b7c]'}>{selected?.label ?? placeholder}</span>
        <ChevronDownIcon cls={`w-4 h-4 text-[#797b7c] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 bg-white border border-[#e8e8e8] rounded-[10px] shadow-lg z-50 py-1 min-w-full">
          <div className="px-3 py-2 text-[13px] text-[#797b7c] cursor-pointer hover:bg-[#f5f5f5]"
            onClick={() => { onChange(''); setOpen(false) }}>{placeholder}</div>
          {options.map(o => (
            <div key={o.value}
              className={`px-3 py-2 text-[14px] cursor-pointer hover:bg-[#f5f5f5] ${o.value === value ? 'text-[#025cca] font-medium bg-[#f0f8ff]' : 'text-[#202325]'}`}
              onClick={() => { onChange(o.value); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="bg-white rounded-[14px] border border-[#e8e8e8] px-5 py-4 flex flex-col gap-1">
    <span className="text-[13px] text-[#636566]">{label}</span>
    <span className={`text-[28px] font-bold ${color}`}>{value}</span>
  </div>
)

/* ── Toast ────────────────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onDismiss }: { msg: string; type: 'success' | 'error'; onDismiss: () => void }) => (
  <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-[12px] shadow-lg text-[14px] font-medium
    ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
    {msg}
    <button onClick={onDismiss} className="opacity-70 hover:opacity-100"><XIcon /></button>
  </div>
)

/* ── Header ───────────────────────────────────────────────────────────────── */
const AdminHeader = ({ onLogout, onChangePassword }: { onLogout: () => void; onChangePassword: () => void }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const initials = (user?.fullName ?? user?.username ?? 'A').split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
  return (
    <header className="bg-white border-b border-[#e8e8e8] flex items-center justify-between px-6 h-[64px] shrink-0 z-[50]">
      <div className="flex items-center gap-4">
        <img src="/images/wasabi-logo.svg" alt="Wasabi" className="h-12 w-auto" />
        <div className="h-6 w-px bg-[#e8e8e8]" />
        <span className="text-[15px] font-semibold text-[#202325]">Quản trị hệ thống</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#5B8FE8] flex items-center justify-center text-white text-[13px] font-semibold">{initials}</div>
            <div className="flex flex-col items-start leading-tight text-left">
              <span className="text-[14px] font-medium text-[#202325]">{user?.fullName ?? user?.username}</span>
              <span className="text-[12px] text-[#636566]">Quản trị viên</span>
            </div>
            <ChevronDownIcon cls={`w-4 h-4 text-[#797b7c] transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-[#e8e8e8] rounded-[12px] shadow-lg w-[200px] py-1 z-50">
              <div className="px-4 py-2 border-b border-[#e8e8e8]">
                <p className="text-[14px] font-semibold text-[#202325] truncate">{user?.fullName ?? user?.username}</p>
                <p className="text-[12px] text-[#636566]">Quản trị viên</p>
              </div>
              <button onClick={() => { setOpen(false); navigate('/my-profile') }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors">
                <SwitchScreenIcon />
                Hồ sơ của tôi
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button onClick={() => { setOpen(false); onChangePassword() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Đổi mật khẩu
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button onClick={() => { setOpen(false); onLogout() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 transition-colors">
                <LogoutIcon />Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/* ── Create modal ─────────────────────────────────────────────────────────── */
interface CreateForm { username: string; fullName: string; email: string; phone: string; role: string }
const CreateModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (user: UserDto, tempPw: string) => void }) => {
  const [form, setForm] = useState<CreateForm>({ username: '', fullName: '', email: '', phone: '', role: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<CreateForm>>({})
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { usernameRef.current?.focus() }, [])

  const validate = (): boolean => {
    const e: Partial<CreateForm> = {}
    if (!form.username.trim()) e.username = 'Bắt buộc'
    if (!form.fullName.trim()) e.fullName = 'Bắt buộc'
    if (!form.role) e.role = 'Bắt buộc'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    if (form.phone && !/^0\d{9,10}$/.test(form.phone)) e.phone = 'SĐT phải bắt đầu bằng 0, 10-11 chữ số'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await createUser({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: form.role,
      })
      onCreated(res.data.data.user, res.data.data.tempPassword)
    } catch (err: any) {
      const code = err.response?.data?.error
      const msg = err.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại'
      if (code === 'DUPLICATE_USERNAME') setErrors({ username: 'Tên đăng nhập đã tồn tại' })
      else if (code === 'DUPLICATE_EMAIL') setErrors({ email: 'Email đã được sử dụng' })
      else if (code === 'DUPLICATE_PHONE') setErrors({ phone: 'Số điện thoại đã được sử dụng' })
      else setErrors({ username: msg })
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof CreateForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      if (errors[key]) setErrors(ev => ({ ...ev, [key]: undefined }))
    },
  })

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-[500px] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8]">
          <h3 className="text-[18px] font-bold text-[#202325]">Thêm nhân viên mới</h3>
          <button onClick={onClose} className="text-[#797b7c] hover:text-[#202325] p-1"><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#202325]">Tên đăng nhập <span className="text-red-500">*</span></label>
              <input ref={usernameRef} {...field('username')} placeholder="vd: nguyen.van.a" className={inputCls} />
              {errors.username && <p className="text-[12px] text-red-500">{errors.username}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#202325]">Họ và tên <span className="text-red-500">*</span></label>
              <input {...field('fullName')} placeholder="Nguyễn Văn A" className={inputCls} />
              {errors.fullName && <p className="text-[12px] text-red-500">{errors.fullName}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#202325]">Email</label>
              <input {...field('email')} type="email" placeholder="email@example.com" className={inputCls} />
              {errors.email && <p className="text-[12px] text-red-500">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#202325]">Số điện thoại</label>
              <input {...field('phone')} inputMode="tel" placeholder="0901234567" className={inputCls} />
              {errors.phone && <p className="text-[12px] text-red-500">{errors.phone}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#202325]">Vai trò <span className="text-red-500">*</span></label>
            <select
              value={form.role}
              onChange={e => { setForm(f => ({ ...f, role: e.target.value })); if (errors.role) setErrors(ev => ({ ...ev, role: undefined })) }}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="">-- Chọn vai trò --</option>
              {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            {errors.role && <p className="text-[12px] text-red-500">{errors.role}</p>}
          </div>
          <p className="text-[12px] text-[#797b7c]">
            Hệ thống sẽ tạo mật khẩu tạm thời và gửi email kích hoạt tài khoản.
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-[#e8e8e8] rounded-[10px] text-[14px] font-medium text-[#636566] hover:bg-[#f5f5f5] transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-10 bg-[#025cca] rounded-[10px] text-[14px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Temp password modal ──────────────────────────────────────────────────── */
const TempPasswordModal = ({ user, tempPassword, onClose }: { user: UserDto; tempPassword: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-[16px] shadow-xl w-[440px] p-6 flex flex-col gap-5">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-[18px] font-bold text-[#202325]">Tạo tài khoản thành công!</h3>
          <p className="text-[14px] text-[#636566] mt-1">
            Tài khoản <strong className="text-[#202325]">{user.username}</strong> đã được tạo.
          </p>
        </div>
        <div className="bg-[#f5f5f5] rounded-[12px] p-4">
          <p className="text-[12px] text-[#636566] mb-2">Mật khẩu tạm thời (chỉ hiển thị 1 lần)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[16px] font-bold text-[#202325] font-mono tracking-wider">{tempPassword}</code>
            <button onClick={copy} className={`flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-[#e8e8e8] text-[#636566] hover:bg-[#f0f8ff] hover:text-[#025cca]'}`}>
              <CopyIcon />{copied ? 'Đã chép' : 'Chép'}
            </button>
          </div>
        </div>
        <p className="text-[12px] text-[#797b7c] text-center">
          Vui lòng gửi mật khẩu này cho nhân viên. Họ sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
        </p>
        <button onClick={onClose}
          className="w-full h-10 bg-[#025cca] rounded-[10px] text-[14px] font-semibold text-white hover:bg-[#0250b0] transition-colors">
          Đã hiểu
        </button>
      </div>
    </div>
  )
}

/* ── Edit modal ───────────────────────────────────────────────────────────── */
const EditModal = ({ user, isSelf, onClose, onSaved }: { user: UserDto; isSelf: boolean; onClose: () => void; onSaved: (u: UserDto) => void }) => {
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [email, setEmail] = useState(user.email ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [role, setRole] = useState(user.role)
  const [status, setStatus] = useState(user.status)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fullNameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { fullNameRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!fullName.trim()) errs.fullName = 'Bắt buộc'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email không hợp lệ'
    if (phone && !/^0\d{9,10}$/.test(phone)) errs.phone = 'SĐT phải bắt đầu bằng 0, 10-11 chữ số'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await updateUser(user.id, {
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: isSelf ? undefined : role,
        status: isSelf ? undefined : status,
      })
      onSaved(res.data.data)
    } catch (err: any) {
      const code = err.response?.data?.error
      const msg = err.response?.data?.message ?? 'Có lỗi xảy ra'
      if (code === 'DUPLICATE_EMAIL') setErrors({ email: 'Email đã được sử dụng' })
      else if (code === 'DUPLICATE_PHONE') setErrors({ phone: 'Số điện thoại đã được sử dụng' })
      else setErrors({ fullName: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-[500px] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8]">
          <h3 className="text-[18px] font-bold text-[#202325]">Cập nhật nhân viên</h3>
          <button onClick={onClose} className="text-[#797b7c] hover:text-[#202325] p-1"><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Username info row */}
          <div className="bg-[#f5f5f5] rounded-[10px] px-4 py-3">
            <p className="text-[12px] text-[#797b7c]">Tên đăng nhập</p>
            <p className="text-[14px] font-semibold text-[#202325]">{user.username}</p>
          </div>

          {/* fullName */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#202325]">Họ và tên <span className="text-red-500">*</span></label>
            <input ref={fullNameRef} value={fullName} onChange={e => { setFullName(e.target.value); setErrors(ev => ({ ...ev, fullName: '' })) }}
              className={inputCls} placeholder="Họ và tên" />
            {errors.fullName && <p className="text-[12px] text-red-500">{errors.fullName}</p>}
          </div>

          {/* email + phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#202325]">Email</label>
              <input value={email} onChange={e => { setEmail(e.target.value); setErrors(ev => ({ ...ev, email: '' })) }}
                type="email" placeholder="email@example.com" className={inputCls} />
              {errors.email && <p className="text-[12px] text-red-500">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#202325]">Số điện thoại</label>
              <input value={phone} onChange={e => { setPhone(e.target.value); setErrors(ev => ({ ...ev, phone: '' })) }}
                inputMode="tel" placeholder="0901234567" className={inputCls} />
              {errors.phone && <p className="text-[12px] text-red-500">{errors.phone}</p>}
            </div>
          </div>

          {/* Role + Status — hidden for self to prevent lockout */}
          {isSelf ? (
            <p className="text-[12px] text-[#797b7c] bg-yellow-50 border border-yellow-200 rounded-[8px] px-3 py-2">
              Không thể thay đổi vai trò và trạng thái của chính mình.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#202325]">Vai trò</label>
                <select value={role} onChange={e => setRole(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#202325]">Trạng thái</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-[#e8e8e8] rounded-[10px] text-[14px] font-medium text-[#636566] hover:bg-[#f5f5f5] transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-10 bg-[#025cca] rounded-[10px] text-[14px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Confirm modal ────────────────────────────────────────────────────────── */
const ConfirmModal = ({ title, body, confirmLabel, danger, loading, onConfirm, onClose }: {
  title: string; body: string; confirmLabel: string; danger?: boolean
  loading: boolean; onConfirm: () => void; onClose: () => void
}) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <div className="relative bg-white rounded-[16px] shadow-xl w-[400px] p-6 flex flex-col gap-4">
      <h3 className="text-[17px] font-bold text-[#202325]">{title}</h3>
      <p className="text-[14px] text-[#636566] leading-relaxed">{body}</p>
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 h-10 border border-[#e8e8e8] rounded-[10px] text-[14px] font-medium text-[#636566] hover:bg-[#f5f5f5] transition-colors">
          Hủy
        </button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 h-10 rounded-[10px] text-[14px] font-semibold text-white transition-colors disabled:opacity-50
            ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#025cca] hover:bg-[#0250b0]'}`}>
          {loading ? 'Đang xử lý...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
)

/* ── Main ─────────────────────────────────────────────────────────────────── */
type Modal =
  | { type: 'create' }
  | { type: 'tempPw'; user: UserDto; pw: string }
  | { type: 'edit'; user: UserDto }
  | { type: 'delete'; user: UserDto }
  | { type: 'unlock'; user: UserDto }

const PAGE_SIZE = 5

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { user: me, signOut } = useAuth()

  const [users, setUsers] = useState<UserDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [modal, setModal] = useState<Modal | null>(null)
  const [showChangePw, setShowChangePw] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchUsers = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const res = await listUsers(p, PAGE_SIZE)
      setUsers(res.data.data)
      setTotal(res.data.pagination.total)
      setTotalPages(res.data.pagination.totalPages)
      setPage(p)
    } catch {
      showToast('Không thể tải danh sách nhân viên', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers(0) }, [fetchUsers])

  const handleLogout = async () => {
    try { await logout() } catch { /* ignore */ }
    signOut()
    navigate('/login', { replace: true })
  }

  /* Derived: filter client-side on current page */
  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false
    if (filterStatus && u.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${u.username} ${u.fullName} ${u.email ?? ''} ${u.phone ?? ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  /* Stats from full loaded page */
  const stats = {
    total,
    active: users.filter(u => u.status === 'ACTIVE').length,
    locked: users.filter(u => u.status === 'LOCKED').length,
    inactive: users.filter(u => u.status === 'INACTIVE').length,
    unactive: users.filter(u => u.status === 'UN_ACTIVE').length,
  }

  /* Actions */
  const handleCreated = (user: UserDto, pw: string) => {
    setModal({ type: 'tempPw', user, pw })
    fetchUsers(0)
  }

  const handleSaved = (updated: UserDto) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    setModal(null)
    showToast('Đã cập nhật thông tin nhân viên')
  }

  const handleDelete = async () => {
    if (modal?.type !== 'delete') return
    setConfirmLoading(true)
    try {
      await deleteUser(modal.user.id)
      setUsers(prev => prev.map(u => u.id === modal.user.id ? { ...u, status: 'INACTIVE' } : u))
      setModal(null)
      showToast('Đã vô hiệu hóa tài khoản')
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Có lỗi xảy ra', 'error')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (modal?.type !== 'unlock') return
    setConfirmLoading(true)
    try {
      await unlockUser(modal.user.id)
      setUsers(prev => prev.map(u => u.id === modal.user.id ? { ...u, status: 'ACTIVE' } : u))
      setModal(null)
      showToast('Đã mở khóa tài khoản thành công')
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Có lỗi xảy ra', 'error')
    } finally {
      setConfirmLoading(false)
    }
  }

  const th = 'text-left text-[12px] font-semibold text-[#636566] uppercase tracking-wide px-4 py-3 bg-[#f5f5f5] border-b border-[#e8e8e8] whitespace-nowrap'
  const td = 'px-4 py-3 text-[14px] text-[#202325] border-b border-[#e8e8e8] align-middle'

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col">
      <AdminHeader onLogout={handleLogout} onChangePassword={() => setShowChangePw(true)} />

      <main className="flex-1 px-6 py-5 flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Tổng nhân viên" value={total} color="text-[#202325]" />
          <StatCard label="Đang hoạt động" value={stats.active} color="text-green-600" />
          <StatCard label="Chưa kích hoạt" value={stats.unactive} color="text-yellow-600" />
          <StatCard label="Bị khóa" value={stats.locked} color="text-red-600" />
          <StatCard label="Vô hiệu hóa" value={stats.inactive} color="text-gray-400" />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-[14px] border border-[#e8e8e8] flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#e8e8e8] flex-wrap">
            <h2 className="text-[16px] font-bold text-[#202325]">Danh sách nhân viên</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="flex items-center gap-2 h-10 px-3 bg-[#f5f5f5] border border-[#e8e8e8] rounded-[10px] min-w-[220px]">
                <SearchIcon />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm tên, username, email..."
                  className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none" />
                {search && (
                  <button onClick={() => setSearch('')} className="text-[#797b7c] hover:text-[#202325]">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Role filter */}
              <Select
                value={filterRole}
                placeholder="Tất cả vai trò"
                options={ALL_ROLES.map(r => ({ value: r, label: ROLE_LABEL[r] }))}
                onChange={setFilterRole}
              />
              {/* Status filter */}
              <Select
                value={filterStatus}
                placeholder="Tất cả trạng thái"
                options={ALL_STATUSES.map(s => ({ value: s, label: STATUS_LABEL[s] }))}
                onChange={setFilterStatus}
              />
              {/* Refresh */}
              <button onClick={() => fetchUsers(page)} disabled={loading}
                className="h-10 w-10 flex items-center justify-center bg-[#f5f5f5] border border-[#e8e8e8] rounded-[10px] text-[#636566] hover:bg-white transition-colors disabled:opacity-50">
                <RefreshIcon />
              </button>
              {/* Add */}
              <button onClick={() => setModal({ type: 'create' })}
                className="flex items-center gap-1.5 h-10 px-4 bg-[#025cca] rounded-[10px] text-[14px] font-semibold text-white hover:bg-[#0250b0] transition-colors">
                <PlusIcon />Thêm nhân viên
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Username</th>
                  <th className={th}>Họ và tên</th>
                  <th className={th}>Email</th>
                  <th className={th}>SĐT</th>
                  <th className={th}>Vai trò</th>
                  <th className={th}>Trạng thái</th>
                  <th className={th}>Ngày tạo</th>
                  <th className={`${th} text-center`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-[14px] text-[#797b7c]">
                      <div className="inline-block w-6 h-6 border-2 border-[#025cca] border-t-transparent rounded-full animate-spin mr-2" />
                      Đang tải...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-[14px] text-[#797b7c]">
                      Không tìm thấy nhân viên nào.
                    </td>
                  </tr>
                )}
                {!loading && filtered.map(u => (
                  <tr key={u.id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className={`${td} font-medium text-[#025cca]`}>{u.username}</td>
                    <td className={td}>{u.fullName}</td>
                    <td className={`${td} text-[#636566]`}>{u.email ?? '—'}</td>
                    <td className={`${td} text-[#636566]`}>{u.phone ?? '—'}</td>
                    <td className={td}><RoleBadge role={u.role} /></td>
                    <td className={td}><StatusBadge status={u.status} /></td>
                    <td className={`${td} text-[#797b7c] text-[13px]`}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className={`${td} text-center`}>
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit — MANAGER can too; ADMIN always shown */}
                        <button onClick={() => setModal({ type: 'edit', user: u })}
                          title="Sửa thông tin"
                          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#636566] hover:bg-[#f0f8ff] hover:text-[#025cca] transition-colors">
                          <EditIcon />
                        </button>
                        {/* Unlock — only for LOCKED */}
                        {u.status === 'LOCKED' && u.id !== me?.id && (
                          <button onClick={() => setModal({ type: 'unlock', user: u })}
                            title="Mở khóa tài khoản"
                            className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#636566] hover:bg-green-50 hover:text-green-600 transition-colors">
                            <LockOpenIcon />
                          </button>
                        )}
                        {/* Deactivate — only for non-INACTIVE users, not self */}
                        {u.status !== 'INACTIVE' && u.id !== me?.id && (
                          <button onClick={() => setModal({ type: 'delete', user: u })}
                            title="Vô hiệu hóa tài khoản"
                            className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#636566] hover:bg-red-50 hover:text-red-500 transition-colors">
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#e8e8e8]">
              <span className="text-[13px] text-[#797b7c]">
                Trang {page + 1} / {totalPages} · {total} nhân viên
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page === 0} onClick={() => fetchUsers(page - 1)}
                  className="h-8 px-3 text-[13px] border border-[#e8e8e8] rounded-[8px] disabled:opacity-40 hover:bg-[#f5f5f5] transition-colors">
                  ← Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => fetchUsers(i)}
                    className={`h-8 w-8 text-[13px] rounded-[8px] transition-colors ${i === page ? 'bg-[#025cca] text-white' : 'border border-[#e8e8e8] hover:bg-[#f5f5f5]'}`}>
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages - 1} onClick={() => fetchUsers(page + 1)}
                  className="h-8 px-3 text-[13px] border border-[#e8e8e8] rounded-[8px] disabled:opacity-40 hover:bg-[#f5f5f5] transition-colors">
                  Sau →
                </button>
              </div>
            </div>
          )}
          {!loading && totalPages <= 1 && total > 0 && (
            <div className="px-5 py-3 border-t border-[#e8e8e8]">
              <span className="text-[13px] text-[#797b7c]">{filtered.length} / {total} nhân viên</span>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {modal?.type === 'create' && (
        <CreateModal onClose={() => setModal(null)} onCreated={handleCreated} />
      )}
      {modal?.type === 'tempPw' && (
        <TempPasswordModal user={modal.user} tempPassword={modal.pw} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <EditModal user={modal.user} isSelf={modal.user.id === me?.id} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.type === 'delete' && (
        <ConfirmModal
          title="Vô hiệu hóa tài khoản"
          body={`Tài khoản "${modal.user.fullName}" (${modal.user.username}) sẽ bị vô hiệu hóa và không thể đăng nhập. Thao tác này có thể khôi phục bằng cách liên hệ quản trị.`}
          confirmLabel="Vô hiệu hóa"
          danger
          loading={confirmLoading}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'unlock' && (
        <ConfirmModal
          title="Mở khóa tài khoản"
          body={`Tài khoản "${modal.user.fullName}" (${modal.user.username}) sẽ được mở khóa và có thể đăng nhập trở lại.`}
          confirmLabel="Mở khóa"
          loading={confirmLoading}
          onConfirm={handleUnlock}
          onClose={() => setModal(null)}
        />
      )}

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}

export default AdminDashboard
