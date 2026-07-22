import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BRANCHES } from '../../data/endOfDayReportMockData'
import { PAYMENT_METHOD_ABBR } from '../../api/reports'
import type { EndOfDaySalesRow, ReportPaymentMethod } from '../../api/reports'
import type { EndOfDayFilterState } from '../../data/endOfDayReportMockData'

const money = (n: number) => n.toLocaleString('vi-VN')
const fmtDMY = (ymd: string) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}` }
const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const escapeHtml = (v: string | number) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const abbr = (m: ReportPaymentMethod | null) => (m ? PAYMENT_METHOD_ABBR[m] : '—')

interface Props {
  rows: EndOfDaySalesRow[]
  filters: EndOfDayFilterState
  generatedAt: Date
  loading: boolean
  error: string
  onRefresh: () => void
}

const sumOf = (rows: EndOfDaySalesRow[]) => ({
  quantity: rows.reduce((s, r) => s + r.quantity, 0),
  grossAmount: rows.reduce((s, r) => s + r.grossAmount, 0),
  invoiceDiscount: rows.reduce((s, r) => s + r.invoiceDiscount, 0),
  revenue: rows.reduce((s, r) => s + r.revenue, 0),
  otherRevenue: rows.reduce((s, r) => s + r.otherRevenue, 0),
  tax: rows.reduce((s, r) => s + r.tax, 0),
  payment: rows.reduce((s, r) => s + r.payment, 0),
})

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
const DocIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>)
const ExportIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.9A5 5 0 0 1 6 5.3 6 6 0 0 1 17.7 7 4.5 4.5 0 0 1 17 16H6a5 5 0 0 1-2-1.1z" /><polyline points="9 15 12 12 15 15" /><line x1="12" y1="12" x2="12" y2="21" /></svg>)
const PrinterIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>)
const ZoomOutIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>)
const ZoomInIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>)
const FullscreenIcon = ({ active }: { active: boolean }) => active ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /></svg>
)
const MinusIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>)
const PlusIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>)

const HEADERS = [
  ['Mã chứng từ', 'left', 130], ['Phòng/Bàn', 'left', 110], ['Người nhận đơn', 'left', 150], ['Thời gian', 'left', 130], ['T.Toán', 'left', 90],
  ['SLSP', 'right', 80], ['Tổng tiền hàng', 'right', 125], ['Giảm giá HĐ', 'right', 115], ['Doanh thu', 'right', 125],
  ['Thu khác', 'right', 110], ['Thuế', 'right', 100], ['Thanh toán', 'right', 125],
] as const
const COL_COUNT = HEADERS.length
const TABLE_WIDTH = HEADERS.reduce((s, [, , w]) => s + w, 0)
const PAGE_SIZE = 20

const timeRangeLabel = (f: EndOfDayFilterState) =>
  f.useCustomRange
    ? `${f.customFrom ? fmtDMY(f.customFrom) : '...'} - ${f.customTo ? fmtDMY(f.customTo) : '...'}`
    : fmtDMY(f.date)

const buildPrintHtml = (rows: EndOfDaySalesRow[], filters: EndOfDayFilterState, generatedAt: Date) => {
  const t = sumOf(rows)

  const invoiceRows = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.code)}</td>
      <td>${escapeHtml(r.tableName ?? '—')}</td>
      <td>${escapeHtml(r.staffName ?? '—')}</td>
      <td>${escapeHtml(fmtTime(r.time))}</td>
      <td>${escapeHtml(abbr(r.paymentMethod))}</td>
      <td class="num">${r.quantity}</td>
      <td class="num">${money(r.grossAmount)}</td>
      <td class="num">${money(r.invoiceDiscount)}</td>
      <td class="num">${money(r.revenue)}</td>
      <td class="num">${money(r.otherRevenue)}</td>
      <td class="num">${money(r.tax)}</td>
      <td class="num">${money(r.payment)}</td>
    </tr>
  `).join('')

  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Báo cáo cuối ngày về bán hàng</title>
        <style>
          * { box-sizing: border-box; }
          @page { margin: 14mm; }
          body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
          .meta { font-size: 11px; color: #666; }
          h1 { text-align: center; font-size: 18px; margin: 8px 0 4px; }
          .sub { text-align: center; font-size: 12px; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
          th { background: #cfe3fb; text-align: left; padding: 6px; border-bottom: 1px solid #9db8d6; }
          td { padding: 5px 6px; border-bottom: 1px solid #e5e5e5; }
          .num { text-align: right; }
          .summary td { background: #efe9d3; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="meta">Ngày lập ${escapeHtml(fmtDateTime(generatedAt.toISOString()))}</div>
        <h1>Báo cáo cuối ngày về bán hàng</h1>
        <div class="sub">Ngày bán ${escapeHtml(timeRangeLabel(filters))}</div>
        <div class="sub">Chi nhánh: ${escapeHtml(BRANCHES.join(', '))}</div>
        ${filters.staffNames.length > 0 ? `<div class="sub">Người nhận đơn: ${escapeHtml(filters.staffNames.join(', '))}</div>` : ''}
        <table>
          <thead>
            <tr>${HEADERS.map(([label, align]) => `<th class="${align === 'right' ? 'num' : ''}">${label}</th>`).join('')}</tr>
          </thead>
          <tbody>
            <tr class="summary">
              <td>Hóa đơn: ${rows.length}</td><td></td><td></td><td></td><td></td>
              <td class="num">${t.quantity}</td><td class="num">${money(t.grossAmount)}</td><td class="num">${money(t.invoiceDiscount)}</td>
              <td class="num">${money(t.revenue)}</td><td class="num">${money(t.otherRevenue)}</td><td class="num">${money(t.tax)}</td>
              <td class="num">${money(t.payment)}</td>
            </tr>
            ${invoiceRows}
          </tbody>
        </table>
      </body>
    </html>
  `
}

const exportCsv = (rows: EndOfDaySalesRow[], filters: EndOfDayFilterState) => {
  const header = HEADERS.map(([label]) => label)
  const body = rows.map(r => [
    r.code, r.tableName ?? '', r.staffName ?? '', fmtTime(r.time), abbr(r.paymentMethod),
    r.quantity, r.grossAmount, r.invoiceDiscount, r.revenue, r.otherRevenue, r.tax, r.payment,
  ])
  const csv = [header, ...body].map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const period = filters.useCustomRange ? `${filters.customFrom}_${filters.customTo}` : filters.date
  a.download = `bao-cao-cuoi-ngay-${period}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const td = (align: 'left' | 'right', extra = '') => `px-2 py-2 text-sm text-ink ${align === 'right' ? 'text-right' : 'text-left'} ${extra}`

const EndOfDayPreview = ({ rows, filters, generatedAt, loading, error, onRefresh }: Props) => {
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(90)
  const [fullscreen, setFullscreen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  // default collapsed — invoice detail rows only show once the user expands a row
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [page, setPage] = useState(0)
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

  const toggleExpanded = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleRefresh = () => {
    setRefreshing(true)
    onRefresh()
    setTimeout(() => setRefreshing(false), 300)
  }

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=1100,height=720')
    if (!win) return
    win.document.write(buildPrintHtml(rows, filters, generatedAt))
    win.document.close()
    win.focus()
    win.print()
  }

  const totals = sumOf(rows)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pagedRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const jumpToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (Number.isNaN(n)) return
    setPage(Math.min(totalPages - 1, Math.max(0, n - 1)))
  }

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
        <IconBtn label="Trang đầu" disabled={safePage === 0} onClick={() => setPage(0)}><FirstIcon /></IconBtn>
        <IconBtn label="Trang trước" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}><PrevIcon /></IconBtn>
        <input
          type="number" min={1} max={totalPages} value={safePage + 1}
          onChange={e => jumpToPage(e.target.value)}
          className="w-12 h-9 px-2 rounded-md border border-line-default bg-field text-md text-ink font-medium text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-md text-ink-subtle">/{totalPages}</span>
        <IconBtn label="Trang sau" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}><NextIcon /></IconBtn>
        <IconBtn label="Trang cuối" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}><LastIcon /></IconBtn>
        <Divider />
        <IconBtn label="Xem dạng tài liệu" disabled><DocIcon /></IconBtn>
        <div ref={exportRef} className="relative">
          <IconBtn label="Xuất file" onClick={() => setExportOpen(o => !o)}><ExportIcon /></IconBtn>
          {exportOpen && (
            <div className="absolute left-0 top-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1 min-w-[10rem]">
              <button type="button" onClick={() => { exportCsv(rows, filters); setExportOpen(false) }} className="block w-full text-left px-3 py-2 text-md text-ink hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">Xuất file (CSV)</button>
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

      {/* ── Report page — its own horizontal scroller so a wide table never bleeds
           past the pane instead of overflowing it ─────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }} className="transition-transform w-fit mx-auto">
          <div className="bg-card shadow-lg p-8 w-fit">
            <div className="text-sm text-ink-subtle">Ngày lập {fmtDateTime(generatedAt.toISOString())}</div>
            <h2 className="text-h3 font-bold text-ink text-center mt-1">Báo cáo cuối ngày về bán hàng</h2>
            <div className="text-md text-ink text-center mt-1">Ngày bán {timeRangeLabel(filters)}</div>
            <div className="text-md text-ink text-center">Chi nhánh: {BRANCHES.join(', ')}</div>
            {filters.staffNames.length > 0 && (
              <div className="text-md text-ink-subtle text-center">Người nhận đơn: {filters.staffNames.join(', ')}</div>
            )}

            <table className="border-collapse mt-5 table-fixed" style={{ width: TABLE_WIDTH }}>
              <colgroup>
                {HEADERS.map(([label, , width]) => <col key={label} style={{ width }} />)}
              </colgroup>
              <thead>
                <tr className="bg-primary-50">
                  {HEADERS.map(([label, align]) => (
                    <th key={label} className={`font-semibold text-ink-strong px-2 py-2 border-b border-primary-150 text-sm ${align === 'right' ? 'text-right' : 'text-left'}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr><td colSpan={COL_COUNT} className="text-center text-ink-muted py-10">Đang tải dữ liệu...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={COL_COUNT} className="text-center text-ink-muted py-10">Không có dữ liệu phù hợp</td></tr>
                ) : (
                  <>
                    <tr className="bg-[#efe9d3]">
                      <td className={td('left', 'font-semibold')}>Hóa đơn: {rows.length}</td>
                      <td /><td /><td /><td />
                      <td className={td('right', 'font-semibold')}>{totals.quantity}</td>
                      <td className={td('right', 'font-semibold')}>{money(totals.grossAmount)}</td>
                      <td className={td('right', 'font-semibold')}>{money(totals.invoiceDiscount)}</td>
                      <td className={td('right', 'font-semibold')}>{money(totals.revenue)}</td>
                      <td className={td('right', 'font-semibold')}>{money(totals.otherRevenue)}</td>
                      <td className={td('right', 'font-semibold')}>{money(totals.tax)}</td>
                      <td className={td('right', 'font-semibold')}>{money(totals.payment)}</td>
                    </tr>
                    {pagedRows.map(r => {
                      const collapsed = !expandedIds.has(r.id)
                      return (
                        <Fragment key={r.id}>
                          {/* per-invoice collapsible header — date/time acts as the group toggle */}
                          <tr className="border-b border-line hover:bg-fill/40">
                            <td className={td('left')}>
                              <button type="button" onClick={() => toggleExpanded(r.id)}
                                className="inline-flex items-center gap-1.5 text-primary hover:underline cursor-pointer">
                                <span className="w-4 h-4 inline-flex items-center justify-center rounded border border-primary/40">
                                  {collapsed ? <PlusIcon /> : <MinusIcon />}
                                </span>
                                {fmtDateTime(r.time)}
                              </button>
                            </td>
                            <td /><td /><td /><td />
                            <td className={td('right')}>{r.quantity}</td>
                            <td className={td('right')}>{money(r.grossAmount)}</td>
                            <td className={td('right')}>{money(r.invoiceDiscount)}</td>
                            <td className={td('right')}>{money(r.revenue)}</td>
                            <td className={td('right')}>{money(r.otherRevenue)}</td>
                            <td className={td('right')}>{money(r.tax)}</td>
                            <td className={td('right')}>{money(r.payment)}</td>
                          </tr>
                          {/* exploded invoice line — every filterable field as its own column */}
                          {!collapsed && (
                            <tr className="border-b border-line">
                              <td className={td('left')}>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/manager/invoices?invoiceId=${r.id}`)}
                                  title="Xem hóa đơn trong Giao dịch"
                                  className="text-primary font-mono hover:underline cursor-pointer"
                                >
                                  {r.code}
                                </button>
                              </td>
                              <td className={td('left')}>{r.tableName ?? '—'}</td>
                              <td className={td('left')}>{r.staffName ?? '—'}</td>
                              <td className={td('left')}>{fmtTime(r.time)}</td>
                              <td className={td('left')}>{abbr(r.paymentMethod)}</td>
                              <td className={td('right')}>{r.quantity}</td>
                              <td className={td('right')}>{money(r.grossAmount)}</td>
                              <td className={td('right')}>{money(r.invoiceDiscount)}</td>
                              <td className={td('right')}>{money(r.revenue)}</td>
                              <td className={td('right')}>{money(r.otherRevenue)}</td>
                              <td className={td('right')}>{money(r.tax)}</td>
                              <td className={td('right')}>{money(r.payment)}</td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EndOfDayPreview
