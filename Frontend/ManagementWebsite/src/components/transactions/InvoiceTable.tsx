import { Fragment, useState } from 'react'
import type { Invoice } from '../../data/mockData'
import { invoiceTotals } from '../../data/mockData'
import InvoiceDetail from './InvoiceDetail'

interface Props {
  invoices: Invoice[]
}

const vnd = (n: number) => n.toLocaleString('vi-VN')

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 align-middle'

const InvoiceTable = ({ invoices }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(invoices[0]?.code ?? null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allSelected = invoices.length > 0 && selected.size === invoices.length
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(invoices.map(i => i.code)))
  const toggleRow = (code: string) =>
    setSelected(s => {
      const next = new Set(s)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })

  const sum = invoices.reduce(
    (acc, inv) => {
      const { totalAmount } = invoiceTotals(inv)
      acc.total += totalAmount
      acc.discount += inv.discount
      acc.paid += inv.paid
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
              <th className={`${th} w-[4rem] text-center`}>
                <label className="kv-check justify-center">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span className="kv-check-box" />
                </label>
              </th>
              <th className={`${th} w-[13rem]`}>Mã hóa đơn</th>
              <th className={`${th} w-[15rem]`}>Thời gian (Giờ đi)</th>
              <th className={th}>Khách hàng</th>
              <th className={`${th} text-right w-[15rem]`}>Tổng tiền hàng</th>
              <th className={`${th} text-right w-[11rem]`}>Giảm giá</th>
              <th className={`${th} text-right w-[13rem]`}>Khách đã trả</th>
            </tr>
          </thead>
          <tbody>
            {/* Summary row */}
            <tr className="border-b border-line">
              <td className={td} /><td className={td} /><td className={td} /><td className={td} />
              <td className={`${td} text-right font-bold`}>{vnd(sum.total)}</td>
              <td className={`${td} text-right font-bold`}>{vnd(sum.discount)}</td>
              <td className={`${td} text-right font-bold`}>{vnd(sum.paid)}</td>
            </tr>

            {invoices.map(inv => {
              const { totalAmount } = invoiceTotals(inv)
              const isOpen = expanded === inv.code
              return (
                <Fragment key={inv.code}>
                  <tr
                    className={`border-b border-line cursor-pointer ${isOpen ? 'bg-primary-50' : 'hover:bg-primary-25'}`}
                    onClick={() => setExpanded(isOpen ? null : inv.code)}
                  >
                    <td className={`${td} text-center`} onClick={e => e.stopPropagation()}>
                      <label className="kv-check justify-center">
                        <input type="checkbox" checked={selected.has(inv.code)} onChange={() => toggleRow(inv.code)} />
                        <span className="kv-check-box" />
                      </label>
                    </td>
                    <td className={`${td} font-medium ${isOpen ? 'text-primary' : 'text-ink'}`}>{inv.code}</td>
                    <td className={td}>
                      <span className="whitespace-pre-line">{inv.time.replace(' ', '\n')}</span>
                    </td>
                    <td className={td}>{inv.customer}</td>
                    <td className={`${td} text-right`}>{vnd(totalAmount)}</td>
                    <td className={`${td} text-right`}>{vnd(inv.discount)}</td>
                    <td className={`${td} text-right`}>{vnd(inv.paid)}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <InvoiceDetail invoice={inv} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}

            {invoices.length === 0 && (
              <tr>
                <td className={`${td} text-center text-ink-muted`} colSpan={7}>Không tìm thấy hóa đơn nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 px-4 py-3 border-t border-line shrink-0">
        <span className="text-md text-ink-subtle">Hiển thị 1 - {invoices.length} trên tổng số {invoices.length}</span>
      </div>
    </div>
  )
}

export default InvoiceTable
