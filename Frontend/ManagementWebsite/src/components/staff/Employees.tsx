import { useMemo, useState } from 'react'
import EmployeeFilters from './EmployeeFilters'
import type { EmpStatus } from './EmployeeFilters'
import EmployeeToolbar from './EmployeeToolbar'
import EmployeeTable from './EmployeeTable'
import EmployeeModal from './EmployeeModal'
import {
  employees as initialEmployees,
  departments as initialDepartments,
  positions as initialPositions,
} from '../../data/mockData'
import type { Employee } from '../../data/mockData'

const Employees = () => {
  const [items, setItems] = useState<Employee[]>(initialEmployees)
  const [departments, setDepartments] = useState<string[]>(initialDepartments)
  const [positions, setPositions] = useState<string[]>(initialPositions)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EmpStatus>('active')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)

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

  const handleSave = (emp: Employee, addAnother: boolean) => {
    setItems(prev => {
      const exists = prev.some(e => e.id === emp.id)
      return exists ? prev.map(e => (e.id === emp.id ? emp : e)) : [emp, ...prev]
    })
    if (emp.department && !departments.includes(emp.department)) setDepartments(prev => [...prev, emp.department])
    if (emp.position && !positions.includes(emp.position)) setPositions(prev => [...prev, emp.position])
    if (!addAnother) {
      setShowAdd(false)
      setEditEmp(null)
    }
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
        />
        <EmployeeTable
          employees={filtered}
          onAdd={() => setShowAdd(true)}
          onRowClick={setEditEmp}
        />
      </section>

      {showAdd && (
        <EmployeeModal
          nextCode={nextCode}
          departments={departments}
          positions={positions}
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      )}
      {editEmp && (
        <EmployeeModal
          employee={editEmp}
          nextCode={nextCode}
          departments={departments}
          positions={positions}
          onClose={() => setEditEmp(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Employees
