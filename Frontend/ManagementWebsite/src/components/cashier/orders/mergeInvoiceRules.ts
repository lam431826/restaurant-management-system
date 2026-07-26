import type { InvoiceSummary } from '../../../services/invoiceApi'

export const getMergeDisabledReason = (invoice: InvoiceSummary): string => {
  if (invoice.status === 'SPLIT') return 'Hóa đơn lịch sử đã được chia.'
  if (invoice.status === 'MERGED') return 'Hóa đơn lịch sử đã được gộp.'
  if (invoice.status !== 'ACTIVE') return 'Trạng thái hóa đơn không hỗ trợ gộp.'
  if (invoice.paid) return 'Hóa đơn đã thanh toán.'
  if (invoice.promotionId) return 'Hóa đơn đã áp dụng khuyến mãi.'
  if (invoice.discountAmount !== 0) return 'Hóa đơn đã có giảm giá.'
  if (!Number.isFinite(invoice.subtotal) || !Number.isFinite(invoice.totalAmount)) {
    return 'Thông tin tổng tiền chưa đầy đủ.'
  }
  if (invoice.subtotal <= 0 || invoice.totalAmount <= 0) {
    return 'Tổng tiền hóa đơn phải lớn hơn 0.'
  }
  if (Math.abs(invoice.subtotal - invoice.totalAmount) >= 0.01) {
    return 'Tạm tính và tổng tiền không khớp.'
  }
  return ''
}

export const isInvoiceMergeEligible = (invoice: InvoiceSummary) =>
  getMergeDisabledReason(invoice) === ''
