import type { InvoiceListItem } from '../../services/invoiceService'
import { formatDateTime, paymentMethodLabel } from '../../services/invoiceService'

interface Props {
  invoices: InvoiceListItem[]
}

const exportCsv = (invoices: InvoiceListItem[]) => {
  const header = ['Mã hóa đơn', 'Thời gian', 'Phòng/bàn', 'Phương thức', 'Trạng thái', 'Tổng tiền hàng', 'Giảm giá', 'Khách đã trả']
  const rows = invoices.map(inv => [
    inv.id,
    formatDateTime(inv.createdAt),
    inv.tableName ?? '',
    paymentMethodLabel(inv.paymentMethod),
    inv.paid ? 'Đã thanh toán' : 'Chưa thanh toán',
    inv.totalAmount,
    inv.discountAmount ?? 0,
    inv.paid ? inv.totalAmount : 0,
  ])
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

const InvoiceToolbar = ({ invoices }: Props) => (
  <div className="flex items-center justify-between">
    <h1 className="text-h3 font-bold text-ink">Hóa đơn</h1>
    <button className="kv-btn kv-btn-outline-neutral h-9 bg-card" disabled={invoices.length === 0} onClick={() => exportCsv(invoices)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Xuất file
    </button>
  </div>
)

export default InvoiceToolbar
