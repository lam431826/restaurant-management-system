import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { resetPassword } from '../../api/auth'

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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}
const InputField = ({ label, placeholder, type = 'text', value, onChange }: InputFieldProps) => (
  <div className="flex flex-col gap-3">
    <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">{label}</label>
    <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
      <span className="text-[#797b7c]"><LockIcon /></span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]" />
    </div>
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

  if (!state?.resetToken) {
    navigate('/forgot-password', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(state.resetToken!, otp, newPassword)
      navigate('/login', { replace: true, state: { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' } })
    } catch (err: any) {
      const status = err.response?.status
      if (status === 401) setError('Mã OTP không đúng hoặc đã hết hạn.')
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
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">Mã OTP (6 chữ số)</label>
          <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
            <span className="text-[#797b7c]"><LockIcon /></span>
            <input type="text" placeholder="Nhập mã OTP" value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]" />
          </div>
        </div>
        <InputField label="Mật khẩu mới" placeholder="Tối thiểu 8 ký tự" type="password"
          value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        <InputField label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu mới" type="password"
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
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
