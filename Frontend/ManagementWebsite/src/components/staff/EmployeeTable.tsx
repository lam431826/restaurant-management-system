import { Fragment, useState } from 'react'
import type { Employee } from '../../data/mockData'
import EmployeeDetail from './EmployeeDetail'

interface Props {
  employees: Employee[]
  departments: string[]
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

const EmployeeTable = ({ employees, departments, onAdd, onSave, onToggleActive }: Props) => {
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
              <th className={`${th} w-[13rem]`}>Mã nhân viên</th>
              <th className={`${th} w-[13rem]`}>Mã chấm công</th>
              <th className={th}>Tên nhân viên</th>
              <th className={`${th} w-[14rem]`}>Số điện thoại</th>
              <th className={`${th} w-[15rem]`}>Số CMND/CCCD</th>
              <th className={`${th} text-right w-[14rem]`}>Nợ và tạm ứng</th>
              <th className={`${th} w-[16rem]`}>Ghi chú</th>
            </tr>
          </thead>
          {employees.length > 0 && (
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
                    <td className={`${td} text-primary font-medium`}>{e.code}</td>
                    <td className={td}>{e.timekeepCode}</td>
                    <td className={td}>{e.name}</td>
                    <td className={td}>
                      <span className="flex items-center gap-1.5">
                        {e.phone}
                        {!e.phoneVerified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning shrink-0">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        )}
                      </span>
                    </td>
                    <td className={td}>{e.idNumber}</td>
                    <td className={`${td} text-right ${e.debt > 0 ? 'text-danger font-medium' : ''}`}>{e.debt.toLocaleString('vi-VN')}</td>
                    <td className={`${td} text-ink-muted`}>{e.note}</td>
                  </tr>
                  {expandedCode === e.code && (
                    <tr>
                      <td colSpan={8} className="p-0 border-b border-line" onClick={ev => ev.stopPropagation()}>
                        <EmployeeDetail
                          employee={e}
                          departments={departments}
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

        {employees.length === 0 && <EmptyState onAdd={onAdd} />}
      </div>

      {employees.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 border-t border-line shrink-0">
          <span className="text-md text-ink-subtle">1 - {employees.length} trên tổng số {employees.length}</span>
        </div>
      )}
    </div>
  )
}

export default EmployeeTable
