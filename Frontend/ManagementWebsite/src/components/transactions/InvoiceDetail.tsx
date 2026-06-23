import { useEffect, useState } from 'react'
import { getInvoiceDetail, formatDateTime, paymentMethodLabel } from '../../services/invoiceService'
import type { InvoiceDetail as Detail } from '../../services/invoiceService'
import { ApiError } from '../../services/api'

interface Props {
  invoiceId: string
}

const vnd = (n: number | null | undefined) => (n == null ? '0' : n.toLocaleString('vi-VN'))

const th = 'bg-primary-25 text-left text-sm font-semibold text-ink-strong px-3 py-2 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-2 border-b border-line align-middle'

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-3 min-h-9">
    <div className="w-[9rem] shrink-0 text-md text-ink-subtle">{label}</div>
    <div className="flex-1 min-w-0 text-md text-ink">{children}</div>
  </div>
)

const InvoiceDetail = ({ invoiceId }: Props) => {
  const [tab, setTab] = useState<'info' | 'history'>('info')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getInvoiceDetail(invoiceId)
      .then(d => { if (alive) setDetail(d) })
      .catch(err => { if (alive) setError(err instanceof ApiError ? err.message : 'Không tải được hóa đơn.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [invoiceId])

  if (loading) {
    return <div className="bg-card border-x border-b border-primary-150 px-5 py-6 text-md text-ink-subtle">Đang tải…</div>
  }
  if (error || !detail) {
    return <div className="bg-card border-x border-b border-primary-150 px-5 py-6 text-md text-danger">{error || 'Không có dữ liệu.'}</div>
  }

  const totalQty = detail.lines.reduce((s, l) => s + l.quantity, 0)

  return (
    <div className="bg-card border-x border-b border-primary-150 px-5 pb-5 pt-3">
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-line mb-4">
        {([['info', 'Thông tin'], ['history', 'Lịch sử thanh toán']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative h-9 text-md font-semibold cursor-pointer transition-colors ${tab === id ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}
          >
            {label}
            {tab === id && <span className="absolute left-0 right-0 -bottom-px h-[0.25rem] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        <div className="overflow-hidden border border-line rounded-md">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Thời gian</th>
                <th className={th}>Phương thức</th>
                <th className={th}>Trạng thái</th>
                <th className={`${th} text-right`}>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {detail.payments.length === 0 ? (
                <tr><td className={`${td} text-center text-ink-muted`} colSpan={4}>Chưa có thanh toán</td></tr>
              ) : (
                detail.payments.map((p, i) => (
                  <tr key={i}>
                    <td className={td}>{formatDateTime(p.createdAt)}</td>
                    <td className={td}>{paymentMethodLabel(p.method)}</td>
                    <td className={td}>{p.status ?? '—'}</td>
                    <td className={`${td} text-right font-medium`}>{vnd(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Info */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-1 max-w-[60rem]">
            <InfoRow label="Mã hóa đơn"><span className="font-bold">{detail.id}</span></InfoRow>
            <InfoRow label="Thời gian">{formatDateTime(detail.createdAt)}</InfoRow>
            <InfoRow label="Phòng/bàn">{detail.tableName || <span className="text-ink-muted">—</span>}</InfoRow>
            <InfoRow label="Trạng thái">
              <span className={`inline-flex items-center text-sm font-medium rounded-full px-2 py-0.5 ${detail.paid ? 'bg-primary-50 text-primary-700' : 'bg-fill text-ink-muted'}`}>
                {detail.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </span>
            </InfoRow>
          </div>

          {/* Line items */}
          <div className="mt-5 overflow-hidden border border-line rounded-md">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Tên hàng</th>
                  <th className={`${th} text-right w-[9rem]`}>Số lượng</th>
                  <th className={`${th} text-right w-[12rem]`}>Đơn giá</th>
                  <th className={`${th} text-right w-[13rem]`}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.length === 0 ? (
                  <tr><td className={`${td} text-center text-ink-muted`} colSpan={4}>Không có món nào</td></tr>
                ) : (
                  detail.lines.map((l, i) => (
                    <tr key={i}>
                      <td className={td}>{l.name}</td>
                      <td className={`${td} text-right`}>{l.quantity}</td>
                      <td className={`${td} text-right`}>{vnd(l.unitPrice)}</td>
                      <td className={`${td} text-right font-medium`}>{vnd(l.lineTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-[34rem] flex flex-col gap-2">
              <div className="flex justify-between text-md"><span className="text-ink-subtle">Tổng số lượng:</span><span className="text-ink font-medium">{totalQty}</span></div>
              <div className="flex justify-between text-md"><span className="text-ink-subtle">Tổng tiền hàng:</span><span className="text-ink font-medium">{vnd(detail.subtotal)}</span></div>
              <div className="flex justify-between text-md"><span className="text-ink-subtle">Giảm giá:</span><span className="text-ink font-medium">{vnd(detail.discountAmount)}</span></div>
              <div className="flex justify-between text-md"><span className="text-ink-subtle">Khách cần trả:</span><span className="text-ink font-bold">{vnd(detail.totalAmount)}</span></div>
              <div className="flex justify-between text-md"><span className="text-ink-subtle">Khách đã trả:</span><span className="text-ink font-medium">{vnd(detail.paid ? detail.totalAmount : 0)}</span></div>
            </div>
          </div>

          {/* Actions (read-only: print) */}
          <div className="mt-4 flex items-center justify-end">
            <button className="kv-btn kv-btn-outline-neutral h-9" onClick={() => window.print()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
              In
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default InvoiceDetail
