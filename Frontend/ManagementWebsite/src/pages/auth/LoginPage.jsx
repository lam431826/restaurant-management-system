import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { login, verifyInfo, verifyOtp, resendOtp } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

function PersonIcon() {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

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

function InputField({ label, icon, rightIcon, placeholder, type = 'text', value, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">{label}</label>
      <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
        <span className="text-[#797b7c]">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]"
        />
        {rightIcon && <span className="text-[#797b7c]">{rightIcon}</span>}
      </div>
    </div>
  )
}

// ── Step 1: Username + Password ───────────────────────────────────────────────
function LoginForm({ onSuccess, onFirstLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await login(username.trim(), password)
      if (data.requiresVerification) {
        onFirstLogin(data.verifyToken)
      } else {
        onSuccess(data)
      }
    } catch (err) {
      const msg = err.response?.data?.message
      if (err.response?.status === 401) {
        setError(msg || 'Tài khoản hoặc mật khẩu không đúng.')
      } else if (err.response?.status === 423) {
        setError('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.')
      } else {
        setError(msg || 'Đã có lỗi xảy ra, vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Đăng nhập để bắt đầu làm việc">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
        <InputField
          label="Username"
          icon={<PersonIcon />}
          placeholder="Nhập tài khoản"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <InputField
          label="Password"
          icon={<LockIcon />}
          rightIcon={
            <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[#797b7c] hover:text-[#202325]">
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
          placeholder="Nhập mật khẩu"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && (
          <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-60"
        >
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </span>
        </button>
      </form>

      <button
        onClick={() => navigate('/forgot-password')}
        className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-left"
      >
        Quên mật khẩu
      </button>
    </AuthLayout>
  )
}

// ── Step 2: Gửi OTP tới email (lần đầu đăng nhập) ────────────────────────────
function SendOtpForm({ verifyToken, onOtpSent, onBack }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')

  async function handleSend() {
    setError('')
    setLoading(true)
    try {
      const { data } = await verifyInfo(verifyToken)
      setMaskedEmail(data?.data?.maskedEmail || '')
      onOtpSent()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi OTP. Thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Xác thực tài khoản" subtitle="Đây là lần đăng nhập đầu tiên của bạn">
      <div className="flex flex-col gap-5">
        <p className="text-[14px] text-[#636566] leading-[1.5]">
          Hệ thống sẽ gửi mã OTP 6 số tới email của bạn để kích hoạt tài khoản.
          {maskedEmail && <strong className="text-[#202325]"> ({maskedEmail})</strong>}
        </p>

        {error && <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>}

        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors disabled:opacity-60"
        >
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
          </span>
        </button>

        <button onClick={onBack} className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-left">
          Quay lại
        </button>
      </div>
    </AuthLayout>
  )
}

// ── Step 3: Nhập OTP ──────────────────────────────────────────────────────────
function OtpForm({ verifyToken, onSuccess }) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (otp.length !== 6) { setError('Mã OTP phải có 6 chữ số.'); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await verifyOtp(verifyToken, otp)
      onSuccess(data)
    } catch (err) {
      const status = err.response?.status
      if (status === 429) setError('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau.')
      else setError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setInfo('')
    setResending(true)
    try {
      await resendOtp(verifyToken)
      setInfo('Đã gửi lại mã OTP.')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại OTP.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout title="Nhập mã OTP" subtitle="Kiểm tra email và nhập mã 6 chữ số">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
        <InputField
          label="Mã OTP"
          icon={<LockIcon />}
          placeholder="Nhập 6 chữ số"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />

        {error && <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>}
        {info && <p className="text-[13px] text-green-600 leading-[1.5]">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-60"
        >
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang xác thực...' : 'Xác Nhận'}
          </span>
        </button>
      </form>

      <button
        onClick={handleResend}
        disabled={resending}
        className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-left disabled:opacity-50"
      >
        {resending ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
      </button>
    </AuthLayout>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  // 'login' | 'send-otp' | 'enter-otp'
  const [step, setStep] = useState('login')
  const [verifyToken, setVerifyToken] = useState('')

  function handleSessionSaved(data) {
    saveSession(data)
    const role = data.user?.role
    if (role === 'ADMIN') {
      navigate('/admin', { replace: true })
    } else {
      navigate('/cashier', { replace: true })
    }
  }

  function handleFirstLogin(token) {
    setVerifyToken(token)
    setStep('send-otp')
  }

  if (step === 'send-otp') {
    return (
      <SendOtpForm
        verifyToken={verifyToken}
        onOtpSent={() => setStep('enter-otp')}
        onBack={() => setStep('login')}
      />
    )
  }

  if (step === 'enter-otp') {
    return (
      <OtpForm
        verifyToken={verifyToken}
        onSuccess={handleSessionSaved}
      />
    )
  }

  return (
    <LoginForm
      onSuccess={handleSessionSaved}
      onFirstLogin={handleFirstLogin}
    />
  )
}
