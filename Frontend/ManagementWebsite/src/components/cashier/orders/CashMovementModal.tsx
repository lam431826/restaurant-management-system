import { useState } from 'react'
import { addCashMovement, getMyShift } from '../../../services/shiftService'
import type { ShiftSummary } from '../../../services/shiftService'
import { ApiError } from '../../../services/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

/** Strip everything except digits, then re-format with dot thousands separators. */
const formatDots = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('vi-VN')
}

const parseDots = (value: string): number => parseInt(value.replace(/\D/g, '') || '0', 10) || 0

type MovementType = 'CASH_IN' | 'CASH_OUT'

export const CashMovementModal = ({
  shift,
  onUpdated,
  onClose,
}: {
  shift: ShiftSummary
  onUpdated: (shift: ShiftSummary) => void
  onClose: () => void
}) => {
  const [type, setType]       = useState<MovementType>('CASH_IN')
  const [amount, setAmount]   = useState('')
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Expected cash on hand = opening float + cash-in − cash-out (BR-CS-03; sales not tracked here)
  const expectedCash = shift.openingCash + shift.totalCashIn - shift.totalCashOut

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseDots(amount)
    if (amt <= 0) {
      setError('Vui lòng nhập số tiền lớn hơn 0')
      return
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do')
      return
    }
    setLoading(true)
    setError('')
    try {
      await addCashMovement(shift.id, type, amt, reason.trim())
      const refreshed = await getMyShift()
      if (refreshed) onUpdated(refreshed)
      setAmount('')
      setReason('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể ghi nhận giao dịch. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#025cca] px-6 py-5 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-[20px] font-bold text-white">Thu / Chi quỹ tiền mặt</h2>
            <p className="text-[13px] text-blue-100 mt-1">Ghi nhận tiền vào / ra ngoài bán hàng</p>
          </div>
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
        </div>

        <div className="overflow-y-auto">
          {/* Cash on hand summary */}
          <div className="px-6 pt-5 pb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#f5f7fa] px-3 py-2.5">
              <p className="text-[11px] text-[#636566] uppercase tracking-wide">Đầu ca</p>
              <p className="text-[14px] font-semibold text-[#202325] mt-0.5">{fmt(shift.openingCash)}</p>
            </div>
            <div className="rounded-xl bg-green-50 px-3 py-2.5">
              <p className="text-[11px] text-green-700 uppercase tracking-wide">Đã thu</p>
              <p className="text-[14px] font-semibold text-green-700 mt-0.5">{fmt(shift.totalCashIn)}</p>
            </div>
            <div className="rounded-xl bg-red-50 px-3 py-2.5">
              <p className="text-[11px] text-red-600 uppercase tracking-wide">Đã chi</p>
              <p className="text-[14px] font-semibold text-red-600 mt-0.5">{fmt(shift.totalCashOut)}</p>
            </div>
          </div>
          <div className="px-6 pb-2 flex items-center justify-between">
            <span className="text-[13px] text-[#636566]">Tiền mặt quỹ dự kiến (chưa gồm doanh thu)</span>
            <span className="text-[15px] font-bold text-[#025cca]">{fmt(expectedCash)}</span>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="px-6 pt-3 pb-2 flex flex-col gap-4">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('CASH_IN')}
                className={`h-11 rounded-lg border text-[14px] font-medium transition-colors ${
                  type === 'CASH_IN'
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : 'bg-white border-[#d1d5db] text-[#636566] hover:bg-[#f5f5f5]'
                }`}
              >
                ↓ Thu vào (Cash In)
              </button>
              <button
                type="button"
                onClick={() => setType('CASH_OUT')}
                className={`h-11 rounded-lg border text-[14px] font-medium transition-colors ${
                  type === 'CASH_OUT'
                    ? 'bg-red-50 border-red-400 text-red-600'
                    : 'bg-white border-[#d1d5db] text-[#636566] hover:bg-[#f5f5f5]'
                }`}
              >
                ↑ Chi ra (Cash Out)
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#202325]">Số tiền (VNĐ)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(formatDots(e.target.value))}
                className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[15px] outline-none focus:border-[#025cca] focus:ring-2 focus:ring-[#025cca]/20"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#202325]">
                Lý do <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={type === 'CASH_IN' ? 'VD: Nộp thêm tiền lẻ' : 'VD: Mua vật tư, tạm ứng...'}
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[14px] outline-none focus:border-[#025cca] focus:ring-2 focus:ring-[#025cca]/20"
              />
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
              {loading ? 'Đang ghi nhận...' : 'Ghi nhận giao dịch'}
            </button>
          </form>

          {/* Movement ledger */}
          <div className="px-6 pt-3 pb-6">
            <p className="text-[13px] font-semibold text-[#636566] uppercase tracking-wide mb-2">
              Lịch sử thu / chi ({shift.cashMovements.length})
            </p>
            {shift.cashMovements.length === 0 ? (
              <p className="text-[13px] text-[#9a9a9a] py-3 text-center">Chưa có giao dịch nào.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                {[...shift.cashMovements]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(m => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#f5f7fa]"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#202325] truncate">
                          {m.reason || (m.type === 'CASH_IN' ? 'Thu vào' : 'Chi ra')}
                        </p>
                        <p className="text-[11px] text-[#9a9a9a]">
                          {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span
                        className={`text-[13px] font-semibold shrink-0 ${
                          m.type === 'CASH_IN' ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        {m.type === 'CASH_IN' ? '+' : '−'}{fmt(m.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
