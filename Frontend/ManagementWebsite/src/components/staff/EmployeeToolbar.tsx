import { useEffect, useRef, useState } from 'react'
import type { Employee } from '../../data/mockData'

interface Props {
  search: string
  onSearch: (v: string) => void
  onAdd: () => void
  employees: Employee[]
  onApprovalsClick: () => void
  pendingApprovals: number
  onMissingClick: () => void
  missingCount: number
}

const exportCsv = (employees: Employee[]) => {
  const header = ['Mã nhân viên', 'Mã chấm công', 'Tên nhân viên', 'Số điện thoại', 'Số CMND/CCCD', 'Nợ và tạm ứng', 'Phòng ban', 'Chức danh']
  const rows = employees.map(e => [e.code, e.timekeepCode, e.name, e.phone, e.idNumber, e.debt, e.department, e.position])
  const csv = [header, ...rows]
    .map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nhan-vien-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const EmployeeToolbar = ({ search, onSearch, onAdd, employees, onApprovalsClick, pendingApprovals, onMissingClick, missingCount }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const menuItem = 'block w-full text-left px-5 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)] hover:text-primary'

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0 relative flex items-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-ink-muted pointer-events-none">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="w-full h-12 pl-[4.4rem] pr-4 bg-card border border-line rounded-full text-md text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-ink-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]"
          placeholder="Tìm theo mã, tên nhân viên"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button className="kv-btn kv-btn-outline-primary h-10 bg-card" onClick={onAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nhân viên
        </button>

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card relative" onClick={onApprovalsClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" /><path d="M9 14l2 2 4-4" />
          </svg>
          Duyệt yêu cầu
          {pendingApprovals > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.2rem] h-[1.2rem] px-1 rounded-full bg-danger text-white text-[0.65rem] font-bold flex items-center justify-center">
              {pendingApprovals}
            </span>
          )}
        </button>

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card relative" onClick={onMissingClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
          </svg>
          Thiếu chấm công
          {missingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.2rem] h-[1.2rem] px-1 rounded-full bg-danger text-white text-[0.65rem] font-bold flex items-center justify-center">
              {missingCount}
            </span>
          )}
        </button>

        <input
          ref={importRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) window.alert(`Đã chọn tệp nhập: ${f.name}`); e.target.value = '' }}
        />
        <div ref={ref} className="relative">
          <button
            className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer shrink-0 transition-colors hover:border-primary hover:text-primary"
            aria-label="Thêm thao tác"
            onClick={() => setMenuOpen(o => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] bg-card border border-line-default rounded-md shadow-md min-w-[18rem] py-2 z-[var(--kv-z-dropdown)]">
              <button className={menuItem} onClick={() => { importRef.current?.click(); setMenuOpen(false) }}>Import nhân viên</button>
              <button className={menuItem} onClick={() => { exportCsv(employees); setMenuOpen(false) }}>Xuất file</button>
            </div>
          )}
        </div>

        <button
          className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer shrink-0 transition-colors hover:border-primary hover:text-primary"
          aria-label="Tùy chọn cột"
          title="Tùy chọn hiển thị cột"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default EmployeeToolbar
