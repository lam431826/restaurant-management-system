import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { forgotPassword } from '../../api/auth'

function PersonIcon() {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim()) { setError('Vui lòng nhập tên đăng nhập.'); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await forgotPassword(username.trim())
      // Lưu resetToken để NewPasswordPage dùng
      sessionStorage.setItem('reset_token', data.data.resetToken)
      sessionStorage.setItem('reset_masked_email', data.data.maskedEmail || '')
      navigate('/new-password')
    } catch (err) {
      const status = err.response?.status
      if (status === 404) setError('Tài khoản không tồn tại.')
      else if (status === 403) setError('Tài khoản này không thể đặt lại mật khẩu.')
      else setError(err.response?.data?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập tên đăng nhập để lấy lại mật khẩu">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">Tên đăng nhập</label>
          <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
            <span className="text-[#797b7c]"><PersonIcon /></span>
            <input
              type="text"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]"
            />
          </div>
        </div>

        {error && <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors disabled:opacity-60"
        >
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang xử lý...' : 'Tiếp tục'}
          </span>
        </button>
      </form>

      <button
        onClick={() => navigate('/login')}
        className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-left"
      >
        Quay lại
      </button>
    </AuthLayout>
  )
}
