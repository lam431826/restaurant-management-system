import { useCallback, useEffect, useState } from 'react'
import type { InvoiceDetail as InvoiceDetailData } from '../../services/invoiceApi'
import { getPayments } from '../../services/paymentApi'
import type { Payment, PaymentMethod } from '../../services/paymentApi'

interface Props {
  invoice: InvoiceDetailData
  historyRefreshVersion: number
  onApplyDiscount: () => void
  onProcessPayment: () => void
}

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`

const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value))

const th = 'bg-primary-25 text-left text-sm font-semibold text-ink-strong px-3 py-2 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-2 border-b border-line align-middle'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  CARD: 'Thẻ',
  QR: 'Mã QR',
  E_WALLET: 'Ví điện tử',
}

const InvoiceDetail = ({ invoice, historyRefreshVersion, onApplyDiscount, onProcessPayment }: Props) => {
  const totalQuantity = invoice.items.reduce((total, item) => total + item.quantity, 0)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState('')

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true)
    setPaymentsError('')
    try {
      setPayments(await getPayments(invoice.id))
    } catch (loadError) {
      setPaymentsError(loadError instanceof Error ? loadError.message : 'Không thể tải lịch sử thanh toán')
    } finally {
      setPaymentsLoading(false)
    }
  }, [invoice.id])

  useEffect(() => {
    void loadPayments()
  }, [historyRefreshVersion, loadPayments])

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
        <div className="flex flex-wrap items-center gap-2">
          {!invoice.paid && (
            <>
              <button type="button" className="kv-btn kv-btn-outline-primary h-10" onClick={onApplyDiscount}>
                Áp dụng khuyến mãi
              </button>
              <button type="button" className="kv-btn kv-btn-primary h-10" onClick={onProcessPayment}>
                Thanh toán
              </button>
            </>
          )}
        </div>
        <div className="w-full md:w-[34rem] flex flex-col gap-2 text-md">
          <div className="flex justify-between gap-4"><span className="text-ink-subtle">Tạm tính:</span><span className="font-medium text-ink">{money(invoice.subtotal)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-ink-subtle">Giảm giá:</span><span className="font-medium text-ink">{money(invoice.discountAmount)}</span></div>
          <div className="flex justify-between gap-4 pt-2 border-t border-line"><span className="font-semibold text-ink">Tổng thanh toán:</span><span className="font-bold text-primary">{money(invoice.totalAmount)}</span></div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-line">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">Lịch sử thanh toán</h3>
            <p className="text-sm text-ink-muted mt-1">Các giao dịch thuộc hóa đơn này</p>
          </div>
          <button type="button" className="kv-btn kv-btn-outline-neutral h-9" onClick={() => void loadPayments()} disabled={paymentsLoading}>Làm mới</button>
        </div>

        <div className="overflow-x-auto border border-line rounded-md">
          <table className="w-full min-w-[76rem] border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-[18rem]`}>Thời gian</th>
                <th className={`${th} w-[16rem]`}>Phương thức</th>
                <th className={`${th} text-right w-[16rem]`}>Số tiền</th>
                <th className={`${th} w-[13rem]`}>Trạng thái</th>
                <th className={th}>Mã giao dịch</th>
              </tr>
            </thead>
            <tbody>
              {!paymentsLoading && payments.map(payment => (
                <tr key={payment.id}>
                  <td className={td}>{formatDateTime(payment.createdAt)}</td>
                  <td className={td}>{paymentMethodLabels[payment.method]}</td>
                  <td className={`${td} text-right font-medium`}>{money(payment.amount)}</td>
                  <td className={td}>
                    <span className={`kv-badge ${payment.status === 'PAID' ? 'kv-badge-success' : 'kv-badge-neutral'}`}>{payment.status}</span>
                  </td>
                  <td className={`${td} text-ink-muted break-all`}>{payment.gatewayRef || '—'}</td>
                </tr>
              ))}
              {paymentsLoading && (
                <tr><td className={`${td} text-center text-ink-muted py-6`} colSpan={5}>Đang tải lịch sử thanh toán...</td></tr>
              )}
              {!paymentsLoading && !paymentsError && payments.length === 0 && (
                <tr><td className={`${td} text-center text-ink-muted py-6`} colSpan={5}>Chưa có lịch sử thanh toán</td></tr>
              )}
              {!paymentsLoading && paymentsError && (
                <tr>
                  <td className={`${td} text-center text-danger bg-danger-50 py-5`} colSpan={5}>
                    {paymentsError}{' '}
                    <button type="button" className="font-semibold hover:underline" onClick={() => void loadPayments()}>Thử lại</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetail
