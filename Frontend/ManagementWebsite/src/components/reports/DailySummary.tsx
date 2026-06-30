import { useCallback, useEffect, useState } from 'react'
import { getDailySummary, PAYMENT_METHOD_LABELS } from '../../services/shiftService'
import type { DailySummary as DailySummaryData, DailyCashierShiftRow } from '../../services/shiftService'
import { ApiError } from '../../services/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0)

const todayYMD = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_LABEL: Record<DailyCashierShiftRow['status'], string> = {
  OPEN: 'Đang mở',
  CLOSED: 'Đã đóng',
  PENDING_RECON: 'Chờ đối soát',
}

const STATUS_CLASS: Record<DailyCashierShiftRow['status'], string> = {
  OPEN: 'bg-warning-50 text-warning-700 border border-warning/30',
  CLOSED: 'bg-success-50 text-success-700 border border-success/30',
  PENDING_RECON: 'bg-primary-25 text-primary border border-primary/30',
}

const timeOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

const DailySummary = () => {
  const [date, setDate] = useState(todayYMD)
  const [data, setData] = useState<DailySummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getDailySummary(date))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được báo cáo cuối ngày.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { void load() }, [load])

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-y-auto p-5 gap-4">
      <h1 className="text-h3 font-extrabold text-ink">Báo cáo cuối ngày</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-md text-ink-subtle">Ngày</span>
          <input
            type="date"
            className="h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink"
            value={date}
            max={todayYMD()}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button className="kv-btn kv-btn-outline-neutral h-10" onClick={() => setDate(todayYMD())}>Hôm nay</button>
      </div>

      {error && <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>}

      {data?.incomplete && (
        <div className="px-4 py-2.5 rounded-md bg-warning-50 text-warning-700 text-md border border-warning/30 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Dữ liệu chưa đầy đủ — còn ca chưa đóng. Số liệu hiển thị là tạm tính.
        </div>
      )}

      {loading && !data && <div className="text-md text-ink-subtle">Đang tải...</div>}

      {data && data.shiftCount === 0 && !loading && (
        <div className="text-md text-ink-subtle py-8 text-center">Chưa có ca thu ngân nào trong ngày này.</div>
      )}

      {data && data.shiftCount > 0 && (
        <>
          {/* Tầng 1 — Day-level totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-line rounded-lg p-4">
              <p className="text-sm text-ink-subtle">Tổng doanh thu</p>
              <p className="text-h4 font-bold text-ink mt-1">{fmt(data.totalRevenue)}</p>
            </div>
            <div className="bg-card border border-line rounded-lg p-4">
              <p className="text-sm text-ink-subtle">Số ca</p>
              <p className="text-h4 font-bold text-ink mt-1">{data.shiftCount}</p>
            </div>
            <div className="bg-card border border-line rounded-lg p-4">
              <p className="text-sm text-ink-subtle">Thu / Chi quỹ</p>
              <p className="text-h4 font-bold text-ink mt-1">
                <span className="text-success-700">+{fmt(data.totalCashIn)}</span>
                {' / '}
                <span className="text-danger">−{fmt(data.totalCashOut)}</span>
              </p>
            </div>
            <div className="bg-card border border-line rounded-lg p-4">
              <p className="text-sm text-ink-subtle">Lệch quỹ (tổng)</p>
              <p className={`text-h4 font-bold mt-1 ${data.totalVariance > 0 ? 'text-danger' : 'text-ink'}`}>
                {fmt(data.totalVariance)}
              </p>
            </div>
          </div>

          {/* Day totals by payment method */}
          <div className="bg-card border border-line rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-primary-25 text-left text-md font-semibold text-ink-strong px-4 py-3">Phương thức</th>
                  <th className="bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Dự kiến</th>
                  <th className="bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Thực tế</th>
                  <th className="bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Lệch</th>
                </tr>
              </thead>
              <tbody>
                {data.methodTotals.map(m => (
                  <tr key={m.method} className="border-b border-line">
                    <td className="px-4 py-2.5 text-md font-medium text-ink">{PAYMENT_METHOD_LABELS[m.method]}</td>
                    <td className="px-4 py-2.5 text-right text-md text-ink">{fmt(m.expected)}</td>
                    <td className="px-4 py-2.5 text-right text-md text-ink">{fmt(m.actual)}</td>
                    <td className={`px-4 py-2.5 text-right text-md font-medium ${
                      m.variance > 0 ? 'text-success-700' : m.variance < 0 ? 'text-danger' : 'text-ink-subtle'
                    }`}>
                      {m.variance === 0 ? fmt(0) : (m.variance > 0 ? '+' : '') + fmt(m.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tầng 2 — Per-cashier breakdown */}
          <h2 className="text-h4 font-bold text-ink mt-2">Theo ca thu ngân</h2>
          <div className="bg-card border border-line rounded-lg overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-primary-25 text-left text-md font-semibold text-ink-strong px-4 py-3">Thu ngân</th>
                  <th className="sticky top-0 bg-primary-25 text-left text-md font-semibold text-ink-strong px-4 py-3">Trạng thái</th>
                  <th className="sticky top-0 bg-primary-25 text-center text-md font-semibold text-ink-strong px-4 py-3">Giờ</th>
                  <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Đầu ca</th>
                  <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Doanh thu</th>
                  <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Thu/Chi</th>
                  <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Lệch quỹ</th>
                  <th className="sticky top-0 bg-primary-25 text-right text-md font-semibold text-ink-strong px-4 py-3">Bàn giao</th>
                </tr>
              </thead>
              <tbody>
                {data.shifts.map(s => (
                  <tr key={s.shiftId} className="border-b border-line">
                    <td className="px-4 py-3 text-md font-medium text-ink">{s.cashierName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-sm font-medium ${STATUS_CLASS[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-md text-ink whitespace-nowrap">
                      {timeOf(s.openedAt)} – {timeOf(s.closedAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-md text-ink">{fmt(s.openingCash)}</td>
                    <td className="px-4 py-3 text-right text-md text-ink">{fmt(s.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right text-md whitespace-nowrap">
                      <span className="text-success-700">+{fmt(s.totalCashIn)}</span>
                      {' / '}
                      <span className="text-danger">−{fmt(s.totalCashOut)}</span>
                    </td>
                    <td className={`px-4 py-3 text-right text-md font-medium ${s.totalVariance > 0 ? 'text-danger' : 'text-ink'}`}>
                      {fmt(s.totalVariance)}
                    </td>
                    <td className="px-4 py-3 text-right text-md text-ink">{fmt(s.handoverAmount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default DailySummary
