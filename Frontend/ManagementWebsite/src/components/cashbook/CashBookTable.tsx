import { Fragment } from 'react'
import CashBookDetail from './CashBookDetail'
import { COLUMN_LABEL, METHOD_LABEL } from '../../api/cashbook'
import type { CashFlowCategory, CashFlowVoucher, ColumnKey } from '../../api/cashbook'
import { Skeleton } from '../dashboard/DashboardStates'

const money = (value: number) => value.toLocaleString('vi-VN')
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle'
const pageBtnCls = 'h-9 min-w-[2.25rem] px-2 flex items-center justify-center border border-line-default rounded-md text-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary cursor-pointer'

interface Props {
  vouchers: CashFlowVoucher[]
  categories: CashFlowCategory[]
  visibleColumns: Record<ColumnKey, boolean>
  expandedId: string | null
  loading?: boolean
  onToggleExpand: (voucher: CashFlowVoucher) => void
  onVoid: (voucherId: string) => void
  onEdit: (voucher: CashFlowVoucher) => void
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

const CashBookTable = ({
  vouchers, categories, visibleColumns, expandedId, loading, onToggleExpand, onVoid, onEdit,
  page, totalPages, total, onPageChange,
}: Props) => {
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
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className={td}><Skeleton className="h-4 w-20" /></td>
                  {visibleColumns.time && <td className={td}><Skeleton className="h-4 w-24" /></td>}
                  {visibleColumns.category && <td className={td}><Skeleton className="h-4 w-32" /></td>}
                  {visibleColumns.method && <td className={td}><Skeleton className="h-4 w-16" /></td>}
                  {visibleColumns.partner && <td className={td}><Skeleton className="h-4 w-28" /></td>}
                  {visibleColumns.amount && <td className={`${td} text-right`}><Skeleton className="h-4 w-20 ml-auto" /></td>}
                </tr>
              ))}
            {!loading && vouchers.map(voucher => {
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

            {!loading && vouchers.length === 0 && (
              <tr>
                <td className={`${td} text-center text-ink-muted py-16`} colSpan={colCount}>
                  Không tìm thấy phiếu thu/chi nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && vouchers.length > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-line shrink-0">
          <span className="text-md text-ink-subtle">Trang {page + 1} / {totalPages || 1} · {total} phiếu</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => onPageChange(page - 1)}
                className={pageBtnCls}
                aria-label="Trang trước"
              >
                ← Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onPageChange(i)}
                  className={`${pageBtnCls} ${i === page ? 'bg-primary border-primary text-white hover:text-white' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
                className={pageBtnCls}
                aria-label="Trang sau"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CashBookTable
