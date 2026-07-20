import { useEffect, useMemo, useState } from 'react'
import EndOfDayFilters from './EndOfDayFilters'
import EndOfDayPreview from './EndOfDayPreview'
import { listUsers } from '../../api/users'
import { getEndOfDaySalesReport, PAYMENT_METHOD_LABEL } from '../../api/reports'
import type { EndOfDaySalesRow, ReportPaymentMethod } from '../../api/reports'
import { defaultEndOfDayFilters } from '../../data/endOfDayReportMockData'
import type { EndOfDayFilterState } from '../../data/endOfDayReportMockData'

interface StaffOption { id: string; fullName: string }

/** Single-day mode: date + optional time-of-day window. Custom range: full days. Either way
 * this collapses to one LocalDateTime bound pair the backend query understands directly. */
const buildDateTimeBounds = (f: EndOfDayFilterState): { from: string; to: string } | null => {
  if (f.useCustomRange) {
    if (!f.customFrom || !f.customTo) return null
    return { from: `${f.customFrom}T00:00:00`, to: `${f.customTo}T23:59:59` }
  }
  if (!f.date) return null
  return { from: `${f.date}T${f.timeFrom || '00:00'}:00`, to: `${f.date}T${f.timeTo || '23:59'}:59` }
}

const errMsg = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

const EndOfDayReport = () => {
  const [filters, setFilters] = useState<EndOfDayFilterState>(defaultEndOfDayFilters)
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [rows, setRows] = useState<EndOfDaySalesRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedAt, setGeneratedAt] = useState(() => new Date())
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    // Order-creation is CASHIER/MANAGER-only (see OrderController), so those are the only
    // roles that can ever end up as an invoice's "Người nhận đơn".
    listUsers(0, 200)
      .then(res => {
        const staff = res.data.data
          .filter(u => u.role === 'CASHIER' || u.role === 'MANAGER')
          .map(u => ({ id: u.id, fullName: u.fullName }))
        setStaffList(staff)
      })
      .catch(() => { /* staff filter just has no options if this fails — rest of the report still works */ })
  }, [])

  const staffOptions = useMemo(() => staffList.map(s => s.fullName), [staffList])
  const staffIdByName = useMemo(() => new Map(staffList.map(s => [s.fullName, s.id])), [staffList])

  const bounds = useMemo(() => buildDateTimeBounds(filters), [filters])

  useEffect(() => {
    if (!bounds) return
    let cancelled = false

    // Deferred so the effect body has no synchronous setState call (react-hooks/set-state-in-effect) —
    // same pattern already established in Payroll.tsx/CashBook.tsx for this exact "loading flag
    // before an async fetch" shape.
    const timer = setTimeout(() => {
      if (cancelled) return
      setLoading(true)
      setError('')

      // "Người nhận đơn" (multi) and "Người tạo" (single) both filter the same underlying
      // cashierId field (see backend decision), so they're combined into one inclusive id set.
      const staffIds = Array.from(new Set(
        [...filters.staffNames, ...(filters.createdBy ? [filters.createdBy] : [])]
          .map(name => staffIdByName.get(name))
          .filter((id): id is string => !!id),
      ))
      const paymentMethodKey = filters.paymentMethod
        ? (Object.entries(PAYMENT_METHOD_LABEL).find(([, label]) => label === filters.paymentMethod)?.[0] as ReportPaymentMethod | undefined)
        : undefined

      getEndOfDaySalesReport({
        from: bounds.from,
        to: bounds.to,
        staffIds: staffIds.length > 0 ? staffIds : undefined,
        paymentMethod: paymentMethodKey,
        areaName: filters.areaName || undefined,
        tableName: filters.tableName || undefined,
      })
        .then(res => {
          if (cancelled) return
          setRows(res.data.data)
          setGeneratedAt(new Date())
        })
        .catch(err => { if (!cancelled) setError(errMsg(err, 'Không tải được báo cáo cuối ngày.')) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [bounds, filters.staffNames, filters.createdBy, filters.paymentMethod, filters.areaName, filters.tableName, staffIdByName, refreshNonce])

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden p-5 gap-5">
      <div className="flex flex-col w-[26rem] shrink-0">
        <h1 className="text-h3 font-extrabold text-ink mb-4">Báo cáo cuối ngày</h1>
        <aside className="flex-1 min-h-0 overflow-y-auto bg-card border border-line rounded-lg p-4">
          <EndOfDayFilters value={filters} onChange={setFilters} staffOptions={staffOptions} />
        </aside>
      </div>

      <EndOfDayPreview
        rows={bounds ? rows : []} filters={filters} generatedAt={generatedAt} loading={loading} error={error}
        onRefresh={() => setRefreshNonce(n => n + 1)}
      />
    </div>
  )
}

export default EndOfDayReport
