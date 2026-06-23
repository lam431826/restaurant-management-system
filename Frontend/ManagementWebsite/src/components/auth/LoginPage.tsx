import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../services/api'

const PersonIcon = () => (
  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)
const LockIcon = () => (
  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)
const EyeIcon = () => (
  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const EyeOffIcon = () => (
  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
)

interface FieldProps {
  label: string
  icon: React.ReactNode
  rightIcon?: React.ReactNode
  placeholder: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}
const InputField = ({ label, icon, rightIcon, placeholder, type = 'text', value, onChange }: FieldProps) => (
  <div className="flex flex-col gap-3">
    <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">{label}</label>
    <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
      <span className="text-[#797b7c]">{icon}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]" />
      {rightIcon && <span className="text-[#797b7c]">{rightIcon}</span>}
    </div>
  </div>
)

type Role = 'manager' | 'waiter' | 'cashier'
const ROLES: { id: Role; label: string; to: string }[] = [
  { id: 'manager', label: 'Quản lý', to: '/manager/dashboard' },
  { id: 'waiter', label: 'Phục vụ', to: '/waiter' },
  { id: 'cashier', label: 'Thu ngân', to: '/cashier' },
]

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>('manager')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      const target = ROLES.find(r => r.id === role)!.to
      navigate(target)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Đăng nhập để bắt đầu làm việc">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
        <InputField label="Username" icon={<PersonIcon />} placeholder="Nhập tài khoản" value={username} onChange={e => setUsername(e.target.value)} />
        <InputField
          label="Password"
          icon={<LockIcon />}
          rightIcon={<button type="button" onClick={() => setShowPassword(v => !v)} className="text-[#797b7c] hover:text-[#202325]">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>}
          placeholder="Nhập mật khẩu"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {/* Role selector */}
        <div className="flex flex-col gap-2 mt-1">
          <label className="text-[14px] font-semibold text-[#202325]">Vai trò</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`h-[44px] rounded-[12px] text-[14px] font-medium border transition-colors ${role === r.id ? 'bg-[#025cca] border-[#025cca] text-white' : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#636566] hover:border-[#025cca]'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[14px] text-[#d92d20] leading-[1.5]">{error}</p>}

        <button type="submit" disabled={submitting} className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          <span className="text-[20px] font-semibold text-white leading-[1.5]">{submitting ? 'Đang đăng nhập...' : 'Đăng Nhập'}</span>
        </button>
      </form>

      <button onClick={() => navigate('/employee-login')} className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-left">
        Đăng nhập nhân viên (PIN)
      </button>
    </AuthLayout>
  )
}

export default LoginPage
