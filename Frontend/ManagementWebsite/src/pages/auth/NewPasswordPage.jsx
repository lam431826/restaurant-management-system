import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { resetPassword } from '../../api/auth'

function LockIcon() {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function NewPasswordPage() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')

  useEffect(() => {
    setMaskedEmail(sessionStorage.getItem('reset_masked_email') || '')
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (otp.length !== 6) { setError('Mã OTP phải có 6 chữ số.'); return }
    if (newPassword.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return }

    const resetToken = sessionStorage.getItem('reset_token')
    if (!resetToken) {
      navigate('/forgot-password')
      return
    }

    setError('')
    setLoading(true)
    try {
      await resetPassword(resetToken, otp, newPassword)
      sessionStorage.removeItem('reset_token')
      sessionStorage.removeItem('reset_masked_email')
      navigate('/login')
    } catch (err) {
      const status = err.response?.status
      if (status === 401) setError('Mã OTP không đúng hoặc đã hết hạn.')
      else if (status === 429) setError('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau.')
      else setError(err.response?.data?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle="Nhập mã OTP và mật khẩu mới của bạn">
      {maskedEmail && (
        <p className="text-[13px] text-[#636566] leading-[1.5] -mt-2">
          Mã OTP đã được gửi tới <strong className="text-[#202325]">{maskedEmail}</strong>
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
        {/* OTP */}
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">Mã OTP</label>
          <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
            <span className="text-[#797b7c]"><LockIcon /></span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Nhập 6 chữ số"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5] tracking-widest"
            />
          </div>
        </div>

        {/* New Password */}
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">Mật khẩu mới</label>
          <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
            <span className="text-[#797b7c]"><LockIcon /></span>
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]"
            />
            <button type="button" onClick={() => setShowNew(v => !v)} className="text-[#797b7c] hover:text-[#202325]">
              {showNew ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">Xác nhận mật khẩu</label>
          <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
            <span className="text-[#797b7c]"><LockIcon /></span>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]"
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-[#797b7c] hover:text-[#202325]">
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {error && <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-60"
        >
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang xử lý...' : 'Xác Nhận'}
          </span>
        </button>
      </form>

      <button
        onClick={() => navigate('/forgot-password')}
        className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-left"
      >
        Quay lại
      </button>
    </AuthLayout>
  )
}
