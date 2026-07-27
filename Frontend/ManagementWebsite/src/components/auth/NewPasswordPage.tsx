import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { resetPassword } from '../../api/auth'
import { asHttpError } from '../../utils/httpError'

const LockIcon = () => (
  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)

interface InputFieldProps {
  label: string
  placeholder: string
  type?: string
  value: string
  required?: boolean
  error?: string
  hint?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}
const InputField = ({ label, placeholder, type = 'text', value, required, error, hint, onChange }: InputFieldProps) => (
  <div className="flex flex-col gap-3">
    <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className={`bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full border ${error ? 'border-red-400' : 'border-transparent'}`}>
      <span className="text-[#797b7c]"><LockIcon /></span>
      <input type={type} placeholder={placeholder} value={value} aria-invalid={!!error} onChange={onChange}
        className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]" />
    </div>
    <span className={`text-[13px] leading-[1.5] min-h-[1.1em] ${error ? 'text-red-500' : 'text-[#979899]'}`}>
      {error || hint || ''}
    </span>
  </div>
)

const NewPasswordPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { resetToken?: string; maskedEmail?: string } | null

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  if (!state?.resetToken) return <Navigate to="/forgot-password" replace />

  const clearFieldError = (field: string) => {
    setError('')
    setFieldErrors(current => (current[field] ? { ...current, [field]: '' } : current))
  }

  // Mirrors ResetPasswordRequest: otp @Pattern(\d{6}), newPassword @Size(min = 8).
  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {}
    if (otp.length !== 6) next.otp = 'Mã OTP phải đủ 6 chữ số'
    if (!newPassword) next.newPassword = 'Vui lòng nhập mật khẩu mới'
    else if (newPassword.length < 8) next.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự'
    if (!confirmPassword) next.confirmPassword = 'Vui lòng nhập lại mật khẩu mới'
    else if (newPassword !== confirmPassword) next.confirmPassword = 'Mật khẩu xác nhận không khớp'
    return next
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const validationErrors = validate()
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setLoading(true)
    try {
      await resetPassword(state.resetToken!, otp, newPassword)
      navigate('/login', { replace: true, state: { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' } })
    } catch (error: unknown) {
      const err = asHttpError(error)
      const status = err.response?.status
      if (status === 400) setError('Mã OTP không đúng hoặc đã hết hạn.')
      else if (status === 429) setError('Đã nhập sai OTP quá nhiều lần.')
      else setError('Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle={`Nhập mã OTP đã gửi đến ${state.maskedEmail ?? 'email của bạn'}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">
            Mã OTP (6 chữ số)<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className={`bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full border ${fieldErrors.otp ? 'border-red-400' : 'border-transparent'}`}>
            <span className="text-[#797b7c]"><LockIcon /></span>
            <input type="text" placeholder="Nhập mã OTP" value={otp} aria-invalid={!!fieldErrors.otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clearFieldError('otp') }}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]" />
          </div>
          <span className={`text-[13px] leading-[1.5] min-h-[1.1em] ${fieldErrors.otp ? 'text-red-500' : 'text-[#979899]'}`}>
            {fieldErrors.otp || 'Chỉ nhập số, đúng 6 chữ số'}
          </span>
        </div>
        <InputField label="Mật khẩu mới" placeholder="Tối thiểu 8 ký tự" type="password" required
          value={newPassword} error={fieldErrors.newPassword} hint="Tối thiểu 8 ký tự"
          onChange={e => { setNewPassword(e.target.value); clearFieldError('newPassword') }} />
        <InputField label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu mới" type="password" required
          value={confirmPassword} error={fieldErrors.confirmPassword} hint="Phải trùng với mật khẩu mới ở trên"
          onChange={e => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }} />
        {error && <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>}
        <button type="submit" disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </span>
        </button>
      </form>
      <button onClick={() => navigate('/forgot-password')} className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-center">
        ← Quay lại
      </button>
    </AuthLayout>
  )
}

export default NewPasswordPage
