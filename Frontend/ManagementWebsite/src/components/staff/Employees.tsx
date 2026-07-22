import { useCallback, useEffect, useMemo, useState } from 'react'
import EmployeeFilters from './EmployeeFilters'
import type { EmpStatus } from './EmployeeFilters'
import EmployeeToolbar from './EmployeeToolbar'
import EmployeeTable, { EMPLOYEE_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from './EmployeeTable'
import EmployeeModal from './EmployeeModal'
import ConfirmDialog from '../menu/ConfirmDialog'
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
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_COLUMNS)

  const [pendingToggle, setPendingToggle] = useState<Employee | null>(null)
  const [toggling, setToggling] = useState(false)

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
    const res = await createEmployee(payload)
    await fetchEmployees(0, status)
    setShowAdd(false)
    return res.data.data
  }

  const handleUpdate = () => {
    fetchEmployees(page, status)
  }

  const handleToggleActive = (emp: Employee) => {
    setPendingToggle(emp)
  }

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return
    setToggling(true)
    try {
      if (pendingToggle.status === 'ACTIVE') {
        await deactivateEmployee(pendingToggle.id)
      } else {
        await updateEmployee(pendingToggle.id, { status: 'ACTIVE' })
      }
      await fetchEmployees(page, status)
      setPendingToggle(null)
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } } }
      window.alert(anyErr.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto border-r border-line">
        <h1 className="text-h3 font-extrabold text-ink mb-5">Danh sách nhân viên</h1>
        <EmployeeFilters status={status} onStatus={setStatus} />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col pt-5 pr-5 gap-4">
        <EmployeeToolbar
          search={search}
          onSearch={setSearch}
          onAdd={() => setShowAdd(true)}
          employees={items}
          columns={EMPLOYEE_COLUMNS}
          visibleColumns={visibleColumns}
          onToggleColumn={key => setVisibleColumns(v => ({ ...v, [key]: !v[key] }))}
        />
        <EmployeeTable
          employees={filtered}
          loading={loading}
          page={page}
          totalPages={totalPages}
          total={total}
          visibleColumns={visibleColumns}
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

      {pendingToggle && (
        <ConfirmDialog
          title={pendingToggle.status === 'ACTIVE' ? 'Ngừng làm việc' : 'Cho phép làm việc'}
          message={
            pendingToggle.status === 'ACTIVE'
              ? <>Xác nhận ngừng làm việc đối với nhân viên <strong>{pendingToggle.name}</strong>?</>
              : <>Xác nhận cho phép nhân viên <strong>{pendingToggle.name}</strong> làm việc trở lại?</>
          }
          confirmLabel={pendingToggle.status === 'ACTIVE' ? 'Ngừng làm việc' : 'Cho phép làm việc'}
          danger={pendingToggle.status === 'ACTIVE'}
          loading={toggling}
          onConfirm={handleConfirmToggle}
          onCancel={() => { if (!toggling) setPendingToggle(null) }}
        />
      )}
    </div>
  )
}

export default Employees
