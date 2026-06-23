import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import InvoiceDetail from './InvoiceDetail'
import { getInvoiceById } from '../../services/invoiceApi'
import type { InvoiceDetail as InvoiceDetailData, InvoiceSummary } from '../../services/invoiceApi'

interface Props {
  invoices: InvoiceSummary[]
  loading: boolean
  refreshVersion: number
  onApplyDiscount: (invoice: InvoiceSummary) => void
  onProcessPayment: (invoice: InvoiceSummary) => void
}

const money = (value: number) => value.toLocaleString('vi-VN')
const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value))

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle'

const DiscountIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
)

const PaymentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
  </svg>
)

const InvoiceTable = ({ invoices, loading, refreshVersion, onApplyDiscount, onProcessPayment }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<InvoiceDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const previousRefreshVersion = useRef(refreshVersion)

  const loadDetail = useCallback(async (invoiceId: string) => {
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      setDetail(await getInvoiceById(invoiceId))
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'Không thể tải chi tiết hóa đơn')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (previousRefreshVersion.current === refreshVersion) return
    previousRefreshVersion.current = refreshVersion
    if (expandedId) void loadDetail(expandedId)
  }, [expandedId, loadDetail, refreshVersion])

  const toggleDetail = async (invoice: InvoiceSummary) => {
    if (expandedId === invoice.id) {
      setExpandedId(null)
      setDetail(null)
      setDetailError('')
      return
    }

    setExpandedId(invoice.id)
    await loadDetail(invoice.id)
  }

  const totals = invoices.reduce((sum, invoice) => ({
    subtotal: sum.subtotal + invoice.subtotal,
    discount: sum.discount + invoice.discountAmount,
    total: sum.total + invoice.totalAmount,
  }), { subtotal: 0, discount: 0, total: 0 })

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-[126rem] border-collapse">
          <thead>
            <tr>
              <th className={`${th} min-w-[22rem]`}>Mã hóa đơn</th>
              <th className={`${th} min-w-[20rem]`}>Mã đơn hàng</th>
              <th className={`${th} w-[17rem]`}>Thời gian tạo</th>
              <th className={`${th} text-right w-[14rem]`}>Tạm tính</th>
              <th className={`${th} text-right w-[13rem]`}>Giảm giá</th>
              <th className={`${th} text-right w-[15rem]`}>Tổng thanh toán</th>
              <th className={`${th} w-[15rem]`}>Trạng thái</th>
              <th className={`${th} text-center w-[30rem]`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!loading && invoices.length > 0 && (
              <tr className="border-b border-line bg-fill">
                <td className={td} /><td className={td} /><td className={`${td} font-semibold`}>Tổng cộng</td>
                <td className={`${td} text-right font-bold`}>{money(totals.subtotal)}</td>
                <td className={`${td} text-right font-bold`}>{money(totals.discount)}</td>
                <td className={`${td} text-right font-bold`}>{money(totals.total)}</td>
                <td className={td} /><td className={td} />
              </tr>
            )}

            {!loading && invoices.map(invoice => {
              const isOpen = expandedId === invoice.id
              return (
                <Fragment key={invoice.id}>
                  <tr
                    className={`cursor-pointer ${isOpen ? 'bg-primary-50' : 'hover:bg-primary-25'}`}
                    onClick={() => void toggleDetail(invoice)}
                  >
                    <td className={`${td} font-medium break-all ${isOpen ? 'text-primary' : ''}`}>{invoice.id}</td>
                    <td className={`${td} break-all`}>{invoice.orderId}</td>
                    <td className={td}>{formatDateTime(invoice.createdAt)}</td>
                    <td className={`${td} text-right`}>{money(invoice.subtotal)}</td>
                    <td className={`${td} text-right`}>{money(invoice.discountAmount)}</td>
                    <td className={`${td} text-right font-semibold`}>{money(invoice.totalAmount)}</td>
                    <td className={td}>
                      <span className={`kv-badge ${invoice.paid ? 'kv-badge-success' : 'kv-badge-warning'}`}>
                        {invoice.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </td>
                    <td className={`${td} text-center`} onClick={event => event.stopPropagation()}>
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="kv-btn kv-btn-outline-primary h-8 px-3"
                          onClick={() => onApplyDiscount(invoice)}
                          disabled={invoice.paid}
                          title={invoice.paid ? 'Hóa đơn đã thanh toán' : 'Áp dụng khuyến mãi'}
                        >
                          <DiscountIcon />
                          Giảm giá
                        </button>
                        <button
                          type="button"
                          className="kv-btn kv-btn-primary h-8 px-3"
                          onClick={() => onProcessPayment(invoice)}
                          disabled={invoice.paid}
                          title={invoice.paid ? 'Hóa đơn đã thanh toán' : 'Thanh toán hóa đơn'}
                        >
                          <PaymentIcon />
                          Thanh toán
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        {detailLoading && <div className="px-5 py-8 text-center text-md text-ink-muted">Đang tải chi tiết hóa đơn...</div>}
                        {detailError && <div className="px-5 py-5 text-md text-danger bg-danger-50">{detailError}</div>}
                        {detail && (
                          <InvoiceDetail
                            invoice={detail}
                            historyRefreshVersion={refreshVersion}
                            onApplyDiscount={() => onApplyDiscount(invoice)}
                            onProcessPayment={() => onProcessPayment(invoice)}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}

            {loading && (
              <tr><td className={`${td} text-center text-ink-muted py-16`} colSpan={8}>Đang tải danh sách hóa đơn...</td></tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr><td className={`${td} text-center text-ink-muted py-16`} colSpan={8}>Không tìm thấy hóa đơn nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center px-4 py-3 border-t border-line shrink-0">
        <span className="text-md text-ink-subtle">Tổng số {invoices.length} hóa đơn</span>
      </div>
    </div>
  )
}

export default InvoiceTable
