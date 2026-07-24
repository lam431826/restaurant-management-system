import { Fragment } from 'react'
import CashBookDetail from './CashBookDetail'
import { COLUMN_LABEL, METHOD_LABEL } from '../../api/cashbook'
import type { CashFlowCategory, CashFlowVoucher, ColumnKey } from '../../api/cashbook'

const money = (value: number) => value.toLocaleString('vi-VN')
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle'

interface Props {
  vouchers: CashFlowVoucher[]
  categories: CashFlowCategory[]
  visibleColumns: Record<ColumnKey, boolean>
  expandedId: string | null
  onToggleExpand: (voucher: CashFlowVoucher) => void
  onVoid: (voucherId: string) => void
  onEdit: (voucher: CashFlowVoucher) => void
}

const CashBookTable = ({ vouchers, categories, visibleColumns, expandedId, onToggleExpand, onVoid, onEdit }: Props) => {
  const categoryName = (id: string) => categories.find(c => c.id === id)?.name ?? '—'
  const colCount = 1 + (Object.values(visibleColumns).filter(Boolean).length)

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-[80rem] border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-[14rem]`}>Mã phiếu</th>
              {visibleColumns.time && <th className={`${th} w-[13rem]`}>{COLUMN_LABEL.time}</th>}
              {visibleColumns.category && <th className={`${th} min-w-[18rem]`}>{COLUMN_LABEL.category}</th>}
              {visibleColumns.method && <th className={`${th} w-[13rem]`}>{COLUMN_LABEL.method}</th>}
              {visibleColumns.partner && <th className={`${th} min-w-[16rem]`}>{COLUMN_LABEL.partner}</th>}
              {visibleColumns.amount && <th className={`${th} text-right w-[14rem]`}>{COLUMN_LABEL.amount}</th>}
            </tr>
          </thead>
          <tbody>
            {vouchers.map(voucher => {
              const isOpen = expandedId === voucher.id
              return (
                <Fragment key={voucher.id}>
                  <tr
                    className={`cursor-pointer ${isOpen ? 'bg-primary-50' : 'hover:bg-primary-25'} ${voucher.voided ? 'opacity-50' : ''}`}
                    onClick={() => onToggleExpand(voucher)}
                  >
                    <td className={`${td} font-medium text-primary`}>
                      {voucher.code}
                      {voucher.voided && <span className="kv-badge kv-badge-neutral ml-2">Đã hủy</span>}
                    </td>
                    {visibleColumns.time && <td className={td}>{formatDateTime(voucher.createdAt)}</td>}
                    {visibleColumns.category && <td className={td}>{categoryName(voucher.categoryId)}</td>}
                    {visibleColumns.method && <td className={td}>{METHOD_LABEL[voucher.method]}</td>}
                    {visibleColumns.partner && <td className={`${td} truncate`}>{voucher.partnerName || '—'}</td>}
                    {visibleColumns.amount && (
                      <td className={`${td} text-right font-semibold ${voucher.type === 'RECEIPT' ? 'text-primary' : 'text-ink'}`}>
                        {voucher.type === 'RECEIPT' ? '' : '-'}{money(voucher.amount)}
                      </td>
                    )}
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={colCount} className="p-0">
                        <CashBookDetail
                          voucher={voucher}
                          categoryName={categoryName(voucher.categoryId)}
                          onVoid={() => onVoid(voucher.id)}
                          onEdit={() => onEdit(voucher)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}

            {vouchers.length === 0 && (
              <tr>
                <td className={`${td} text-center text-ink-muted py-16`} colSpan={colCount}>
                  Không tìm thấy phiếu thu/chi nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CashBookTable
