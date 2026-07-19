import { useEffect, useMemo, useState } from 'react'
import EndOfDayFilters from './EndOfDayFilters'
import EndOfDayPreview from './EndOfDayPreview'
import { listEmployees } from '../../api/employees'
import {
  STAFF_NAMES, defaultEndOfDayFilters, generateInvoicesForDate,
} from '../../data/endOfDayReportMockData'
import type { EndOfDayFilterState, EndOfDayInvoiceRow } from '../../data/endOfDayReportMockData'

const datesBetween = (fromYMD: string, toYMD: string): string[] => {
  const [fy, fm, fd] = fromYMD.split('-').map(Number)
  const [ty, tm, td] = toYMD.split('-').map(Number)
  const from = new Date(fy, fm - 1, fd)
  const to = new Date(ty, tm - 1, td)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return []
  const days: string[] = []
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return days
}

const EndOfDayReport = () => {
  const [filters, setFilters] = useState<EndOfDayFilterState>(defaultEndOfDayFilters)
  const [staffOptions, setStaffOptions] = useState<string[]>(STAFF_NAMES)
  const [generatedAt, setGeneratedAt] = useState(() => new Date())

  useEffect(() => {
    listEmployees({ status: 'ACTIVE', size: 500 })
      .then(res => {
        const names = res.data.data.map(e => e.name)
        if (names.length > 0) setStaffOptions(names)
      })
      .catch(() => { /* keep the mock staff names as fallback */ })
  }, [])

  const rawRows = useMemo<EndOfDayInvoiceRow[]>(() => {
    const dates = filters.useCustomRange
      ? datesBetween(filters.customFrom, filters.customTo)
      : [filters.date]
    return dates.flatMap(generateInvoicesForDate)
  }, [filters.date, filters.useCustomRange, filters.customFrom, filters.customTo])

  const rows = useMemo(() => {
    const q = filters.customerQuery.trim().toLowerCase()
    return rawRows.filter(r => {
      if (filters.staffNames.length > 0 && !filters.staffNames.includes(r.staffName)) return false
      if (filters.createdBy && r.createdBy !== filters.createdBy) return false
      if (filters.paymentMethod && r.paymentMethod !== filters.paymentMethod) return false
      if (filters.areaName && r.areaName !== filters.areaName) return false
      if (filters.tableName && r.roomTable !== filters.tableName) return false
      if (q && !r.customerName.toLowerCase().includes(q) && !r.customerPhone.includes(q) && !r.code.toLowerCase().includes(q)) return false
      return true
    })
  }, [rawRows, filters])

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden p-5 gap-5">
      <div className="flex flex-col w-[26rem] shrink-0">
        <h1 className="text-h3 font-extrabold text-ink mb-4">Báo cáo cuối ngày</h1>
        <aside className="flex-1 min-h-0 overflow-y-auto bg-card border border-line rounded-lg p-4">
          <EndOfDayFilters value={filters} onChange={setFilters} staffOptions={staffOptions} />
        </aside>
      </div>

      <EndOfDayPreview rows={rows} filters={filters} generatedAt={generatedAt} onRefresh={() => setGeneratedAt(new Date())} />
    </div>
  )
}

export default EndOfDayReport
