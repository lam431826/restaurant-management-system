import { useState } from 'react'
import { closeShift, PAYMENT_METHOD_LABELS } from '../../../services/shiftService'
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

/** Parse a dot-formatted string back to a plain number. */
const parseDots = (value: string): number => parseInt(value.replace(/\D/g, '') || '0', 10) || 0

export const CloseShiftModal = ({
  shift,
  onClosed,
  onCancel,
}: {
  shift: ShiftSummary
  onClosed: (closed: ShiftSummary) => void
  onCancel: () => void
}) => {
  // BR-CS-04 / BR-CS-13: cashier counts CASH only; the three online channels are
  // shown read-only at their recorded amount and reconciled later by the manager.
  const cash = shift.paymentBreakdown.find(b => b.method === 'CASH')
  const expectedCash = cash?.expectedAmount ?? 0
  const onlineChannels = shift.paymentBreakdown.filter(b => b.method !== 'CASH')

  const [cashActual, setCashActual] = useState('')
  const [cardBatch, setCardBatch]   = useState('')
  const [handover, setHandover]     = useState('')
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const cashActualNum = parseDots(cashActual)
  const cashVariance  = cashActualNum - expectedCash
  const hasVariance   = cashVariance !== 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!handover.trim()) {
      setError('Vui lòng nhập số tiền bàn giao hợp lệ (≥ 0)')
      return
    }
    if (hasVariance && !note.trim()) {
      setError('Vui lòng nhập ghi chú lý do chênh lệch tiền mặt')
      return
    }
    setLoading(true)
    setError('')
    try {
      const cardBatchNum = cardBatch.trim() ? parseDots(cardBatch) : undefined
      const closed = await closeShift(
        shift.id,
        cashActualNum,
        parseDots(handover),
        cardBatchNum,
        note.trim() || undefined,
      )
      onClosed(closed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể đóng ca. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const openedAt = new Date(shift.openedAt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[540px] mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#025cca] px-6 py-5 shrink-0">
          <h2 className="text-[20px] font-bold text-white">Đóng ca thu ngân</h2>
          <p className="text-[13px] text-blue-100 mt-1">Mở lúc {openedAt} · Doanh thu: {fmt(shift.totalRevenue)}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-0 overflow-y-auto">
          {/* Cash counting — the only channel the cashier reconciles */}
          <div className="px-6 pt-5 pb-4 flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-[#636566] uppercase tracking-wide">
              Kiểm đếm tiền mặt
            </p>
            <div className="rounded-xl border border-[#e8e8e8] overflow-hidden">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-[#f5f5f5]">
                    <th className="text-left px-4 py-2.5 text-[#636566] font-medium">Phương thức</th>
                    <th className="text-right px-4 py-2.5 text-[#636566] font-medium">Dự kiến</th>
                    <th className="text-right px-4 py-2.5 text-[#636566] font-medium">Thực tế</th>
                    <th className="text-right px-4 py-2.5 text-[#636566] font-medium">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#f0f0f0]">
                    <td className="px-4 py-2.5 font-medium text-[#202325]">
                      {PAYMENT_METHOD_LABELS.CASH}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#636566]">
                      {fmt(expectedCash)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={cashActual}
                        onChange={e => setCashActual(formatDots(e.target.value))}
                        autoFocus
                        className="w-[130px] h-8 px-2 text-right border border-[#d1d5db] rounded-md text-[13px] outline-none focus:border-[#025cca]"
                      />
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium text-[13px] ${
                      cashVariance > 0 ? 'text-green-600' : cashVariance < 0 ? 'text-red-500' : 'text-[#636566]'
                    }`}>
                      {cashVariance === 0
                        ? fmt(0)
                        : (cashVariance > 0 ? '+' : '') + fmt(cashVariance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Online channels — auto-recorded, read-only, settled later by manager */}
          <div className="px-6 pb-4 flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-[#636566] uppercase tracking-wide">
              Kênh điện tử <span className="font-normal normal-case text-[#9499a0]">— hệ thống tự ghi nhận, quản lý đối soát sau</span>
            </p>
            <div className="rounded-xl border border-[#e8e8e8] overflow-hidden">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-[#f5f5f5]">
                    <th className="text-left px-4 py-2.5 text-[#636566] font-medium">Phương thức</th>
                    <th className="text-right px-4 py-2.5 text-[#636566] font-medium">Đã ghi nhận</th>
                    <th className="text-right px-4 py-2.5 text-[#636566] font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {onlineChannels.map(b => (
                    <tr key={b.method} className="border-t border-[#f0f0f0]">
                      <td className="px-4 py-2.5 font-medium text-[#202325]">
                        {PAYMENT_METHOD_LABELS[b.method]}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#202325]">
                        {fmt(b.expectedAmount)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[12px] text-[#9499a0]">
                        Chờ đối soát
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Optional card POS batch cross-check (BR-CS-12) */}
          <div className="px-6 pb-4 flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-[#202325]">
              Tổng batch máy POS thẻ
              <span className="text-[12px] text-[#636566] font-normal ml-1">
                — tuỳ chọn, chỉ để đối chiếu nhanh
              </span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={cardBatch}
              onChange={e => setCardBatch(formatDots(e.target.value))}
              className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[15px] outline-none focus:border-[#025cca] focus:ring-2 focus:ring-[#025cca]/20"
            />
          </div>

          {/* Handover amount */}
          <div className="px-6 pb-4 flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-[#202325]">
              Số tiền bàn giao (VNĐ)
              <span className="text-[12px] text-[#636566] font-normal ml-1">
                — tiền mặt chuyển cho ca tiếp theo
              </span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={handover}
              onChange={e => setHandover(formatDots(e.target.value))}
              className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[15px] outline-none focus:border-[#025cca] focus:ring-2 focus:ring-[#025cca]/20"
            />
          </div>

          {/* Closing note */}
          <div className="px-6 pb-4 flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-[#202325]">
              Ghi chú đóng ca
              {hasVariance && <span className="text-red-500 ml-1">*</span>}
              {!hasVariance && <span className="text-[12px] text-[#636566] font-normal ml-1">(tuỳ chọn)</span>}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={hasVariance ? 'Bắt buộc khi tiền mặt có chênh lệch' : 'Ghi chú nếu cần...'}
              className="px-4 py-2.5 border border-[#d1d5db] rounded-lg text-[14px] resize-none outline-none focus:border-[#025cca] focus:ring-2 focus:ring-[#025cca]/20"
            />
          </div>

          {error && (
            <div className="mx-6 mb-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div className="px-6 pb-6 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 h-11 rounded-lg border border-[#d1d5db] text-[#202325] font-medium text-[15px] hover:bg-[#f5f5f5] transition-colors disabled:opacity-60"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-lg bg-[#025cca] text-white font-semibold text-[15px] hover:bg-[#0251b3] transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang đóng ca...' : 'Xác nhận đóng ca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
