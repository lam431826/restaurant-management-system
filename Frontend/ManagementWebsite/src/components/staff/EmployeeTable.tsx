import { useState } from 'react'
import type { Employee } from '../../data/mockData'

interface Props {
  employees: Employee[]
  onAdd: () => void
  onRowClick: (emp: Employee) => void
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

const EmployeeTable = ({ employees, onAdd, onRowClick }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())

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
                <tr key={e.code} className="cursor-pointer hover:bg-primary-25" onClick={() => onRowClick(e)}>
                  <td className={`${td} text-center`} onClick={ev => ev.stopPropagation()}>
                    <label className="kv-check justify-center">
                      <input type="checkbox" checked={selected.has(e.code)} onChange={() => toggleRow(e.code)} />
                      <span className="kv-check-box" />
                    </label>
                  </td>
                  <td className={`${td} text-primary font-medium`}>{e.code}</td>
                  <td className={td}>{e.timekeepCode}</td>
                  <td className={td}>{e.name}</td>
                  <td className={td}>{e.phone}</td>
                  <td className={td}>{e.idNumber}</td>
                  <td className={`${td} text-right ${e.debt > 0 ? 'text-danger font-medium' : ''}`}>{e.debt.toLocaleString('vi-VN')}</td>
                  <td className={`${td} text-ink-muted`}>{e.note}</td>
                </tr>
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
