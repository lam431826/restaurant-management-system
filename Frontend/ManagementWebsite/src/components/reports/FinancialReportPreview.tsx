import { useEffect, useRef, useState } from 'react'
import { BRANCHES, CUSTOM_LINE_INSERT_AFTER, FIN_LINES, sumCustomLineValues, sumValues } from '../../data/financialReportMockData'
import type { FinancialCustomLine, FinancialFilterState, FinancialPeriod } from '../../data/financialReportMockData'
import { upsertFinancialCustomLineValue } from '../../api/reports'

const money = (n: number) => n.toLocaleString('vi-VN')
const fmtDateTime = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const escapeHtml = (v: string | number) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Props {
  periods: FinancialPeriod[]
  customLines: FinancialCustomLine[]
  filters: FinancialFilterState
  generatedAt: Date
  loading: boolean
  error: string
  onRefresh: () => void
}

/** A period column carries both the fixed FIN_LINES values and the custom line amounts,
 * whether it's a real period or the synthetic "Tổng" column. */
interface ReportColumn {
  key: string
  label: string
  values: Record<string, number>
  customLineValues: Record<string, number>
}

const IconBtn = ({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) => (
  <button
    type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}
    className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle transition-colors enabled:hover:bg-fill enabled:hover:text-ink disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
  >
    {children}
  </button>
)
const Divider = () => <span className="w-px h-6 bg-line mx-1" />

const UndoIcon = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></svg>)
const RedoIcon = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 15-6.7L21 13" /></svg>)
const RefreshIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>)
const FirstIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><line x1="18" y1="7" x2="18" y2="17" /></svg>)
const PrevIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>)
const NextIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>)
const LastIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7" /><line x1="6" y1="7" x2="6" y2="17" /></svg>)
const ExportIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.9A5 5 0 0 1 6 5.3 6 6 0 0 1 17.7 7 4.5 4.5 0 0 1 17 16H6a5 5 0 0 1-2-1.1z" /><polyline points="9 15 12 12 15 15" /><line x1="12" y1="12" x2="12" y2="21" /></svg>)
const PrinterIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>)
const ZoomOutIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>)
const ZoomInIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>)
const FullscreenIcon = ({ active }: { active: boolean }) => active ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /></svg>
)

const buildPrintHtml = (periods: FinancialPeriod[], customLines: FinancialCustomLine[], generatedAt: Date) => {
  const total = sumValues(periods)
  const totalCustomLineValues = sumCustomLineValues(periods)
  const showTotal = periods.length > 1
  const cols: ReportColumn[] = [
    ...periods,
    ...(showTotal ? [{ key: 'total', label: 'Tổng', values: total, customLineValues: totalCustomLineValues }] : []),
  ]

  const customRowsHtml = (group: 'EXPENSE' | 'OTHER_INCOME') => customLines
    .filter(l => l.group === group)
    .map(line => `
      <tr>
        <td style="padding-left:24px">${escapeHtml(line.name)}</td>
        ${cols.map(c => `<td class="num">${money(c.customLineValues[line.id] ?? 0)}</td>`).join('')}
      </tr>
    `).join('')

  const bodyRows = FIN_LINES.map(line => `
    <tr class="${line.bold ? 'bold' : ''}">
      <td style="padding-left:${line.level === 1 ? 24 : 8}px">${escapeHtml(line.label)}</td>
      ${cols.map(c => `<td class="num">${money(c.values[line.key])}</td>`).join('')}
    </tr>
    ${CUSTOM_LINE_INSERT_AFTER[line.key] ? customRowsHtml(CUSTOM_LINE_INSERT_AFTER[line.key] as 'EXPENSE' | 'OTHER_INCOME') : ''}
  `).join('')

  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Báo cáo kết quả hoạt động kinh doanh</title>
        <style>
          * { box-sizing: border-box; }
          @page { margin: 14mm; }
          body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
          .meta { font-size: 11px; color: #666; }
          h1 { text-align: center; font-size: 18px; margin: 8px 0 4px; }
          .sub { text-align: center; font-size: 12px; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
          th { background: #cfe3fb; text-align: right; padding: 6px; border-bottom: 1px solid #9db8d6; }
          th:first-child { text-align: left; }
          td { padding: 5px 6px; border-bottom: 1px solid #e5e5e5; }
          .num { text-align: right; }
          .bold td { font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="meta">Ngày lập ${escapeHtml(fmtDateTime(generatedAt))}</div>
        <h1>Báo cáo kết quả hoạt động kinh doanh</h1>
        <div class="sub">${escapeHtml(BRANCHES.join(', '))}</div>
        <table>
          <thead>
            <tr><th></th>${cols.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `
}

const exportCsv = (periods: FinancialPeriod[], customLines: FinancialCustomLine[], filters: FinancialFilterState) => {
  const total = sumValues(periods)
  const totalCustomLineValues = sumCustomLineValues(periods)
  const showTotal = periods.length > 1
  const cols: ReportColumn[] = [
    ...periods,
    ...(showTotal ? [{ key: 'total', label: 'Tổng', values: total, customLineValues: totalCustomLineValues }] : []),
  ]
  const header = ['', ...cols.map(c => c.label)]
  const body = FIN_LINES.flatMap(line => {
    const row = [line.label, ...cols.map(c => c.values[line.key])]
    const group = CUSTOM_LINE_INSERT_AFTER[line.key]
    const customRows = group
      ? customLines.filter(l => l.group === group).map(l => [l.name, ...cols.map(c => c.customLineValues[l.id] ?? 0)])
      : []
    return [row, ...customRows]
  })
  const csv = [header, ...body].map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bao-cao-tai-chinh-${filters.year}-${filters.granularity}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const FinancialReportPreview = ({ periods, customLines, filters, generatedAt, loading, error, onRefresh }: Props) => {
  const [zoom, setZoom] = useState(100)
  const [fullscreen, setFullscreen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onFsChange = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen()
  }

  const handleRefresh = () => {
    setRefreshing(true)
    onRefresh()
    setTimeout(() => setRefreshing(false), 300)
  }

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=1100,height=720')
    if (!win) return
    win.document.write(buildPrintHtml(periods, customLines, generatedAt))
    win.document.close()
    win.focus()
    win.print()
  }

  const handleCustomAmountBlur = (lineId: string, periodKey: string, raw: string) => {
    const [yearStr, monthStr] = periodKey.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const amount = parseInt(raw.replace(/\D/g, '') || '0', 10)
    setSaveError('')
    upsertFinancialCustomLineValue(lineId, year, month, amount)
      .then(onRefresh)
      .catch(() => setSaveError('Không thể lưu giá trị vừa nhập.'))
  }

  const total = sumValues(periods)
  const totalCustomLineValues = sumCustomLineValues(periods)
  const showTotal = periods.length > 1
  const columns: ReportColumn[] = [
    ...periods,
    ...(showTotal ? [{ key: 'total', label: 'Tổng', values: total, customLineValues: totalCustomLineValues }] : []),
  ]

  return (
    <div ref={containerRef} className="flex-1 min-w-0 flex flex-col bg-fill-strong/40 rounded-lg overflow-hidden">
      {/* ── PDF-viewer-style toolbar ─────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-0.5 px-2 py-1.5 bg-card border-b border-line">
        <IconBtn label="Hoàn tác" disabled><UndoIcon /></IconBtn>
        <IconBtn label="Làm lại" disabled><RedoIcon /></IconBtn>
        <IconBtn label="Làm mới" onClick={handleRefresh}>
          <span className={refreshing || loading ? 'animate-spin inline-flex' : 'inline-flex'}><RefreshIcon /></span>
        </IconBtn>
        <Divider />
        <IconBtn label="Trang đầu" disabled><FirstIcon /></IconBtn>
        <IconBtn label="Trang trước" disabled><PrevIcon /></IconBtn>
        <span className="w-12 h-9 px-2 rounded-md border border-line-default bg-field text-md text-ink font-medium text-center flex items-center justify-center">1</span>
        <span className="text-md text-ink-subtle">/1</span>
        <IconBtn label="Trang sau" disabled><NextIcon /></IconBtn>
        <IconBtn label="Trang cuối" disabled><LastIcon /></IconBtn>
        <Divider />
        <div ref={exportRef} className="relative">
          <IconBtn label="Xuất file" onClick={() => setExportOpen(o => !o)}><ExportIcon /></IconBtn>
          {exportOpen && (
            <div className="absolute left-0 top-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1 min-w-[10rem]">
              <button type="button" onClick={() => { exportCsv(periods, customLines, filters); setExportOpen(false) }} className="block w-full text-left px-3 py-2 text-md text-ink hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">Xuất file (CSV)</button>
            </div>
          )}
        </div>
        <IconBtn label="In báo cáo" onClick={handlePrint}><PrinterIcon /></IconBtn>
        <Divider />
        <IconBtn label="Thu nhỏ" onClick={() => setZoom(z => Math.max(50, z - 10))}><ZoomOutIcon /></IconBtn>
        <span className="w-11 text-center text-sm text-ink-subtle select-none">{zoom}%</span>
        <IconBtn label="Phóng to" onClick={() => setZoom(z => Math.min(200, z + 10))}><ZoomInIcon /></IconBtn>
        <IconBtn label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onClick={toggleFullscreen}><FullscreenIcon active={fullscreen} /></IconBtn>
      </div>

      {error && (
        <div className="shrink-0 px-4 py-2 bg-danger-50 text-danger text-md border-b border-danger/30">{error}</div>
      )}
      {saveError && (
        <div className="shrink-0 px-4 py-2 bg-danger-50 text-danger text-md border-b border-danger/30">{saveError}</div>
      )}

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }} className="transition-transform w-fit mx-auto">
          <div className="bg-card shadow-lg p-8 w-fit">
            <div className="text-sm text-ink-subtle">Ngày lập {fmtDateTime(generatedAt)}</div>
            <h2 className="text-h3 font-bold text-ink text-center mt-1">Báo cáo kết quả hoạt động kinh doanh</h2>
            <div className="text-md text-ink text-center mt-1">{BRANCHES.join(', ')}</div>

            <table className="border-collapse mt-5" style={{ width: 340 + columns.length * 180 }}>
              <colgroup>
                <col style={{ width: 340 }} />
                {columns.map(c => <col key={c.label} style={{ width: 180 }} />)}
              </colgroup>
              <thead>
                <tr className="bg-primary-50">
                  <th className="font-semibold text-ink-strong px-2 py-2 border-b border-primary-150 text-sm text-left" />
                  {columns.map(c => (
                    <th key={c.label} className="font-semibold text-ink-strong px-2 py-2 border-b border-primary-150 text-sm text-right">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && periods.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} className="text-center text-ink-muted py-10">Đang tải dữ liệu...</td></tr>
                ) : periods.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} className="text-center text-ink-muted py-10">Không có dữ liệu phù hợp</td></tr>
                ) : FIN_LINES.flatMap((line, i) => {
                  const zebra = i % 2 === 1 ? 'bg-fill/30' : ''
                  const rows = [
                    <tr key={line.key} className={zebra}>
                      <td className={`px-2 py-2 text-sm text-ink ${line.level === 1 ? 'pl-8' : 'pl-2'} ${line.bold ? 'font-semibold' : ''}`}>
                        {line.label}
                      </td>
                      {columns.map(c => (
                        <td key={c.label} className={`px-2 py-2 text-sm text-ink text-right ${line.bold ? 'font-semibold' : ''}`}>
                          {money(c.values[line.key])}
                        </td>
                      ))}
                    </tr>,
                  ]
                  const group = CUSTOM_LINE_INSERT_AFTER[line.key]
                  if (group) {
                    for (const cl of customLines.filter(l => l.group === group)) {
                      rows.push(
                        <tr key={cl.id} className={zebra}>
                          <td className="px-2 py-2 text-sm text-ink pl-8">{cl.name}</td>
                          {columns.map(c => {
                            const amount = c.customLineValues[cl.id] ?? 0
                            const editable = filters.granularity === 'month' && c.key !== 'total'
                            return (
                              <td key={c.label} className="px-2 py-2 text-sm text-ink text-right">
                                {editable ? (
                                  <input
                                    key={`${cl.id}-${c.key}-${amount}`}
                                    defaultValue={money(amount)}
                                    inputMode="numeric"
                                    className="w-full h-7 px-1 text-right bg-transparent border border-transparent rounded hover:border-line-default focus:border-primary outline-none"
                                    onBlur={e => handleCustomAmountBlur(cl.id, c.key, e.target.value)}
                                  />
                                ) : money(amount)}
                              </td>
                            )
                          })}
                        </tr>,
                      )
                    }
                  }
                  return rows
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinancialReportPreview
