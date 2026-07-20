import type { InvoiceDetail } from "../../../services/invoiceApi";
import { formatInvoiceCode, formatOrderCode } from "../../../utils/displayCodes";

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export interface ReceiptCustomer {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export const printCashierInvoice = (
  invoice: InvoiceDetail,
  tableName: string,
  cashierName: string,
  shiftLabel: string,
  customer: ReceiptCustomer,
) => {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return false;

  const rows = invoice.items
    .map(
      (item) => `
    <div class="item-row">
      <span class="item-name">${escapeHtml(item.menuItemName)}</span>
      <span class="item-calculation">${item.quantity} x ${item.unitPrice.toLocaleString("vi-VN")} đ</span>
      <strong>${item.lineTotal.toLocaleString("vi-VN")} đ</strong>
    </div>
  `,
    )
    .join("");
  const printedAt = formatDateTime(new Date().toISOString());

  printWindow.document.write(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Hóa đơn ${escapeHtml(formatInvoiceCode(invoice.id))}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8f5ed; color: #202325; font-family: "Courier New", monospace; }
          .receipt { width: 380px; max-width: 100%; margin: 24px auto; padding: 24px 22px; background: #fffdf7; }
          .header { text-align: center; }
          h1 { margin: 0; font-family: Georgia, serif; font-size: 27px; letter-spacing: 1px; }
          .printed-at { margin: 7px 0 0; color: #636566; font-size: 12px; }
          .separator { margin: 20px 0; border-top: 1px dashed #8d8d88; }
          .order-box { padding: 12px; border: 1px dashed #8d8d88; text-align: center; }
          .order-box span { display: block; margin-bottom: 5px; color: #636566; font-size: 12px; text-transform: uppercase; }
          .order-box strong { font-size: 17px; overflow-wrap: anywhere; }
          .info-row, .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; font-size: 12px; }
          .info-row span:first-child, .total-row span:first-child { color: #636566; }
          .info-row strong { text-align: right; font-weight: 600; }
          .items-heading { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; padding-bottom: 7px; color: #636566; font-size: 11px; text-transform: uppercase; }
          .item-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: start; padding: 9px 0; font-size: 12px; }
          .item-name { overflow-wrap: anywhere; }
          .item-calculation { white-space: nowrap; color: #636566; }
          .empty { padding: 12px 0; text-align: center; color: #636566; font-size: 12px; }
          .total-row { font-size: 13px; }
          .grand-total { margin-top: 7px; padding-top: 10px; border-top: 1px solid #202325; font-size: 16px; font-weight: 700; }
          .grand-total span { color: #202325 !important; }
          .footer { text-align: center; font-size: 12px; line-height: 1.7; }
          .brand { margin-top: 8px; font-family: Georgia, serif; font-size: 17px; font-weight: 700; }
          @media print { body { background: #fff; } .receipt { width: 100%; margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <main class="receipt">
          <header class="header"><h1>Wasabi Sushi</h1><p class="printed-at">${escapeHtml(printedAt)}</p></header>
          <div class="separator"></div>
          <section class="order-box"><span>Mã đơn hàng</span><strong>${escapeHtml(formatOrderCode(invoice.orderId))}</strong></section>
          <div class="separator"></div>
          <section>
            <div class="info-row"><span>Thu ngân</span><strong>${escapeHtml(cashierName)}</strong></div>
            <div class="info-row"><span>Ca làm</span><strong>${escapeHtml(shiftLabel)}</strong></div>
            <div class="info-row"><span>Khách hàng</span><strong>${escapeHtml(customer.name?.trim() || "Khách lẻ")}</strong></div>
            ${customer.phone?.trim() ? `<div class="info-row"><span>Điện thoại</span><strong>${escapeHtml(customer.phone.trim())}</strong></div>` : ""}
            ${customer.email?.trim() ? `<div class="info-row"><span>Email</span><strong>${escapeHtml(customer.email.trim())}</strong></div>` : ""}
            <div class="info-row"><span>Hình thức</span><strong>Tại bàn</strong></div>
            <div class="info-row"><span>Số bàn</span><strong>${escapeHtml(tableName)}</strong></div>
          </section>
          <div class="separator"></div>
          <section>
            <div class="items-heading"><span>Món</span><span>SL x Giá</span><span>Thành tiền</span></div>
            ${rows || '<div class="empty">Không có món</div>'}
          </section>
          <div class="separator"></div>
          <section>
            <div class="total-row"><span>Tạm tính</span><strong>${invoice.subtotal.toLocaleString("vi-VN")} đ</strong></div>
            <div class="total-row"><span>Giảm giá</span><strong>${invoice.discountAmount.toLocaleString("vi-VN")} đ</strong></div>
            <div class="total-row grand-total"><span>Tổng thanh toán</span><strong>${invoice.totalAmount.toLocaleString("vi-VN")} đ</strong></div>
          </section>
          <div class="separator"></div>
          <footer class="footer"><div>Cảm ơn quý khách. Hẹn gặp lại!</div><div class="brand">Wasabi Sushi</div></footer>
        </main>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
};
