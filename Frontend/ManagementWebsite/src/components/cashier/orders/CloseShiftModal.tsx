import { useState } from 'react'
import { closeShift, getMyShift } from '../../../services/shiftService'
import type { ShiftSummary, PaymentMethodKey } from '../../../services/shiftService'
import { ApiError } from '../../../services/api'

/** Plain number with comma thousands separators, matching the handover sheet. */
const num = (n: number) => n.toLocaleString('en-US')

/** Strip everything except digits, then re-format with dot thousands separators. */
const formatDots = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('vi-VN')
}

/** Parse a dot-formatted string back to a plain number. */
const parseDots = (value: string): number => parseInt(value.replace(/\D/g, '') || '0', 10) || 0

type CellValue = number | '—'

const fmtCell = (v: CellValue) => (v === '—' ? '—' : num(v))

// ── One cash-source column (Bán hàng / Phiếu thu / Phiếu chi) ────────────
const BreakdownCard = ({
  title, count, unit, rows, total,
}: { title: string; count: number; unit: string; rows: { label: string; value: CellValue }[]; total: number }) => (
  <div className="flex-1 bg-[#fafafa] border border-[#eeeeee] rounded-xl px-5 py-4">
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-[15px] font-bold text-[#202325]">{title}</span>
      <span className="text-[13px] text-[#9499a0]">{count} {unit}</span>
    </div>
    {rows.map((r, i) => (
      <div key={r.label} className="flex items-center justify-between py-1.5">
        <span className={`text-[14px] ${i === 0 ? 'font-semibold text-[#202325]' : 'text-[#636566]'}`}>
          {i + 1}. {r.label}
        </span>
        <span className={`text-[14px] ${i === 0 ? 'font-semibold text-[#202325]' : 'text-[#636566]'}`}>
          {fmtCell(r.value)}
        </span>
      </div>
    ))}
    <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#ececec]">
      <span className="text-[14px] text-[#636566]">Tổng</span>
      <span className="text-[14px] font-medium text-[#202325]">{num(total)}</span>
    </div>
  </div>
)

const HelpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#9499a0] inline-block align-middle">
    <circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .7-1 1.7" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
  </svg>
)

export const CloseShiftModal = ({
  shift,
  cashierName,
  onClosed,
  onCancel,
}: {
  shift: ShiftSummary
  cashierName: string
  onClosed: (closed: ShiftSummary) => void
  onCancel: () => void
}) => {
  const [data, setData] = useState<ShiftSummary>(shift)
  const [cashActual, setCashActual] = useState('')
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState('')

  const byMethod = (m: PaymentMethodKey) =>
    data.paymentBreakdown.find(b => b.method === m)?.expectedAmount ?? 0

  const openingCash  = data.openingCash
  const expectedCash = byMethod('CASH')                 // opening + cash movements (BR-CS-03)
  const cashInShift  = expectedCash - openingCash       // net cash generated this shift
  const cashSales    = cashInShift - data.totalCashIn + data.totalCashOut

  const salesTransfer = byMethod('QR')
  const salesCard     = byMethod('CARD')
  const salesWallet   = byMethod('E_WALLET')
  const salesTotal    = cashSales + salesTransfer + salesCard + salesWallet

  const cashActualNum = parseDots(cashActual)
  const variance      = cashActual ? cashActualNum - expectedCash : 0
  const hasVariance   = cashActual !== '' && variance !== 0
  const canClose      = cashActual !== ''

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const digits = data.id.replace(/\D/g, '')
  const shiftCode = digits ? 'CA' + digits.slice(-6).padStart(6, '0') : 'CA-' + data.id.slice(0, 6).toUpperCase()

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const fresh = await getMyShift()
      if (fresh) setData(fresh)
    } catch {
      /* keep current data on failure */
    } finally {
      setRefreshing(false)
    }
  }

  const submit = async (print: boolean) => {
    if (!canClose) {
      setError('Vui lòng nhập số tiền mặt bàn giao thực tế')
      return
    }
    if (hasVariance && !note.trim()) {
      setError('Vui lòng nhập ghi chú lý do chênh lệch tiền mặt')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Counted cash doubles as the handover amount in this simplified sheet.
      const closed = await closeShift(data.id, cashActualNum, cashActualNum, undefined, note.trim() || undefined)
      if (print) window.print()
      onClosed(closed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể đóng ca. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = data.status === 'OPEN' ? 'ĐANG MỞ' : data.status === 'PENDING_RECON' ? 'CHỜ ĐỐI SOÁT' : 'ĐÃ ĐÓNG'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1180px] max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ececec] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636566] hover:bg-[#f0f0f0] transition-colors" aria-label="Quay lại">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-[18px] font-semibold text-[#202325]">
              Phiếu bàn giao ca: <span className="font-bold">{shiftCode}</span>
            </h2>
            <span className="px-2.5 py-1 rounded-md bg-[#e8f1fc] text-[#025cca] text-[12px] font-semibold">{statusLabel}</span>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636566] hover:bg-[#f0f0f0] transition-colors" aria-label="Đóng">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sub-header */}
        <div className="flex flex-wrap items-center gap-x-10 gap-y-1 px-6 py-3 text-[14px] text-[#636566] border-b border-[#f2f2f2] shrink-0">
          <span>Nhân viên: <span className="font-semibold text-[#202325]">{cashierName}</span></span>
          <span>Giờ mở ca: <span className="font-semibold text-[#202325]">{fmtDateTime(data.openedAt)}</span></span>
          <span>Giờ đóng ca: <span className="font-semibold text-[#202325]">{data.closedAt ? fmtDateTime(data.closedAt) : ''}</span></span>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-4 bg-white">
          {/* Tiền mặt đầu ca */}
          <div className="border border-[#d9d9d9] rounded-2xl px-6 py-4 flex items-center justify-between">
            <span className="text-[16px] font-semibold text-[#202325]">Tiền mặt đầu ca</span>
            <span className="text-[22px] font-bold text-[#025cca]">{num(openingCash)}</span>
          </div>

          {/* Tiền mặt trong ca */}
          <div className="border border-[#d9d9d9] rounded-2xl px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[16px] font-semibold text-[#202325]">Tiền mặt trong ca</span>
              <span className="flex items-center gap-1.5">
                <HelpIcon />
                <span className="text-[22px] font-bold text-[#025cca]">{num(cashInShift)}</span>
              </span>
            </div>
            <div className="flex gap-4">
              <BreakdownCard
                title="Bán hàng" count={0} unit="hóa đơn"
                rows={[
                  { label: 'Tiền mặt', value: cashSales },
                  { label: 'Chuyển khoản', value: salesTransfer },
                  { label: 'Thẻ', value: salesCard },
                  { label: 'Ví điện tử', value: salesWallet },
                ]}
                total={salesTotal}
              />
              <BreakdownCard
                title="Phiếu thu" count={0} unit="phiếu"
                rows={[
                  { label: 'Tiền mặt', value: data.totalCashIn },
                  { label: 'Chuyển khoản', value: 0 },
                  { label: 'Thẻ', value: 0 },
                ]}
                total={data.totalCashIn}
              />
              <BreakdownCard
                title="Phiếu chi" count={0} unit="phiếu"
                rows={[
                  { label: 'Tiền mặt', value: data.totalCashOut },
                  { label: 'Chuyển khoản', value: 0 },
                  { label: 'Thẻ', value: 0 },
                ]}
                total={data.totalCashOut}
              />
            </div>
          </div>

          {/* Tiền mặt cuối ca */}
          <div className="border border-[#d9d9d9] rounded-2xl px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[16px] font-semibold text-[#202325]">Tiền mặt cuối ca</span>
              <span className="flex items-center gap-1.5">
                <HelpIcon />
                <span className="text-[22px] font-bold text-[#025cca]">{num(expectedCash)}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-[#636566]">Tiền mặt bàn giao thực tế</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số tiền mặt đang có cuối ca"
                  value={cashActual}
                  onChange={e => { setCashActual(formatDots(e.target.value)); if (error) setError('') }}
                  autoFocus
                  className="border-b-2 border-[#025cca] pb-1.5 text-[15px] text-[#202325] outline-none bg-transparent placeholder:text-[#9499a0]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-[#636566]">Số tiền chênh lệch</label>
                <div className={`border-b border-[#d1d5db] pb-1.5 text-[15px] font-medium ${
                  variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-500' : 'text-[#202325]'
                }`}>
                  {variance > 0 ? '+' : ''}{num(variance)}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-[#636566]">
                  Ghi chú{hasVariance && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  placeholder="Nhập ghi chú. Ví dụ: mua đồ hết 50k"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="border-b border-[#d1d5db] pb-1.5 text-[15px] text-[#202325] outline-none bg-transparent placeholder:text-[#9499a0] focus:border-[#025cca]"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#ececec] shrink-0">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-2 text-[15px] font-medium text-[#025cca] hover:underline disabled:opacity-60"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-3m2 9a8 8 0 01-14 3" />
            </svg>
            Cập nhật dữ liệu
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={loading || !canClose}
              className="px-6 h-11 rounded-xl bg-[#f0f0f0] text-[#636566] font-semibold text-[15px] hover:bg-[#e6e6e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đóng ca
            </button>
            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={loading || !canClose}
              className="px-6 h-11 rounded-xl bg-[#025cca] text-white font-semibold text-[15px] hover:bg-[#0251b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đóng ca...' : 'Đóng ca và in phiếu bàn giao'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
