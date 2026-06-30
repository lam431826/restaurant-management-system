import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { openShift, getSuggestedOpeningFloat } from '../../../services/shiftService'
import type { ShiftSummary } from '../../../services/shiftService'
import { listMyAttendance } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'

const formatDots = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('vi-VN')
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const OpenShiftModal = ({
  onOpened,
  onLogout,
  onClose,
}: {
  onOpened: (shift: ShiftSummary) => void
  onLogout: () => void
  onClose?: () => void
}) => {
  const navigate = useNavigate()
  const [checking, setChecking]         = useState(true)   // attendance check in-flight
  const [notClockedIn, setNotClockedIn] = useState(false)
  const [openingCash, setOpeningCash]   = useState('')
  const [suggestedFloat, setSuggestedFloat] = useState(0) // BR-CS-09/11: last handover
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  // Proactively check if the cashier is clocked in today
  useEffect(() => {
    const t = today()
    listMyAttendance(t, t)
      .then(records => {
        const isClockedIn = records.some(r => r.status === 'CHECKED_IN')
        setNotClockedIn(!isClockedIn)
      })
      .catch(() => {
        // If the check fails, let them try — the server will enforce BR-X-01
        setNotClockedIn(false)
      })
      .finally(() => setChecking(false))
  }, [])

  // BR-CS-09/11: prefill the opening float with the cashier's last handover amount.
  useEffect(() => {
    getSuggestedOpeningFloat()
      .then(amount => {
        if (amount > 0) {
          setSuggestedFloat(amount)
          setOpeningCash(amount.toLocaleString('vi-VN'))
        }
      })
      .catch(() => { /* no prior handover — leave the field empty */ })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseInt(openingCash.replace(/\D/g, '') || '0', 10)
    if (isNaN(amount) || amount < 0) {
      setError('Vui lòng nhập số tiền hợp lệ (≥ 0)')
      return
    }
    setLoading(true)
    setError('')
    try {
      const shift = await openShift(amount)
      onOpened(shift)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASHIER_NOT_CHECKED_IN') {
        setNotClockedIn(true)
        setError('')
      } else if (err instanceof ApiError && err.code === 'SHIFT_ALREADY_OPEN') {
        setError('Bạn đang có một ca thu ngân đang mở. Vui lòng đóng ca cũ trước.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Không thể mở ca. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden">
        <div className="bg-[#025cca] px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-white">Mở ca thu ngân</h2>
            <p className="text-[13px] text-blue-100 mt-1">Nhập số tiền mặt đầu ca để bắt đầu</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-blue-200 hover:text-white hover:bg-white/20 transition-colors shrink-0 ml-3 mt-0.5"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Checking attendance ── */}
        {checking && (
          <div className="p-8 flex items-center justify-center gap-3 text-[#636566] text-[14px]">
            <svg className="w-5 h-5 animate-spin text-[#025cca]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Đang kiểm tra lịch làm việc...
          </div>
        )}

        {/* ── Not clocked in ── */}
        {!checking && notClockedIn && (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-[#202325]">Bạn chưa chấm công hôm nay</p>
                <p className="text-[13px] text-[#636566] mt-1 leading-relaxed">
                  Bạn cần chấm công vào ca làm việc trước khi có thể mở ca thu ngân.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/my-schedule')}
              className="h-11 rounded-lg bg-[#025cca] text-white font-semibold text-[15px] hover:bg-[#0251b3] transition-colors flex items-center justify-center gap-2"
            >
              Đi chấm công
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNotClockedIn(false)}
                className="flex-1 h-10 rounded-lg border border-[#d1d5db] text-[13px] text-[#636566] hover:bg-[#f5f5f5] transition-colors"
              >
                ← Thử mở ca
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 h-10 rounded-lg border border-red-200 text-[13px] text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Đăng xuất
              </button>
            </div>
          </div>
        )}

        {/* ── Open shift form ── */}
        {!checking && !notClockedIn && (
          <form onSubmit={(e) => void handleSubmit(e)} className="p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#202325]">
                Tiền mặt đầu ca (VNĐ)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={openingCash}
                onChange={e => setOpeningCash(formatDots(e.target.value))}
                className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[15px] text-[#202325] outline-none focus:border-[#025cca] focus:ring-2 focus:ring-[#025cca]/20"
                autoFocus
              />
              {suggestedFloat > 0 && (
                <p className="text-[12px] text-[#636566]">
                  Gợi ý từ ca trước (tiền bàn giao): {suggestedFloat.toLocaleString('vi-VN')} đ — bạn có thể chỉnh lại.
                </p>
              )}
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-lg bg-[#025cca] text-white font-semibold text-[15px] disabled:opacity-60 hover:bg-[#0251b3] transition-colors"
            >
              {loading ? 'Đang mở ca...' : 'Mở ca'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
