import { useEffect, useMemo, useState } from 'react'
import EmployeeFilters from './EmployeeFilters'
import type { EmpStatus } from './EmployeeFilters'
import EmployeeToolbar from './EmployeeToolbar'
import EmployeeTable from './EmployeeTable'
import EmployeeModal from './EmployeeModal'
import RequestsInboxModal from './schedule/RequestsInboxModal'
import MissingClockoutModal from './schedule/MissingClockoutModal'
import { listRequests, listMissingClockouts } from '../../services/rosterService'
import {
  employees as initialEmployees,
  departments as initialDepartments,
  positions as initialPositions,
  employeeBranches,
} from '../../data/mockData'
import type { Employee } from '../../data/mockData'

const Employees = () => {
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [items, setItems] = useState<Employee[]>(initialEmployees)
  const [departments, setDepartments] = useState<string[]>(initialDepartments)
  const [positions, setPositions] = useState<string[]>(initialPositions)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EmpStatus>('active')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [showMissing, setShowMissing] = useState(false)
  const [missingCount, setMissingCount] = useState(0)

  useEffect(() => {
    listRequests()
      .then(reqs => setPendingApprovals(reqs.filter(r => r.status === 'PENDING').length))
      .catch(() => {})
  }, [showRequests])

  // BR-WS-14: count MISSING_CLOCKOUT records (last 14 days) for the toolbar badge.
  useEffect(() => {
    const to = new Date()
    const from = new Date(); from.setDate(from.getDate() - 14)
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    listMissingClockouts(ymd(from), ymd(to))
      .then(recs => setMissingCount(recs.length))
      .catch(() => {})
  }, [showMissing])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(e => {
      if (status === 'active' && !e.active) return false
      if (status === 'inactive' && e.active) return false
      if (department && e.department !== department) return false
      if (position && e.position !== position) return false
      if (q && !(`${e.code} ${e.name}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [items, status, department, position, search])

  const nextCode = useMemo(() => {
    const max = items.reduce((m, e) => {
      const n = parseInt(e.code.replace(/\D/g, ''), 10)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
    return 'NV' + String(max + 1).padStart(6, '0')
  }, [items])

  const createDepartment = () => {
    const name = window.prompt('Tên phòng ban mới:')?.trim()
    if (name) setDepartments(prev => (prev.includes(name) ? prev : [...prev, name]))
  }
  const createPosition = () => {
    const name = window.prompt('Tên chức danh mới:')?.trim()
    if (name) setPositions(prev => (prev.includes(name) ? prev : [...prev, name]))
  }

  const handleCreate = (emp: Employee, addAnother: boolean) => {
    setItems(prev => [emp, ...prev])
    if (emp.department && !departments.includes(emp.department)) setDepartments(prev => [...prev, emp.department])
    if (emp.position && !positions.includes(emp.position)) setPositions(prev => [...prev, emp.position])
    if (!addAnother) setShowAdd(false)
  }

  const handleUpdate = (emp: Employee) => {
    setItems(prev => prev.map(e => (e.id === emp.id ? emp : e)))
    if (emp.department && !departments.includes(emp.department)) setDepartments(prev => [...prev, emp.department])
    if (emp.position && !positions.includes(emp.position)) setPositions(prev => [...prev, emp.position])
  }

  const handleToggleActive = (emp: Employee) => {
    const verb = emp.active ? 'ngừng làm việc' : 'tiếp tục làm việc'
    if (!window.confirm(`Xác nhận ${verb} đối với nhân viên ${emp.name}?`)) return
    handleUpdate({ ...emp, active: !emp.active })
  }

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto border-r border-line">
        <h1 className="text-h3 font-extrabold text-ink">Danh sách nhân viên</h1>
        <p className="text-sm text-ink-subtle mt-1 mb-5">
          Đã sử dụng {items.length} nhân viên. <a href="#" className="text-primary hover:underline">Nâng gói</a>
        </p>
        <EmployeeFilters
          status={status}
          department={department}
          position={position}
          departments={departments}
          positions={positions}
          onStatus={setStatus}
          onDepartment={setDepartment}
          onPosition={setPosition}
          onCreateDepartment={createDepartment}
          onCreatePosition={createPosition}
        />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col pt-5 pr-5 gap-4">
        <EmployeeToolbar
          search={search}
          onSearch={setSearch}
          onAdd={() => setShowAdd(true)}
          employees={items}
          onApprovalsClick={() => setShowRequests(true)}
          pendingApprovals={pendingApprovals}
          onMissingClick={() => setShowMissing(true)}
          missingCount={missingCount}
        />
        <EmployeeTable
          employees={filtered}
          departments={departments}
          positions={positions}
          branches={employeeBranches}
          onAdd={() => setShowAdd(true)}
          onSave={handleUpdate}
          onToggleActive={handleToggleActive}
        />
      </section>

      {showAdd && (
        <EmployeeModal
          nextCode={nextCode}
          departments={departments}
          positions={positions}
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}

      {showRequests && <RequestsInboxModal onClose={() => setShowRequests(false)} />}
      {showMissing && <MissingClockoutModal onClose={() => setShowMissing(false)} />}
    </div>
  )
}

export default Employees
