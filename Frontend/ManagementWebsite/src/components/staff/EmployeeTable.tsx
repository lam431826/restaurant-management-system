import { Fragment, useState } from 'react'
import type { Employee } from '../../data/mockData'
import EmployeeDetail from './EmployeeDetail'

export interface EmployeeColumn { key: string; label: string; width?: string; render: (e: Employee) => React.ReactNode }

// Toggleable via the "Tùy chọn cột" dropdown in EmployeeToolbar — kept in one place so the
// toolbar's checkbox list and the table's rendering never drift out of sync.
export const EMPLOYEE_COLUMNS: EmployeeColumn[] = [
  { key: 'code', label: 'Mã nhân viên', width: 'w-[13rem]', render: e => <span className="text-primary font-medium">{e.code}</span> },
  { key: 'timekeepCode', label: 'Mã chấm công', width: 'w-[13rem]', render: e => e.timekeepCode },
  { key: 'name', label: 'Tên nhân viên', render: e => e.name },
  { key: 'phone', label: 'Số điện thoại', width: 'w-[14rem]', render: e => e.phone },
  { key: 'idNumber', label: 'Số CMND/CCCD', width: 'w-[15rem]', render: e => e.idNumber },
  { key: 'note', label: 'Ghi chú', width: 'w-[16rem]', render: e => <span className="text-ink-muted">{e.note}</span> },
]
export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> =
  Object.fromEntries(EMPLOYEE_COLUMNS.map(c => [c.key, true]))

interface Props {
  employees: Employee[]
  loading?: boolean
  page: number
  totalPages: number
  total: number
  visibleColumns: Record<string, boolean>
  onPageChange: (page: number) => void
  onAdd: () => void
  onSave: (emp: Employee) => void
  onToggleActive: (emp: Employee) => void
}

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle'

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
    <div className="w-[9rem] h-[9rem] rounded-full bg-primary-50 flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--kv-primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
      </svg>
    </div>
    <div className="text-lg font-semibold text-ink-strong mt-2">Gian hàng chưa có nhân viên.</div>
    <div className="text-md text-ink-subtle">
      Nhấn <button className="text-primary cursor-pointer hover:underline" onClick={onAdd}>vào đây</button> để thêm mới nhân viên.
    </div>
  </div>
)

const pageBtnCls = 'h-9 min-w-[2.25rem] px-2 flex items-center justify-center border border-line-default rounded-md text-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary cursor-pointer'

const EmployeeTable = ({ employees, loading, page, totalPages, total, visibleColumns, onPageChange, onAdd, onSave, onToggleActive }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedCode, setExpandedCode] = useState<string | null>(null)

  const allSelected = employees.length > 0 && selected.size === employees.length
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(employees.map(e => e.code)))
  const toggleRow = (code: string) =>
    setSelected(s => {
      const next = new Set(s)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })

  const visibleCols = EMPLOYEE_COLUMNS.filter(c => visibleColumns[c.key])
  const colSpan = visibleCols.length + 1

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto flex flex-col">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-[4rem] text-center`}>
                <label className="kv-check justify-center">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span className="kv-check-box" />
                </label>
              </th>
              {visibleCols.map(c => (
                <th key={c.key} className={`${th} ${c.width ?? ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          {loading && (
            <tbody>
              <tr>
                <td colSpan={colSpan} className="py-16 text-center text-md text-ink-subtle">
                  <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2 align-[-0.35em]" />
                  Đang tải...
                </td>
              </tr>
            </tbody>
          )}
          {!loading && employees.length > 0 && (
            <tbody>
              {employees.map(e => (
                <Fragment key={e.code}>
                  <tr
                    className={`cursor-pointer ${expandedCode === e.code ? 'bg-primary-50' : 'hover:bg-primary-25'}`}
                    onClick={() => setExpandedCode(c => (c === e.code ? null : e.code))}
                  >
                    <td className={`${td} text-center`} onClick={ev => ev.stopPropagation()}>
                      <label className="kv-check justify-center">
                        <input type="checkbox" checked={selected.has(e.code)} onChange={() => toggleRow(e.code)} />
                        <span className="kv-check-box" />
                      </label>
                    </td>
                    {visibleCols.map(c => (
                      <td key={c.key} className={td}>{c.render(e)}</td>
                    ))}
                  </tr>
                  {expandedCode === e.code && (
                    <tr>
                      <td colSpan={colSpan} className="p-0 border-b border-line" onClick={ev => ev.stopPropagation()}>
                        <EmployeeDetail
                          employee={e}
                          onSave={onSave}
                          onToggleActive={onToggleActive}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          )}
        </table>

        {!loading && employees.length === 0 && <EmptyState onAdd={onAdd} />}
      </div>

      {!loading && employees.length > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-line shrink-0">
          <span className="text-md text-ink-subtle">Trang {page + 1} / {totalPages || 1} · {total} nhân viên</span>
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

export default EmployeeTable
