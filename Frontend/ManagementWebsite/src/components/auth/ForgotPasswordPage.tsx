import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { forgotPassword } from '../../api/auth'

const PersonIcon = () => (
  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await forgotPassword(username)
      const { resetToken, maskedEmail } = res.data.data
      navigate('/new-password', { state: { resetToken, maskedEmail } })
    } catch (err: any) {
      const status = err.response?.status
      if (status === 404) setError('Không tìm thấy tài khoản với tên đăng nhập này.')
      else if (status === 403) setError('Tài khoản không hoạt động.')
      else setError('Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập tên đăng nhập để nhận mã OTP qua email">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">Username</label>
          <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
            <span className="text-[#797b7c]"><PersonIcon /></span>
            <input type="text" placeholder="Nhập tài khoản" value={username} onChange={e => setUsername(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]" />
          </div>
        </div>
        {error && <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>}
        <button type="submit" disabled={loading || !username}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang xử lý...' : 'Gửi OTP'}
          </span>
        </button>
      </form>
      <button onClick={() => navigate('/login')} className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-center">
        ← Quay lại đăng nhập
      </button>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
