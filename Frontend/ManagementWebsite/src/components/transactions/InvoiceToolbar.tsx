import { useEffect, useRef, useState } from 'react'
import type { Invoice } from '../../data/mockData'
import { invoiceTotals, invoiceStatusLabels } from '../../data/mockData'

interface Props {
  invoices: Invoice[]
}

const exportCsv = (invoices: Invoice[]) => {
  const header = ['Mã hóa đơn', 'Thời gian', 'Khách hàng', 'Trạng thái', 'Tổng tiền hàng', 'Giảm giá', 'Khách đã trả']
  const rows = invoices.map(inv => {
    const { totalAmount } = invoiceTotals(inv)
    return [inv.code, inv.time, inv.customer, invoiceStatusLabels[inv.status], totalAmount, inv.discount, inv.paid]
  })
  const csv = [header, ...rows]
    .map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hoa-don-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const InvoiceToolbar = ({ invoices }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-h3 font-bold text-ink">Hóa đơn</h1>

      <div className="flex items-center gap-2 shrink-0">
        <button className="kv-btn kv-btn-outline-neutral h-9 bg-card" onClick={() => window.alert('Mở màn hình nhận gọi món')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nhận gọi món
        </button>

        <div ref={ref} className="relative">
          <button className="kv-btn kv-btn-primary h-9" onClick={() => setMenuOpen(o => !o)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất file
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className={`ml-0.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] bg-card border border-line-default rounded-md shadow-md min-w-[20rem] py-2 z-[var(--kv-z-dropdown)]">
              <button className="block w-full text-left px-5 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)] hover:text-primary" onClick={() => { exportCsv(invoices); setMenuOpen(false) }}>
                Xuất file hiển thị
              </button>
              <button className="block w-full text-left px-5 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)] hover:text-primary" onClick={() => { exportCsv(invoices); setMenuOpen(false) }}>
                Xuất toàn bộ hóa đơn
              </button>
            </div>
          )}
        </div>

        <button className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer shrink-0 transition-colors hover:border-primary hover:text-primary" aria-label="Tùy chọn cột" title="Tùy chọn hiển thị cột">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default InvoiceToolbar
