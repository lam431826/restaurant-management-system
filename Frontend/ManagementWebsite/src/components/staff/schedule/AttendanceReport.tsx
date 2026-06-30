import { useCallback, useEffect, useState } from 'react'
import { startOfWeek, addDays, toYMD } from './scheduleUtils'
import { getAttendanceReport } from '../../../services/rosterService'
import type { AttendanceReportRow } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'

const AttendanceReport = () => {
  const [from, setFrom] = useState(() => toYMD(startOfWeek(new Date())))
  const [to, setTo] = useState(() => toYMD(addDays(startOfWeek(new Date()), 6)))
  const [rows, setRows] = useState<AttendanceReportRow[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setRows(await getAttendanceReport(from, to))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được báo cáo chấm công.')
    }
  }, [from, to])

  useEffect(() => { void load() }, [load])

  const resetToThisWeek = () => {
    const ws = startOfWeek(new Date())
    setFrom(toYMD(ws))
    setTo(toYMD(addDays(ws, 6)))
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-y-auto p-5 gap-4">
      <h1 className="text-h3 font-extrabold text-ink">Báo cáo chấm công nhân viên</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-md text-ink-subtle">Từ</span>
          <input type="date" className="h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink" value={from} max={to} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-md text-ink-subtle">Đến</span>
          <input type="date" className="h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink" value={to} min={from} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="kv-btn kv-btn-outline-neutral h-10" onClick={resetToThisWeek}>Tuần này</button>
      </div>

      {error && <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>}

      <div className="flex-1 min-h-0 bg-card border border-line rounded-t-lg overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky top-0 bg-primary-25 text-left text-md font-semibold text-ink-strong px-4 py-3">Nhân viên</th>
              <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Số ca</th>
              <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Giờ làm</th>
              <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Đi muộn</th>
              <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Vắng không báo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.employeeId} className="border-b border-line">
                <td className="px-4 py-3">
                  <div className="text-md font-medium text-ink">{r.employeeName}</div>
                </td>
                <td className="px-4 py-3 text-right text-md text-ink">{r.shiftCount}</td>
                <td className="px-4 py-3 text-right text-md text-ink">{r.workedHours}</td>
                <td className={`px-4 py-3 text-right text-md ${r.lateCount > 0 ? 'text-warning-700 font-medium' : 'text-ink'}`}>{r.lateCount}</td>
                <td className={`px-4 py-3 text-right text-md ${r.noShowCount > 0 ? 'text-danger font-medium' : 'text-ink'}`}>{r.noShowCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AttendanceReport
