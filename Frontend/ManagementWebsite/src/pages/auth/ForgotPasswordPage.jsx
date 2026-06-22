import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'

function MailIcon() {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: call forgot password API
    navigate('/new-password')
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Nhập email để lấy lại mật khẩu">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">Email</label>
          <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
            <span className="text-[#797b7c]"><MailIcon /></span>
            <input
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors"
        >
          <span className="text-[20px] font-semibold text-white leading-[1.5]">Tiếp tục</span>
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
