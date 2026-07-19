import type { CashFlowVoucher } from '../../data/cashBookMockData'
import { METHOD_LABEL } from '../../data/cashBookMockData'

const money = (value: number) => value.toLocaleString('vi-VN')
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

const partnerGroupLabel: Record<CashFlowVoucher['partnerGroup'], string> = { EMPLOYEE: 'Nhân viên', OTHER: 'Khác' }

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
const PrinterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
  </svg>
)

interface Props {
  voucher: CashFlowVoucher
  categoryName: string
  onVoid: () => void
}

const CashBookDetail = ({ voucher, categoryName, onVoid }: Props) => {
  const isReceipt = voucher.type === 'RECEIPT'
  const docLabel = isReceipt ? 'Phiếu thu' : 'Phiếu chi'
  const roleLabel = isReceipt ? 'Người thu' : 'Người chi'
  const dateLabel = isReceipt ? 'Ngày thu' : 'Ngày chi'
  const partnerRoleLabel = isReceipt ? 'Người nộp' : 'Người nhận'

  return (
    <div className="border-t border-b border-line bg-card">
      <div className="p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-h3 font-bold text-ink">{docLabel} {voucher.code}</h3>
            <span className={`kv-badge ${voucher.voided ? 'kv-badge-neutral' : 'kv-badge-success'}`}>
              {voucher.voided ? 'Đã hủy' : 'Đã thanh toán'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-md text-ink-subtle">
            <PinIcon /> Chi nhánh trung tâm
          </div>
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

        <div className="flex items-start gap-2 text-md text-ink-subtle border-t border-line pt-4">
          <EditIcon />
          <span>Ghi chú: <span className="text-ink">{voucher.note || '—'}</span></span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {!voucher.voided
            ? <button type="button" className="text-md text-ink-subtle hover:text-danger cursor-pointer" onClick={onVoid}>Hủy phiếu</button>
            : <span />}
          <button type="button" className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => window.print()}>
            <PrinterIcon /> In phiếu
          </button>
        </div>
      </div>
    </div>
  )
}

export default CashBookDetail
