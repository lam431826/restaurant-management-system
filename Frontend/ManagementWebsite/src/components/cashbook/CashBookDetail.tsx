import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CashFlowVoucher } from '../../api/cashbook'
import { METHOD_LABEL } from '../../api/cashbook'
import { getInvoiceById } from '../../services/invoiceApi'

const money = (value: number) => value.toLocaleString('vi-VN')
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

const partnerGroupLabel: Record<CashFlowVoucher['partnerGroup'], string> = {
  EMPLOYEE: 'Nhân viên', OTHER: 'Khác', CUSTOMER: 'Khách hàng',
}

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
const PrinterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
  </svg>
)
const ChevronIcon = ({ up }: { up: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${up ? '' : 'rotate-180'}`}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
)

const invoiceTd = 'px-3 py-2 text-md text-ink whitespace-nowrap'
const invoiceTh = 'px-3 py-2 text-left text-sm font-semibold text-ink-subtle whitespace-nowrap'

// Read-only recap of the invoice that auto-generated this receipt. The invoice code is a
// clickable jump to that invoice's row in /manager/invoices (Giao dịch > Hóa đơn). Cash
// book only stores the invoice's id (sourceReferenceId), not its human code, so the real
// "HD%06d" code is fetched on demand — invoice.code is immutable once assigned, so this is
// always the same value the Invoices screen itself would show.
const SourceInvoicePanel = ({ source }: { source: NonNullable<CashFlowVoucher['sourceInvoice']> }) => {
  const [open, setOpen] = useState(true)
  const [invoiceCode, setInvoiceCode] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    getInvoiceById(source.invoiceId)
      .then(invoice => { if (!cancelled) setInvoiceCode(invoice.code) })
      .catch(() => { /* invoice may no longer be reachable; leave the placeholder */ })
    return () => { cancelled = true }
  }, [source.invoiceId])

  const displayCode = invoiceCode ?? '…'
  const goToInvoice = () => navigate(`/manager/invoices?invoiceId=${source.invoiceId}`)

  return (
    <div className="border border-line-default rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-fill text-md font-semibold text-ink cursor-pointer"
      >
        <span>Phiếu thu tự động được tạo từ hóa đơn {displayCode}</span>
        <ChevronIcon up={open} />
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className={invoiceTh}>Mã hóa đơn</th>
                <th className={invoiceTh}>Thời gian</th>
                <th className={`${invoiceTh} text-right`}>Giá trị phiếu</th>
                <th className={`${invoiceTh} text-right`}>Đã thu trước</th>
                <th className={`${invoiceTh} text-right`}>Tiền thu</th>
                <th className={invoiceTh}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={invoiceTd}>
                  <button
                    type="button"
                    onClick={goToInvoice}
                    title="Xem hóa đơn trong Giao dịch"
                    className="font-medium font-mono text-primary hover:underline cursor-pointer"
                  >
                    {displayCode}
                  </button>
                </td>
                <td className={invoiceTd}>{formatDateTime(source.invoiceTime)}</td>
                <td className={`${invoiceTd} text-right`}>{money(source.voucherValue)}</td>
                <td className={`${invoiceTd} text-right`}>{money(source.prePaid)}</td>
                <td className={`${invoiceTd} text-right font-semibold`}>{money(source.collected)}</td>
                <td className={invoiceTd}>
                  <span className="kv-badge kv-badge-success">{source.status}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface Props {
  voucher: CashFlowVoucher
  categoryName: string
  onVoid: () => void
  onEdit: () => void
}

const CashBookDetail = ({ voucher, categoryName, onVoid, onEdit }: Props) => {
  const isReceipt = voucher.type === 'RECEIPT'
  const docLabel = isReceipt ? 'Phiếu thu' : 'Phiếu chi'
  const roleLabel = isReceipt ? 'Người thu' : 'Người chi'
  const dateLabel = isReceipt ? 'Ngày thu' : 'Ngày chi'
  const partnerRoleLabel = isReceipt ? 'Người nộp' : 'Người nhận'

  return (
    <div className="border-t border-b border-line bg-card">
      <div className="p-5 flex flex-col gap-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-h3 font-bold text-ink">{docLabel} {voucher.code}</h3>
          <span className={`kv-badge ${voucher.voided ? 'kv-badge-neutral' : 'kv-badge-success'}`}>
            {voucher.voided ? 'Đã hủy' : 'Đã thanh toán'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-md text-ink-subtle">
          <span>Người tạo: <span className="text-ink font-medium">{voucher.createdBy}</span></span>
          <span className="text-line-strong">|</span>
          <span>{roleLabel}: <span className="text-ink font-medium">{voucher.createdBy}</span></span>
          <span className="text-line-strong">|</span>
          <span>{dateLabel}: <span className="text-ink font-medium">{formatDateTime(voucher.createdAt)}</span></span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <div className="text-sm text-ink-muted">Giá trị</div>
            <div className={`text-lg font-bold mt-0.5 ${isReceipt ? 'text-primary' : 'text-ink'}`}>{money(voucher.amount)}</div>
          </div>
          <div>
            <div className="text-sm text-ink-muted">{isReceipt ? 'Loại thu' : 'Loại chi'}</div>
            <div className="text-md text-ink mt-0.5">{categoryName}</div>
          </div>
          <div>
            <div className="text-sm text-ink-muted">{isReceipt ? 'Đối tượng nộp' : 'Đối tượng nhận'}</div>
            <div className="text-md text-ink mt-0.5">{partnerGroupLabel[voucher.partnerGroup]}</div>
          </div>
          <div>
            <div className="text-sm text-ink-muted">Phương thức thanh toán</div>
            <div className="text-md text-ink mt-0.5">{METHOD_LABEL[voucher.method]}</div>
          </div>
        </div>

        <div>
          <div className="text-sm text-ink-muted">{partnerRoleLabel}</div>
          <div className="text-md text-ink mt-0.5">{voucher.partnerName || '—'}</div>
        </div>

        {voucher.sourceInvoice && <SourceInvoicePanel source={voucher.sourceInvoice} />}

        <div className="flex items-start gap-2 text-md text-ink-subtle border-t border-line pt-4">
          <EditIcon />
          <span>Ghi chú: <span className="text-ink">{voucher.note || '—'}</span></span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {!voucher.voided
            ? <button type="button" className="text-md text-ink-subtle hover:text-danger cursor-pointer" onClick={onVoid}>Hủy phiếu</button>
            : <span />}
          <div className="flex items-center gap-2">
            {voucher.isEditable && (
              <button type="button" className="kv-btn kv-btn-primary h-10" title="Chỉnh sửa" onClick={onEdit}>
                <PencilIcon /> Chỉnh sửa
              </button>
            )}
            <button type="button" className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => window.print()}>
              <PrinterIcon /> In phiếu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CashBookDetail
