import { useCallback, useEffect, useMemo, useState } from 'react'
import EmployeeFilters from './EmployeeFilters'
import type { EmpStatus } from './EmployeeFilters'
import EmployeeToolbar from './EmployeeToolbar'
import EmployeeTable from './EmployeeTable'
import { EMPLOYEE_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from './employeeColumns'
import ConfirmDialog from '../menu/ConfirmDialog'
import { listEmployees, deactivateEmployee, updateEmployee, toEmployee, getDeactivationCheck } from '../../api/employees'
import type { Employee, EmployeeStatus, DeactivationCheckDto } from '../../api/employees'

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

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_COLUMNS)

  const [pendingToggle, setPendingToggle] = useState<Employee | null>(null)
  const [toggling, setToggling] = useState(false)
  const [checkResult, setCheckResult] = useState<DeactivationCheckDto | null>(null)
  const [checking, setChecking] = useState(false)
  const [ackWarnings, setAckWarnings] = useState(false)

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

  const handleUpdate = () => {
    fetchEmployees(page, status)
  }

  const closeToggle = () => {
    setPendingToggle(null)
    setCheckResult(null)
    setAckWarnings(false)
  }

  const handleToggleActive = async (emp: Employee) => {
    setPendingToggle(emp)
    setAckWarnings(false)
    if (emp.status !== 'ACTIVE') {
      // Reactivating has no eligibility constraints — keep the simple confirm flow.
      setCheckResult(null)
      return
    }
    setChecking(true)
    try {
      const res = await getDeactivationCheck(emp.id)
      setCheckResult(res.data.data)
    } catch {
      // Fail open to the plain confirm dialog; the backend still enforces the check on submit.
      setCheckResult(null)
    } finally {
      setChecking(false)
    }
  }

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return
    if (checkResult?.blocked) {
      closeToggle()
      return
    }
    setToggling(true)
    try {
      if (pendingToggle.status === 'ACTIVE') {
        await deactivateEmployee(pendingToggle.id, ackWarnings)
      } else {
        await updateEmployee(pendingToggle.id, { status: 'ACTIVE' })
      }
      await fetchEmployees(page, status)
      closeToggle()
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
          onSave={handleUpdate}
          onToggleActive={handleToggleActive}
        />
      </section>

      {pendingToggle && (() => {
        const isDeactivating = pendingToggle.status === 'ACTIVE'
        const hasWarnings = !!checkResult && (checkResult.hasOpenPosShift || checkResult.hasOpenAttendanceToday)
        const blocked = isDeactivating && !!checkResult?.blocked

        return (
          <ConfirmDialog
            title={blocked ? 'Không thể ngừng làm việc' : isDeactivating ? 'Ngừng làm việc' : 'Cho phép làm việc'}
            message={
              blocked ? (
                <div className="space-y-2">
                  <p>Nhân viên <strong>{pendingToggle.name}</strong> còn ràng buộc chưa xử lý:</p>
                  {checkResult!.futureSchedules.length > 0 && (
                    <div>
                      <p>Còn {checkResult!.futureSchedules.length} lịch làm việc trong tương lai:</p>
                      <ul className="list-disc pl-5">
                        {checkResult!.futureSchedules.slice(0, 5).map(s => (
                          <li key={s.scheduleId}>{s.workDate} — {s.shiftName ?? 'Ca không xác định'}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {checkResult!.unfinalizedPayslips.length > 0 && (
                    <div>
                      <p>Còn {checkResult!.unfinalizedPayslips.length} phiếu lương chưa chốt:</p>
                      <ul className="list-disc pl-5">
                        {checkResult!.unfinalizedPayslips.map(p => (
                          <li key={p.payslipId}>{p.payrollSheetName ?? p.payrollSheetCode} ({p.payrollSheetStatus})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p>Vui lòng xử lý qua module Xếp lịch / Bảng lương trước khi ngừng làm việc.</p>
                </div>
              ) : isDeactivating && hasWarnings ? (
                <div className="space-y-2">
                  <p>Nhân viên <strong>{pendingToggle.name}</strong> hiện đang:</p>
                  <ul className="list-disc pl-5">
                    {checkResult!.hasOpenPosShift && <li>Có ca thu ngân đang mở</li>}
                    {checkResult!.hasOpenAttendanceToday && <li>Chưa chấm công ra hôm nay</li>}
                  </ul>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={ackWarnings} onChange={e => setAckWarnings(e.target.checked)} />
                    Tôi hiểu, vẫn ngừng làm việc
                  </label>
                </div>
              ) : isDeactivating ? (
                <>Xác nhận ngừng làm việc đối với nhân viên <strong>{pendingToggle.name}</strong>?</>
              ) : (
                <>Xác nhận cho phép nhân viên <strong>{pendingToggle.name}</strong> làm việc trở lại?</>
              )
            }
            confirmLabel={blocked ? 'Đã hiểu' : isDeactivating ? 'Ngừng làm việc' : 'Cho phép làm việc'}
            confirmDisabled={blocked || (isDeactivating && hasWarnings && !ackWarnings)}
            danger={isDeactivating}
            loading={toggling || checking}
            onConfirm={handleConfirmToggle}
            onCancel={() => { if (!toggling) closeToggle() }}
          />
        )
      })()}
    </div>
  )
}

export default Employees
