import { useCallback, useEffect, useMemo, useState } from 'react'
import EmployeeFilters from './EmployeeFilters'
import type { EmpStatus } from './EmployeeFilters'
import EmployeeToolbar from './EmployeeToolbar'
import EmployeeTable from './EmployeeTable'
import EmployeeModal from './EmployeeModal'
import { listEmployees, createEmployee, deactivateEmployee, updateEmployee, toEmployee } from '../../api/employees'
import type { EmployeeFormPayload, EmployeeStatus } from '../../api/employees'
import type { Employee } from '../../data/mockData'

const PAGE_SIZE = 20

const toServerStatus = (status: EmpStatus): EmployeeStatus => (status === 'active' ? 'ACTIVE' : 'INACTIVE')

const Employees = () => {
  const [items, setItems] = useState<Employee[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EmpStatus>('active')

  const [showAdd, setShowAdd] = useState(false)

  const fetchEmployees = useCallback(async (p: number, s: EmpStatus) => {
    setLoading(true)
    try {
      const res = await listEmployees({ page: p, size: PAGE_SIZE, status: toServerStatus(s) })
      setItems(res.data.data.map(toEmployee))
      setPage(p)
      setTotal(res.data.pagination.total)
      setTotalPages(res.data.pagination.totalPages)
    } catch {
      // keep the previously loaded page on a failed refresh
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEmployees(0, status) }, [fetchEmployees, status])

  // Search only matches within the currently loaded page (same limitation as the Users/AdminDashboard screen).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(e => `${e.code} ${e.name}`.toLowerCase().includes(q))
  }, [items, search])

  const handleCreate = async (payload: EmployeeFormPayload) => {
    await createEmployee(payload)
    await fetchEmployees(0, status)
    setShowAdd(false)
  }

  const handleUpdate = () => {
    fetchEmployees(page, status)
  }

  const handleToggleActive = async (emp: Employee) => {
    const verb = emp.status === 'ACTIVE' ? 'ngừng làm việc' : 'tiếp tục làm việc'
    if (!window.confirm(`Xác nhận ${verb} đối với nhân viên ${emp.name}?`)) return
    try {
      if (emp.status === 'ACTIVE') {
        await deactivateEmployee(emp.id)
      } else {
        await updateEmployee(emp.id, { status: 'ACTIVE' })
      }
      await fetchEmployees(page, status)
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } } }
      window.alert(anyErr.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto border-r border-line">
        <h1 className="text-h3 font-extrabold text-ink">Danh sách nhân viên</h1>
        <p className="text-sm text-ink-subtle mt-1 mb-5">
          Đã sử dụng {total} nhân viên. <a href="#" className="text-primary hover:underline">Nâng gói</a>
        </p>
        <EmployeeFilters status={status} onStatus={setStatus} />
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
          loading={loading}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={p => fetchEmployees(p, status)}
          onAdd={() => setShowAdd(true)}
          onSave={handleUpdate}
          onToggleActive={handleToggleActive}
        />
      </section>

      {showAdd && (
        <EmployeeModal
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}

export default Employees
