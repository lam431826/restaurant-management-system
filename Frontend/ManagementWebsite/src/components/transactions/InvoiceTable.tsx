import { Fragment, useState } from 'react'
import type { InvoiceListItem } from '../../services/invoiceService'
import { formatDateTime, paymentMethodLabel } from '../../services/invoiceService'
import InvoiceDetail from './InvoiceDetail'

interface Props {
  invoices: InvoiceListItem[]
  loading: boolean
  total: number
}

const vnd = (n: number | null | undefined) => (n == null ? '0' : n.toLocaleString('vi-VN'))

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 align-middle'

const InvoiceTable = ({ invoices, loading, total }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null)

  const sum = invoices.reduce(
    (acc, inv) => {
      acc.total += inv.totalAmount
      acc.discount += inv.discountAmount ?? 0
      acc.paid += inv.paid ? inv.totalAmount : 0
      return acc
    },
    { total: 0, discount: 0, paid: 0 }
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-[15rem]`}>Mã hóa đơn</th>
              <th className={`${th} w-[16rem]`}>Thời gian</th>
              <th className={th}>Phòng/bàn</th>
              <th className={`${th} w-[13rem]`}>Phương thức</th>
              <th className={`${th} w-[14rem]`}>Trạng thái</th>
              <th className={`${th} text-right w-[15rem]`}>Tổng tiền hàng</th>
              <th className={`${th} text-right w-[11rem]`}>Giảm giá</th>
              <th className={`${th} text-right w-[13rem]`}>Khách đã trả</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 && (
              <tr className="border-b border-line">
                <td className={td} /><td className={td} /><td className={td} /><td className={td} /><td className={td} />
                <td className={`${td} text-right font-bold`}>{vnd(sum.total)}</td>
                <td className={`${td} text-right font-bold`}>{vnd(sum.discount)}</td>
                <td className={`${td} text-right font-bold`}>{vnd(sum.paid)}</td>
              </tr>
            )}

            {invoices.map(inv => {
              const isOpen = expanded === inv.id
              return (
                <Fragment key={inv.id}>
                  <tr
                    className={`border-b border-line cursor-pointer ${isOpen ? 'bg-primary-50' : 'hover:bg-primary-25'}`}
                    onClick={() => setExpanded(isOpen ? null : inv.id)}
                  >
                    <td className={`${td} font-medium ${isOpen ? 'text-primary' : 'text-ink'}`}>{inv.id}</td>
                    <td className={td}>{formatDateTime(inv.createdAt)}</td>
                    <td className={td}>{inv.tableName || <span className="text-ink-muted">—</span>}</td>
                    <td className={td}>{paymentMethodLabel(inv.paymentMethod)}</td>
                    <td className={td}>
                      <span className={`inline-flex items-center text-sm font-medium rounded-full px-2 py-0.5 ${inv.paid ? 'bg-primary-50 text-primary-700' : 'bg-fill text-ink-muted'}`}>
                        {inv.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>{vnd(inv.totalAmount)}</td>
                    <td className={`${td} text-right`}>{vnd(inv.discountAmount)}</td>
                    <td className={`${td} text-right`}>{vnd(inv.paid ? inv.totalAmount : 0)}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="p-0" onClick={e => e.stopPropagation()}>
                        <InvoiceDetail invoiceId={inv.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}

            {invoices.length === 0 && (
              <tr>
                <td className={`${td} text-center text-ink-muted`} colSpan={8}>
                  {loading ? 'Đang tải…' : 'Không tìm thấy hóa đơn nào'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 px-4 py-3 border-t border-line shrink-0">
        <span className="text-md text-ink-subtle">Hiển thị {invoices.length} trên tổng số {total}</span>
      </div>
    </div>
  )
}

export default InvoiceTable
