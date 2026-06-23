import { useState } from 'react'
import { changePassword } from '../../api/auth'

const LockIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)

interface PasswordFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}
const PasswordField = ({ label, placeholder, value, onChange }: PasswordFieldProps) => (
  <div className="flex flex-col gap-2">
    <label className="text-[13px] font-semibold text-[#202325]">{label}</label>
    <div className="bg-[#f5f5f5] flex items-center gap-2 h-[42px] px-3 rounded-[10px]">
      <span className="text-[#797b7c]"><LockIcon /></span>
      <input
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
      />
    </div>
  </div>
)

interface Props {
  onClose: () => void
}

const ChangePasswordModal = ({ onClose }: Props) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return }
    if (newPassword.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return }
    if (newPassword === currentPassword) { setError('Mật khẩu mới không được trùng mật khẩu hiện tại.'); return }
    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(true)
    } catch (err: any) {
      const status = err.response?.status
      if (status === 401) setError('Mật khẩu hiện tại không đúng.')
      else if (status === 400) setError(err.response?.data?.message ?? 'Dữ liệu không hợp lệ.')
      else setError('Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = currentPassword && newPassword && confirmPassword && !loading

  return (
    <div className="fixed inset-0 z-[var(--kv-z-modal,9999)] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-[420px] p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-bold text-[#202325]">Đổi mật khẩu</h3>
          <button type="button" onClick={onClose} className="text-[#797b7c] hover:text-[#202325] p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="flex flex-col gap-4 items-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[15px] text-[#202325] font-semibold text-center">Đổi mật khẩu thành công!</p>
            <button onClick={onClose}
              className="bg-[#025cca] text-white text-[14px] font-semibold px-6 py-2 rounded-[10px] hover:bg-[#0250b0] transition-colors">
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PasswordField label="Mật khẩu hiện tại" placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword} onChange={setCurrentPassword} />
            <PasswordField label="Mật khẩu mới" placeholder="Tối thiểu 8 ký tự"
              value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Xác nhận mật khẩu mới" placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword} onChange={setConfirmPassword} />

            {error && <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-[42px] border border-[#e8e8e8] rounded-[10px] text-[14px] font-semibold text-[#636566] hover:bg-[#f5f5f5] transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={!canSubmit}
                className="flex-1 h-[42px] bg-[#025cca] rounded-[10px] text-[14px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ChangePasswordModal
