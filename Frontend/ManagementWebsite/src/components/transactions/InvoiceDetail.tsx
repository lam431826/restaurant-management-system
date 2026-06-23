import type { InvoiceDetail as InvoiceDetailData } from '../../services/invoiceApi'

interface Props {
  invoice: InvoiceDetailData
  onApplyDiscount: () => void
}

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`

const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value))

const th = 'bg-primary-25 text-left text-sm font-semibold text-ink-strong px-3 py-2 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-2 border-b border-line align-middle'

const InvoiceDetail = ({ invoice, onApplyDiscount }: Props) => {
  const totalQuantity = invoice.items.reduce((total, item) => total + item.quantity, 0)

  return (
    <div className="bg-card border-x border-b border-primary-150 px-5 pb-5 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 border-b border-line">
        <div><div className="text-sm text-ink-muted">Mã hóa đơn</div><div className="text-md font-semibold text-ink mt-1 break-all">{invoice.id}</div></div>
        <div><div className="text-sm text-ink-muted">Mã đơn hàng</div><div className="text-md font-semibold text-ink mt-1 break-all">{invoice.orderId}</div></div>
        <div><div className="text-sm text-ink-muted">Thời gian tạo</div><div className="text-md text-ink mt-1">{formatDateTime(invoice.createdAt)}</div></div>
        <div>
          <div className="text-sm text-ink-muted">Trạng thái</div>
          <span className={`kv-badge mt-1 ${invoice.paid ? 'kv-badge-success' : 'kv-badge-warning'}`}>
            {invoice.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </span>
        </div>
        <div><div className="text-sm text-ink-muted">Mã khuyến mãi</div><div className="text-md text-ink mt-1">{invoice.promotionCode ?? 'Không áp dụng'}</div></div>
        <div><div className="text-sm text-ink-muted">Số lượng món</div><div className="text-md text-ink mt-1">{totalQuantity}</div></div>
      </div>

      <div className="mt-4 overflow-x-auto border border-line rounded-md">
        <table className="w-full min-w-[70rem] border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-[18rem]`}>Mã món</th>
              <th className={th}>Tên món</th>
              <th className={`${th} text-right w-[10rem]`}>Số lượng</th>
              <th className={`${th} text-right w-[14rem]`}>Đơn giá</th>
              <th className={`${th} text-right w-[15rem]`}>Thành tiền</th>
              <th className={`${th} min-w-[18rem]`}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${item.menuItemId}-${index}`}>
                <td className={`${td} text-primary`}>{item.menuItemId}</td>
                <td className={td}>{item.menuItemName}</td>
                <td className={`${td} text-right`}>{item.quantity}</td>
                <td className={`${td} text-right`}>{money(item.unitPrice)}</td>
                <td className={`${td} text-right font-medium`}>{money(item.lineTotal)}</td>
                <td className={`${td} text-ink-muted`}>{item.note || '—'}</td>
              </tr>
            ))}
            {invoice.items.length === 0 && (
              <tr><td className={`${td} text-center text-ink-muted py-6`} colSpan={6}>Hóa đơn không có món</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          {!invoice.paid && (
            <button type="button" className="kv-btn kv-btn-outline-primary h-10" onClick={onApplyDiscount}>
              Áp dụng khuyến mãi
            </button>
          )}
        </div>
        <div className="w-full md:w-[34rem] flex flex-col gap-2 text-md">
          <div className="flex justify-between gap-4"><span className="text-ink-subtle">Tạm tính:</span><span className="font-medium text-ink">{money(invoice.subtotal)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-ink-subtle">Giảm giá:</span><span className="font-medium text-ink">{money(invoice.discountAmount)}</span></div>
          <div className="flex justify-between gap-4 pt-2 border-t border-line"><span className="font-semibold text-ink">Tổng thanh toán:</span><span className="font-bold text-primary">{money(invoice.totalAmount)}</span></div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetail
