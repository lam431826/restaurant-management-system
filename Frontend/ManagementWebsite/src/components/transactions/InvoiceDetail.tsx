import { useState } from 'react'
import type { Invoice } from '../../data/mockData'
import { invoiceTotals, invoiceStatusLabels } from '../../data/mockData'

interface Props {
  invoice: Invoice
}

const vnd = (n: number) => n.toLocaleString('vi-VN')

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const fieldBox = 'flex items-center justify-between gap-2 w-full h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink'
const inputBox = 'w-full h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink focus:outline-none focus:border-primary'

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-3 min-h-9">
    <div className="w-[10rem] shrink-0 text-md text-ink-subtle">{label}</div>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
)

const PlainSelect = ({ value }: { value: string }) => (
  <div className={`${fieldBox} cursor-pointer`}>
    <span className="truncate">{value}</span>
    <ChevronDown />
  </div>
)

const th = 'bg-primary-25 text-left text-sm font-semibold text-ink-strong px-3 py-2 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-2 border-b border-line align-middle'

const actionBtn = 'inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-md font-medium cursor-pointer transition-colors'

const InvoiceDetail = ({ invoice }: Props) => {
  const [tab, setTab] = useState<'info' | 'history'>('info')
  const { totalQty, totalAmount } = invoiceTotals(invoice)
  const customerPaid = invoice.paid
  const customerOwes = totalAmount - invoice.discount
  const discountPct = totalAmount > 0 ? ((invoice.discount / totalAmount) * 100).toFixed(2) : '0'

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
                <th className={th}>Người thu</th>
                <th className={th}>Phương thức</th>
                <th className={`${th} text-right`}>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={td}>{invoice.time}</td>
                <td className={td}>{invoice.creator}</td>
                <td className={td}>{invoice.method}</td>
                <td className={`${td} text-right font-medium`}>{vnd(invoice.paid)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Three-column info grid */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-x-8 gap-y-1">
            {/* Column 1 */}
            <div className="flex flex-col gap-2">
              <InfoRow label="Mã hóa đơn">
                <span className="text-md font-bold text-ink">{invoice.code}</span>
              </InfoRow>
              <InfoRow label="Giờ đến">
                <div className={fieldBox}>
                  <span>{invoice.time}</span>
                  <span className="flex items-center gap-2"><CalendarIcon /><ClockIcon /></span>
                </div>
              </InfoRow>
              <InfoRow label="Thời gian">
                <div className={`${fieldBox} opacity-70`}>
                  <span>{invoice.time}</span>
                  <span className="flex items-center gap-2"><CalendarIcon /><ClockIcon /></span>
                </div>
              </InfoRow>
              <InfoRow label="Khách hàng">
                <a href="#" className="text-md text-primary hover:underline">{invoice.customer}</a>
              </InfoRow>
              <InfoRow label="Bảng giá">
                <span className="text-md text-ink">{invoice.priceBook}</span>
              </InfoRow>
              <InfoRow label="Mã đặt hàng">
                <span className="text-md text-ink-muted">—</span>
              </InfoRow>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-2">
              <InfoRow label="Trạng thái">
                <span className="text-md text-ink">{invoiceStatusLabels[invoice.status]}</span>
              </InfoRow>
              <InfoRow label="Phòng/bàn"><PlainSelect value={invoice.table} /></InfoRow>
              <InfoRow label="Chi nhánh">
                <span className="text-md text-ink">{invoice.branch}</span>
              </InfoRow>
              <InfoRow label="Người nhận đơn"><PlainSelect value={invoice.receiver} /></InfoRow>
              <InfoRow label="Người tạo">
                <span className="text-md text-ink">{invoice.creator}</span>
              </InfoRow>
              <InfoRow label="Số khách">
                <input className={`${inputBox} text-right`} defaultValue={invoice.guests} />
              </InfoRow>
              <InfoRow label="Kênh bán"><PlainSelect value={invoice.channel} /></InfoRow>
            </div>

            {/* Column 3 — note */}
            <div>
              <textarea
                className="w-full h-[12rem] p-3 bg-field border border-line-default rounded-md text-md text-ink resize-none focus:outline-none focus:border-primary placeholder:text-ink-muted"
                placeholder="Ghi chú..."
                defaultValue={invoice.note}
              />
            </div>
          </div>

          {/* Line items */}
          <div className="mt-5 overflow-hidden border border-line rounded-md">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${th} w-[12rem]`}>Mã hàng hóa</th>
                  <th className={th}>Tên hàng</th>
                  <th className={`${th} text-right w-[9rem]`}>Số lượng</th>
                  <th className={`${th} text-right w-[10rem]`}>Đơn giá</th>
                  <th className={`${th} text-right w-[10rem]`}>Giảm giá</th>
                  <th className={`${th} text-right w-[10rem]`}>Giá bán</th>
                  <th className={`${th} text-right w-[12rem]`}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map(l => (
                  <tr key={l.code}>
                    <td className={`${td} text-primary`}>{l.code}</td>
                    <td className={td}>{l.name}</td>
                    <td className={`${td} text-right`}>{l.qty}</td>
                    <td className={`${td} text-right`}>{vnd(l.price)}</td>
                    <td className={`${td} text-right`}>{l.discount ? vnd(l.discount) : ''}</td>
                    <td className={`${td} text-right`}>{vnd(l.sellPrice)}</td>
                    <td className={`${td} text-right font-medium`}>{vnd(l.qty * l.sellPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-[34rem] flex flex-col gap-2">
              <div className="flex justify-between text-md">
                <span className="text-ink-subtle">Tổng số lượng:</span><span className="text-ink font-medium">{totalQty}</span>
              </div>
              <div className="flex justify-between text-md">
                <span className="text-ink-subtle">Tổng tiền hàng :</span><span className="text-ink font-medium">{vnd(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-md">
                <span className="text-ink-subtle">Giảm giá hóa đơn ({discountPct}%):</span><span className="text-ink font-medium">{vnd(invoice.discount)}</span>
              </div>
              <div className="flex justify-between text-md">
                <span className="text-ink-subtle">Khách cần trả :</span><span className="text-ink font-bold">{vnd(customerOwes)}</span>
              </div>
              <div className="flex justify-between text-md">
                <span className="text-ink-subtle">Khách đã trả :</span><span className="text-ink font-medium">{vnd(customerPaid)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button className={`${actionBtn} text-ink-subtle hover:bg-fill`} onClick={() => window.alert(`Cập nhật ${invoice.code}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
              Cập nhật
            </button>
            <button className="kv-btn kv-btn-primary h-9" onClick={() => window.alert(`Đã lưu ${invoice.code}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              Lưu
            </button>
            <button className={`${actionBtn} bg-neutral-100 text-ink hover:bg-neutral-150`} onClick={() => window.print()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
              In
            </button>
            <button className={`${actionBtn} bg-neutral-100 text-ink hover:bg-neutral-150`} onClick={() => window.alert(`Xuất file ${invoice.code}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Xuất file
            </button>
            <button className={`${actionBtn} bg-neutral-100 text-ink hover:bg-neutral-150`} onClick={() => window.alert(`Đã sao chép ${invoice.code}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Sao chép
            </button>
            <button className={`${actionBtn} bg-danger text-white hover:bg-danger-600`} onClick={() => window.confirm(`Hủy bỏ hóa đơn ${invoice.code}?`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Hủy bỏ
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default InvoiceDetail
