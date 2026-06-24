import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../api/auth";
import { listTables } from "../../services/tableService";
import type { TableItem as TableServiceItem } from "../../services/tableService";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import {
  applyInvoiceDiscount,
  generateInvoice,
  getInvoiceById,
  getInvoices,
  sendInvoice,
} from "../../services/invoiceApi";
import type { InvoiceDetail, InvoiceSummary } from "../../services/invoiceApi";
import { getPayments, processPayment } from "../../services/paymentApi";
import type { Payment, PaymentMethod } from "../../services/paymentApi";
import { getStoredUser } from "../../services/tokenStorage";
import { listCategories, searchItems } from "../../services/menuService";
import type { MenuCategory } from "../../services/menuService";
import { assetUrl } from "../../services/api";
import {
  addOrderItems,
  cancelOrder,
  createOrder,
  listOrders,
  listPendingAssistance,
  removeOrderItem,
  respondAssistance,
  updateOrderItemStatus,
} from "../../services/orderApi";
import type {
  AssistanceRequest,
  CookingStatus,
  Order,
  OrderStatus,
} from "../../services/orderApi";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  qty: number;
}
interface Category {
  id: string;
  label: string;
  count: number;
}
interface TableItem {
  id: string;
  name: string;
  area: string;
  capacity: number;
  status: string;
  occupied: boolean;
  selected: boolean;
  amount: number;
  guests: number;
  items: number;
  orderId: string | null;
}
interface OrderItem {
  id: string;
  name: string;
  qty: number;
  notes: string;
  status: string;
  price: number;
  orderId: string;
}

const OCCUPIED_STATUSES = ["OCCUPIED", "BILLING"];

const toTableItem = (dto: TableServiceItem): TableItem => ({
  id: dto.id,
  name: dto.name,
  area: dto.area,
  capacity: dto.seats,
  status: dto.status,
  occupied: OCCUPIED_STATUSES.includes(dto.status),
  selected: false,
  amount: 0,
  guests: 0,
  items: 0,
  orderId: dto.activeOrderId,
});

const VAT_RATE = 0.08;

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  QR: "Mã QR",
  E_WALLET: "Ví điện tử",
};

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "SERVED",
];

const COOKING_STATUS_LABEL: Record<CookingStatus, string> = {
  PENDING: "Chờ duyệt",
  COOKING: "Đang nấu",
  READY: "Đã nấu xong",
  SERVED: "Đã phục vụ",
};

const COOKING_STATUS_FROM_LABEL: Record<string, CookingStatus> = {
  "Chờ duyệt": "PENDING",
  "Đang nấu": "COOKING",
  "Đã nấu xong": "READY",
  "Đã phục vụ": "SERVED",
};

const formatDateTime = (value: string) =>
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

const printCashierInvoice = (
  invoice: InvoiceDetail,
  tableName: string,
  cashierName: string,
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
        <title>Hóa đơn ${escapeHtml(invoice.id)}</title>
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
          <section class="order-box"><span>Order Id</span><strong>${escapeHtml(invoice.orderId)}</strong></section>
          <div class="separator"></div>
          <section>
            <div class="info-row"><span>Cashier</span><strong>${escapeHtml(cashierName)}</strong></div>
            <div class="info-row"><span>Working Time</span><strong>08:00 - 17:00</strong></div>
            <div class="info-row"><span>Customer Name</span><strong>Nguyen Van A</strong></div>
            <div class="info-row"><span>Member Id Card</span><strong>-</strong></div>
            <div class="info-row"><span>Order Type</span><strong>Dine In</strong></div>
            <div class="info-row"><span>Table Number</span><strong>${escapeHtml(tableName)}</strong></div>
          </section>
          <div class="separator"></div>
          <section>
            <div class="items-heading"><span>Item</span><span>Qty x Price</span><span>Total</span></div>
            ${rows || '<div class="empty">Không có món</div>'}
          </section>
          <div class="separator"></div>
          <section>
            <div class="total-row"><span>Subtotal</span><strong>${invoice.subtotal.toLocaleString("vi-VN")} đ</strong></div>
            <div class="total-row"><span>Discount</span><strong>${invoice.discountAmount.toLocaleString("vi-VN")} đ</strong></div>
            <div class="total-row grand-total"><span>Total Amount</span><strong>${invoice.totalAmount.toLocaleString("vi-VN")} đ</strong></div>
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

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <circle cx={11} cy={11} r={8} />
    <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
  </svg>
);
const BellIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
    />
  </svg>
);
const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? 2 : 1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);
const OrdersIcon = ({ active }: { active?: boolean }) => (
  <svg
    className="w-6 h-6"
    fill={active ? "#025cca" : "none"}
    stroke={active ? "#025cca" : "currentColor"}
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
    />
  </svg>
);
const GridIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
    />
  </svg>
);
const MoreIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
    />
  </svg>
);
const PlusIcon = ({ white }: { white?: boolean }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke={white ? "white" : "currentColor"}
    strokeWidth={2.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);
const MinusIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
  </svg>
);
const RefreshIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);
const ReceiptIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2.25 2.25L15 9M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z"
    />
  </svg>
);
const NoteIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="#025cca"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);
const CheckIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="#286b4a"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);
const TagIcon = () => (
  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.186 3.548.428a18.849 18.849 0 005.441-5.44c.758-1.16.492-2.629-.428-3.548l-9.58-9.581a3 3 0 00-2.122-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z"
      clipRule="evenodd"
    />
  </svg>
);
const CashMethodIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
    />
  </svg>
);
const QRMethodIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
    />
  </svg>
);
const DebitMethodIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
    />
  </svg>
);
const XIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const DeleteDigitIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.374-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z"
    />
  </svg>
);

const SwitchScreenIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h18M16.5 3L21 7.5m0 0L16.5 12M21 7.5H3"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
    />
  </svg>
);

/* ─── Header / BottomNav ─────────────────────────────────────────────────── */
const Header = ({
  employeeName = "Duy Tan",
  roleLabel = "Thu ngân",
  role,
  assistanceRequests = [],
  onResolveRequest,
  onLogout,
  onChangePassword,
}: {
  employeeName?: string;
  roleLabel?: string;
  role?: string;
  assistanceRequests?: AssistanceRequest[];
  onResolveRequest?: (id: string) => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const bellCount = assistanceRequests.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setIsBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = employeeName
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <header className="bg-white flex items-center justify-between px-6 h-[64px] shrink-0 border-b border-[#e8e8e8] z-[50]">
      <div className="flex items-center gap-3 shrink-0">
        <img
          src="/images/wasabi-logo.svg"
          alt="Wasabi"
          className="h-12 w-auto"
        />
      </div>

      <div className="flex items-center gap-3 bg-[#f5f5f5] rounded-[12px] px-4 h-[44px] w-[180px] md:w-[260px] lg:w-[340px]">
        <SearchIcon className="w-5 h-5 text-[#797b7c] shrink-0" />
        <input
          placeholder="Tìm Kiếm"
          className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
        />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="relative" ref={bellRef}>
          <button
            className="text-[#202325] relative p-2"
            onClick={() => setIsBellOpen((v) => !v)}
          >
            <BellIcon />
            {bellCount > 0 && (
              <span className="absolute top-0 right-0 bg-[#025cca] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {bellCount}
              </span>
            )}
          </button>

          {isBellOpen && (
            <div className="absolute top-[120%] right-0 w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-[9999]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h6 className="text-lg font-bold text-gray-800 m-0">Yêu cầu gọi phục vụ</h6>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{bellCount} tin mới</span>
              </div>

              <div className="flex flex-col overflow-y-auto max-h-[400px] p-2 bg-white rounded-b-xl">
                {bellCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <span className="text-gray-400 mt-2 font-medium">Không có yêu cầu nào.</span>
                  </div>
                ) : (
                  assistanceRequests.map((req) => {
                    const tableNum = req.tableName || (req.tableId ? `Bàn ${req.tableId.substring(0, 4)}` : "Bàn ?");
                    return (
                      <div key={req.id} className="flex flex-col gap-2 p-3 mb-2 rounded-lg border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">{tableNum}</span>
                          <span className="text-xs text-gray-500 font-medium">
                            {req.createdAt ? new Date(req.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium ml-1">{req.message}</p>
                        <button
                          onClick={() => onResolveRequest?.(req.id)}
                          className="mt-1 bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-1.5 px-4 rounded-lg hover:bg-gray-50 transition-colors self-end shadow-sm"
                        >
                          Đã Xử Lý ✓
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-full bg-[#5B8FE8] flex items-center justify-center text-white text-[13px] font-semibold">
              {initials}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[14px] font-medium text-[#202325]">
                {employeeName}
              </span>
              <span className="text-[12px] text-[#636566]">{roleLabel}</span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-[#e8e8e8] rounded-[12px] shadow-lg w-[200px] py-1 z-50">
              <div className="px-4 py-2 border-b border-[#e8e8e8]">
                <p className="text-[14px] font-semibold text-[#202325] truncate">
                  {employeeName}
                </p>
                <p className="text-[12px] text-[#636566]">{roleLabel}</p>
              </div>
              {role === "MANAGER" && (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/manager/dashboard");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <SwitchScreenIcon />
                    Màn Quản lý
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/waiter");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <SwitchScreenIcon />
                    Màn Phục vụ
                  </button>
                  <div className="h-px bg-[#e8e8e8] mx-2" />
                </>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  onChangePassword?.();
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                Đổi mật khẩu
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogoutIcon />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const BottomNav = ({ active = "orders" }: { active?: string }) => {
  const items: { id: string; label: string | null; icon: ReactNode }[] = [
    {
      id: "home",
      label: "Home",
      icon: <HomeIcon active={active === "home"} />,
    },
    {
      id: "orders",
      label: "Orders",
      icon: <OrdersIcon active={active === "orders"} />,
    },
    { id: "fab", label: null, icon: null },
    { id: "transition", label: "Transition", icon: <GridIcon /> },
    { id: "more", label: "More", icon: <MoreIcon /> },
  ];
  return (
    <nav className="bg-white border-t border-[#e8e8e8] flex items-center justify-around h-[72px] shrink-0 relative px-4">
      {items.map((item) =>
        item.id === "fab" ? (
          <button
            key="fab"
            className="w-14 h-14 bg-[#025cca] rounded-full flex items-center justify-center shadow-lg -mt-7 hover:bg-[#0250b0] transition-colors"
          >
            <PlusIcon white />
          </button>
        ) : (
          <button
            key={item.id}
            className={`flex flex-col items-center gap-1 ${active === item.id ? "text-[#025cca]" : "text-[#636566]"}`}
          >
            {item.icon}
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        ),
      )}
    </nav>
  );
};

/* ─── Menu view ──────────────────────────────────────────────────────────── */
const MenuItemCard = ({
  item,
  onQtyChange,
}: {
  item: MenuItem;
  onQtyChange: (id: string, d: number) => void;
}) => (
  <div
    className={`bg-white flex flex-col gap-4 p-4 rounded-[16px] w-[220px] shrink-0 overflow-hidden relative ${item.available ? "" : "opacity-60"}`}
  >
    {!item.available && (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <span className="bg-[#797b7c] flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-[16px] text-[12px] font-semibold text-white">
          <TagIcon /> Hết hàng
        </span>
      </div>
    )}
    <div className="h-[150px] rounded-[16px] overflow-hidden shrink-0 bg-[#f5f5f5]">
      <img
        src={item.imageUrl ? assetUrl(item.imageUrl) : "/images/food-item.jpg"}
        alt={item.name}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="flex flex-col gap-2">
      <p className="text-[16px] font-medium text-[#202325]">{item.name}</p>
      <p className="text-[12px] text-[#636566] leading-[1.5] line-clamp-2">
        {item.description}
      </p>
    </div>
    <div className="flex items-end justify-between">
      <p className="text-[20px] font-semibold text-[#202325]">
        {item.price.toLocaleString("vi-VN")} đ
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onQtyChange(item.id, -1)}
          disabled={!item.available}
          className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center hover:bg-[#e8e8e8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MinusIcon />
        </button>
        <span className="text-[20px] font-semibold text-[#202325] w-5 text-center">
          {item.qty}
        </span>
        <button
          onClick={() => onQtyChange(item.id, 1)}
          disabled={!item.available}
          className="w-8 h-8 rounded-full bg-[#025cca] flex items-center justify-center hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon white />
        </button>
      </div>
    </div>
  </div>
);

const MenuView = ({
  items,
  categories,
  activeCategory,
  onCategoryChange,
  onRefresh,
  onQtyChange,
}: {
  items: MenuItem[];
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  onRefresh?: () => void;
  onQtyChange: (id: string, d: number) => void;
}) => {
  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex items-center gap-1.5 h-[38px] px-2 rounded-[8px] border shrink-0 transition-colors ${activeCategory === cat.id ? "bg-white border-[#e8e8e8] text-[#37383a]" : "bg-[#f5f5f5] border-[#e8e8e8] text-[#797b7c]"}`}
          >
            <span className="text-[14px]">{cat.label}</span>
            <span
              className={`flex items-center justify-center h-6 w-7 rounded-[12px] text-[14px] ${activeCategory === cat.id ? "bg-[#68b5fb] text-white" : "bg-[#e8e8e8] text-[#797b7c]"}`}
            >
              {cat.count}
            </span>
          </button>
        ))}
        <button
          onClick={onRefresh}
          className="ml-auto shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#636566] hover:bg-[#f5f5f5]"
        >
          <RefreshIcon />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2.5 p-2.5">
          {items.map((item) => (
            <MenuItemCard key={item.id} item={item} onQtyChange={onQtyChange} />
          ))}
          {items.length === 0 && (
            <p className="text-[14px] text-[#797b7c] px-2.5 py-6">
              Không có món nào
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Table view ─────────────────────────────────────────────────────────── */
const Chairs = ({ color }: { color: string }) => (
  <div className="flex gap-[15px] shrink-0">
    <div
      className="h-[17px] w-[63px] rounded-[12px]"
      style={{ backgroundColor: color }}
    />
    <div
      className="h-[17px] w-[63px] rounded-[12px]"
      style={{ backgroundColor: color }}
    />
  </div>
);

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "#e8e8e8",
  OCCUPIED: "#ffedd5",
  BILLING: "#fde68a",
  RESERVED: "#dbeafe",
  CLEANING: "#f3f4f6",
};
const STATUS_LABEL_VI: Record<string, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Đang dùng",
  BILLING: "Chờ thanh toán",
  RESERVED: "Đã đặt",
  CLEANING: "Đang dọn",
};

const TableCard = ({
  table,
  onSelect,
}: {
  table: TableItem;
  onSelect: (id: string) => void;
}) => {
  const seatColor = STATUS_COLOR[table.status] ?? "#e8e8e8";
  const selectedBg = table.occupied ? "bg-[#dceefe]" : "bg-[#d9e7f7]";
  return (
    <button
      onClick={() => onSelect(table.id)}
      className={`flex flex-col gap-3 items-center p-[10px] rounded-[30px] w-[184px] shrink-0 border-2 transition-colors ${table.selected ? `${selectedBg} border-[#025cca]` : "bg-white border-transparent hover:border-[#e8e8e8]"}`}
    >
      <Chairs color={seatColor} />
      <div
        className="relative h-[80px] w-[164px] rounded-[12px] shrink-0"
        style={{ backgroundColor: seatColor }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1">
          {table.occupied ? (
            <>
              <p className="text-[16px] font-semibold text-black leading-tight">
                {table.amount > 0
                  ? table.amount.toLocaleString("vi-VN") + "đ"
                  : STATUS_LABEL_VI[table.status]}
              </p>
              {table.items > 0 && (
                <div className="flex gap-2.5 text-[10px] text-black">
                  <span>{table.guests} người</span>
                  <span>{table.items} món</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-[12px] text-[#636566] font-medium">
              {STATUS_LABEL_VI[table.status] ?? table.status}
            </p>
          )}
        </div>
      </div>
      <Chairs color={seatColor} />
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[16px] font-semibold text-center leading-[1.5] text-black">
          {table.name}
        </p>
        <p className="text-[11px] text-[#797b7c]">{table.capacity} chỗ</p>
      </div>
    </button>
  );
};

const TableView = ({
  tables,
  onSelect,
  filter,
}: {
  tables: TableItem[];
  onSelect: (id: string) => void;
  filter: string;
}) => {
  const filtered =
    filter === "used"
      ? tables.filter((t) => t.occupied)
      : filter === "empty"
        ? tables.filter((t) => !t.occupied)
        : tables;
  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.length === 0 ? (
        <p className="text-[14px] text-[#797b7c] py-8 text-center">
          Không có bàn
        </p>
      ) : (
        <div className="flex flex-wrap gap-3 pr-2">
          {filtered.map((table) => (
            <TableCard key={table.id} table={table} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Order rows / modals ────────────────────────────────────────────────── */
const STATUS_OPTIONS = ["Đang nấu", "Đã nấu xong", "Đã phục vụ"];

const OrderItemRow = ({
  item,
  onStatusChange,
  onNote,
  onRemoveItem,
}: {
  item: OrderItem;
  onStatusChange: (orderId: string, orderItemId: string, status: string) => void;
  onNote: (id: string, text: string) => void;
  onRemoveItem: (orderId: string, orderItemId: string) => void;
}) => (
  <div className="flex flex-col gap-3 py-2 border-b border-[#e8e8e8]">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-medium text-[#202325]">
            {item.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-medium text-[#202325] shrink-0">
              x{item.qty}
            </span>
            <button
              onClick={() => onRemoveItem(item.orderId, item.id)}
              className="text-[#dc2f02] hover:text-[#9d0208] transition-colors p-1"
              title="Xóa món"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        {item.notes && (
          <p className="text-[12px] text-[#636566] mt-1">{item.notes}</p>
        )}
      </div>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNote(item.id, item.notes || "")}
          className="bg-[#f0f8ff] flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full hover:bg-[#dceefe] transition-colors"
        >
          <NoteIcon />
          <span className="text-[12px] font-medium text-[#025cca]">
            Ghi chú
          </span>
        </button>
        <div className="relative">
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item.orderId, item.id, e.target.value)}
            className={`appearance-none border rounded-[12px] text-[10px] font-medium pl-3 pr-6 py-1 outline-none cursor-pointer ${
              item.status === "Chờ duyệt"
                ? "bg-[#ffedd5] text-[#f97316] border-[#f97316]"
                : "bg-white text-[#202325] border-[#e8e8e8]"
            }`}
          >
            <option value="Chờ duyệt" hidden={item.status !== "Chờ duyệt"}>
              Chờ duyệt
            </option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#636566] pointer-events-none" />
        </div>
      </div>
      <span className="text-[16px] font-semibold text-[#202325]">
        {item.price.toLocaleString("vi-VN")}đ
      </span>
    </div>
  </div>
);

const AddNoteModal = ({
  itemId,
  initialText,
  onConfirm,
  onCancel,
}: {
  itemId: string;
  initialText: string;
  onConfirm: (id: string, text: string) => void;
  onCancel: () => void;
}) => {
  const [text, setText] = useState(initialText);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      <div className="relative bg-white rounded-[12px] p-6 w-[431px] flex flex-col gap-5 items-center shadow-xl">
        <div className="flex items-center w-full">
          <p className="text-[24px] font-semibold text-[#202325] leading-[1.5]">
            Thêm ghi chú
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="Nhập ghi chú..."
          rows={3}
          className="w-full bg-white border border-[#024eab] rounded-[12px] px-4 py-3 text-[14px] text-[#202325] placeholder-[#797b7c] outline-none resize-none leading-[1.5]"
          style={{ minHeight: 99 }}
        />
        <div className="flex gap-2 w-full">
          <button
            onClick={onCancel}
            className="flex-1 h-[52px] bg-[#f5f5f5] rounded-[12px] text-[16px] font-medium text-[#202325] hover:bg-[#e8e8e8] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(itemId, text)}
            className="flex-1 h-[52px] bg-[#025cca] rounded-[12px] text-[16px] font-semibold text-white hover:bg-[#0250b0] transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Payment modal ──────────────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  { id: "CASH" as const, label: "Tiền mặt" },
  { id: "CARD" as const, label: "Thẻ" },
  { id: "QR" as const, label: "Mã QR" },
  { id: "E_WALLET" as const, label: "Ví điện tử" },
];

const PaymentModal = ({
  invoice,
  table,
  processing,
  error,
  onClose,
  onConfirm,
}: {
  invoice: InvoiceDetail;
  table: TableItem | null;
  processing: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}) => {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cashInput, setCashInput] = useState("");

  const subtotal = invoice.subtotal;
  const total = invoice.totalAmount;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const methodIcons: Record<PaymentMethod, ReactNode> = {
    CASH: <CashMethodIcon />,
    CARD: <DebitMethodIcon />,
    QR: <QRMethodIcon />,
    E_WALLET: <QRMethodIcon />,
  };

  const handleDigit = (key: string) => {
    if (key === "del") setCashInput((v) => v.slice(0, -1));
    else setCashInput((v) => (v.length < 12 ? v + key : v));
  };
  const displayAmount = cashInput
    ? parseInt(cashInput, 10).toLocaleString("vi-VN") + "đ"
    : "0đ";
  const confirmLabel = processing
    ? method === "QR"
      ? "Đang xác nhận..."
      : "Đang thanh toán..."
    : method === "QR"
      ? "Xác nhận đã thanh toán"
      : "Xác nhận thanh toán";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        style={{ opacity: 0.6 }}
        onClick={onClose}
      />
      <div className="relative bg-white rounded-[16px] p-6 flex flex-col gap-2.5 overflow-hidden w-[95vw] max-w-[711px] max-h-[95vh]">
        <div
          className="flex items-center justify-between shrink-0"
          style={{ height: 44 }}
        >
          <p className="text-[24px] font-semibold text-[#202325]">Payment</p>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center text-[#202325] hover:bg-[#e8e8e8] transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex gap-6 lg:gap-10 items-start flex-1 min-h-0 overflow-hidden">
          {/* Receipt */}
          <div
            className="hidden lg:flex w-[300px] h-full bg-[#fcf7ef] overflow-y-auto flex-col gap-3 px-4 py-8 shrink-0"
            style={{ fontFamily: "monospace" }}
          >
            <div className="flex flex-col items-center gap-3">
              <p className="text-[#3f4e4f] text-[24px] font-medium">
                Wasabi Sushi
              </p>
              <p className="text-black text-[10px] text-center tracking-tight">
                {dateStr} • {timeStr}
              </p>
            </div>
            <div className="border border-dashed border-[#b0a080] rounded px-3 py-2 text-center">
              <p className="text-[10px] tracking-widest text-black">Order Id</p>
              <p className="text-[14px] font-bold tracking-wider text-black break-all">
                {invoice.orderId}
              </p>
            </div>
            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Cashier</span>
                <span className="text-black">Duy Tan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Working Time</span>
                <span className="text-black">09.00 - 12.00 AM</span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Customer Name</span>
                <span className="text-black">Nguyen Van A</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Member Id Card</span>
                <span className="text-black">-</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Order Type</span>
                <span className="text-black">Dine In</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Table Number</span>
                <span className="text-black">
                  {table?.name?.replace("Bàn ", "") ?? "9"}
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-3 text-[10px]">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex gap-2 justify-between">
                  <span className="text-[#6d7278] flex-1 truncate">
                    {item.menuItemName}
                  </span>
                  <span className="text-[#6d7278] shrink-0">
                    {item.quantity} x {item.unitPrice.toLocaleString("vi-VN")}đ
                  </span>
                  <span className="text-black shrink-0 font-bold">
                    {item.lineTotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Subtotal</span>
                <span className="text-black">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Discount</span>
                <span className="text-black">
                  {invoice.discountAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex justify-between text-[14px] font-bold text-[#a27b5c]">
              <span>Total Amount</span>
              <span>{total.toLocaleString("vi-VN")}đ</span>
            </div>
            <p className="text-[8px] text-black leading-relaxed">
              Thanks for fueling our passion. Drop by again, if your wallet
              isn't still sulking. You're always welcome here!
            </p>
            <p className="text-[#3f4e4f] text-[24px] font-medium text-center">
              Wasabi Sushi
            </p>
          </div>

          {/* Payment panel */}
          <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
            <div className="relative flex flex-col gap-3 shrink-0">
              <p className="text-[16px] font-semibold text-[#202325]">
                Select a payment method
              </p>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className={`flex items-center justify-between px-2 py-3 rounded-[12px] border transition-colors ${dropdownOpen ? "border-[#025cca] bg-white" : "border-[#e8e8e8] bg-[#f5f5f5]"}`}
              >
                <div className="flex items-center gap-2 px-3">
                  {methodIcons[method]}
                  <span className="text-[16px] font-medium text-[#202325]">
                    {PAYMENT_METHODS.find((m) => m.id === method)?.label}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`w-6 h-6 text-[#636566] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e8e8e8] rounded-[12px] shadow-md z-10 flex flex-col gap-1 px-2 py-3">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => {
                        setMethod(pm.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-[12px] w-full text-left transition-colors ${method === pm.id ? "bg-[#f0f8ff]" : "bg-white hover:bg-[#f5f5f5]"}`}
                    >
                      {methodIcons[pm.id]}
                      <span className="text-[16px] font-medium text-[#202325]">
                        {pm.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto mt-6 pr-1">
              {method === "CASH" && (
                <div className="flex flex-col items-center gap-5 pb-2">
                  <p className="text-[40px] font-medium leading-none text-[#202325] text-center py-2">
                    {displayAmount}
                  </p>
                  <div className="grid grid-cols-3 w-full gap-y-2">
                    {[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      ".",
                      "0",
                      "del",
                    ].map((key) => (
                      <button
                        key={key}
                        onClick={() => key !== "." && handleDigit(key)}
                        disabled={key === "."}
                        className={`h-[50px] flex items-center justify-center rounded-[8px] active:scale-95 transition-all ${key === "." ? "opacity-30 cursor-default" : "hover:bg-[#f5f5f5]"}`}
                      >
                        {key === "del" ? (
                          <DeleteDigitIcon />
                        ) : (
                          <span
                            className={`text-[28px] text-[#202325] ${key === "." ? "font-normal" : "font-medium"}`}
                          >
                            {key}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {method === "QR" && (
                <div className="flex flex-col items-center gap-4 pb-2">
                  <div className="w-[220px] h-[220px] bg-white overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src="/images/qr-code.png"
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="w-full border-t border-[#e8e8e8] px-3 pt-4 flex flex-col gap-2 items-center">
                    <p className="text-[20px] font-medium text-[#202325]">
                      MB Bank
                    </p>
                    <p className="text-[14px] text-[#636566]">
                      <span className="text-[#a2a4a4]">STK</span>:{" "}
                      <span className="text-[#202325]">7777777777</span>
                    </p>
                    <p className="text-[14px] text-[#636566]">
                      <span className="text-[#a2a4a4]">Chủ tài khoản:</span>{" "}
                      <span className="text-[#202325]">Wasabi Sushi</span>
                    </p>
                    <p className="text-[14px] text-[#636566]">
                      <span className="text-[#a2a4a4]">Số tiền:</span>{" "}
                      <span className="text-[#202325] font-medium">
                        {total.toLocaleString("vi-VN")} đ
                      </span>
                    </p>
                    <p className="text-[14px] text-[#636566]">
                      <span className="text-[#a2a4a4]">Nội dung:</span>{" "}
                      <span className="text-[#202325]">#200 QR Code</span>
                    </p>
                  </div>
                </div>
              )}

              {(method === "CARD" || method === "E_WALLET") && (
                <div className="flex flex-col items-center justify-center gap-6 py-10 text-[#636566]">
                  <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                    {methodIcons[method]}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[18px] font-semibold text-[#202325]">
                      {PAYMENT_METHOD_LABELS[method]}
                    </p>
                    <p className="text-[14px] text-[#636566]">
                      Tổng thanh toán: {total.toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 mt-5 pt-4 border-t border-[#e8e8e8]">
              {error && (
                <p className="text-[13px] text-[#d92d20] text-center mb-3">
                  {error}
                </p>
              )}
              <button
                onClick={() => onConfirm(method)}
                disabled={processing}
                className="w-full h-[52px] bg-[#025cca] rounded-[12px] text-[16px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-60"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CashierInvoicePanel = ({
  orderId,
  invoiceChecked,
  invoice,
  detail,
  payments,
  promotionCode,
  loading,
  action,
  message,
  historyError,
  onOrderIdChange,
  onLookup,
  onGenerate,
  onPromotionCodeChange,
  onApplyDiscount,
  onPrint,
  onSend,
}: {
  orderId: string;
  invoiceChecked: boolean;
  invoice: InvoiceSummary | null;
  detail: InvoiceDetail | null;
  payments: Payment[];
  promotionCode: string;
  loading: boolean;
  action: string | null;
  message: { type: "success" | "error"; text: string } | null;
  historyError: string;
  onOrderIdChange: (value: string) => void;
  onLookup: () => void;
  onGenerate: () => void;
  onPromotionCodeChange: (value: string) => void;
  onApplyDiscount: () => void;
  onPrint: () => void;
  onSend: () => void;
}) => {
  const busy = loading || action !== null;

  return (
    <div className="mt-5 pt-5 border-t-2 border-[#e8e8e8] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold text-[#202325]">
            Hóa đơn / Thanh toán
          </p>
          <p className="text-[11px] text-[#797b7c] mt-1">
            Tra cứu theo backend orderId
          </p>
        </div>
        {invoice && (
          <span
            className={`px-2 py-1 rounded-[8px] text-[11px] font-medium ${invoice.paid ? "bg-[#dcf7ea] text-[#286b4a]" : "bg-[#fff3d6] text-[#8a5a00]"}`}
          >
            {invoice.paid ? "Đã thanh toán" : "Chưa thanh toán"}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={orderId}
          onChange={(event) => onOrderIdChange(event.target.value)}
          placeholder="Backend orderId"
          className="flex-1 min-w-0 h-[38px] px-3 rounded-[10px] border border-[#e8e8e8] text-[13px] text-[#202325] outline-none focus:border-[#025cca]"
        />
        <button
          onClick={onLookup}
          disabled={busy || !orderId.trim()}
          className="h-[38px] px-3 rounded-[10px] bg-[#f0f8ff] text-[13px] font-medium text-[#025cca] disabled:opacity-50"
        >
          {loading ? "Đang tải" : "Tra cứu"}
        </button>
      </div>

      {message && (
        <div
          className={`px-3 py-2 rounded-[10px] text-[12px] ${message.type === "success" ? "bg-[#dcf7ea] text-[#286b4a]" : "bg-[#fff0f0] text-[#d92d20]"}`}
        >
          {message.text}
        </div>
      )}

      {invoiceChecked && !invoice && !loading && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] bg-[#f5f5f5]">
          <span className="text-[12px] text-[#636566]">Chưa có hóa đơn</span>
          <button
            onClick={onGenerate}
            disabled={busy}
            className="text-[12px] font-semibold text-[#025cca] disabled:opacity-50"
          >
            Tạo hóa đơn
          </button>
        </div>
      )}

      {invoice && (
        <>
          <div className="rounded-[10px] bg-[#f5f5f5] p-3 flex flex-col gap-2 text-[12px]">
            <div className="flex justify-between gap-3">
              <span className="text-[#797b7c]">Mã hóa đơn</span>
              <span
                className="text-[#202325] font-medium truncate"
                title={invoice.id}
              >
                {invoice.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#797b7c]">Tạm tính</span>
              <span className="text-[#202325]">
                {invoice.subtotal.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#797b7c]">Giảm giá</span>
              <span className="text-[#202325]">
                {invoice.discountAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <div className="flex justify-between text-[14px] font-semibold">
              <span className="text-[#202325]">Cần thanh toán</span>
              <span className="text-[#025cca]">
                {invoice.totalAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
            {detail?.promotionCode && (
              <div className="flex justify-between">
                <span className="text-[#797b7c]">Khuyến mãi</span>
                <span className="text-[#202325] font-medium">
                  {detail.promotionCode}
                </span>
              </div>
            )}
          </div>

          {!invoice.paid && (
            <div className="flex gap-2">
              <input
                value={promotionCode}
                onChange={(event) =>
                  onPromotionCodeChange(event.target.value.toUpperCase())
                }
                placeholder="Mã khuyến mãi"
                className="flex-1 min-w-0 h-[36px] px-3 rounded-[10px] border border-[#e8e8e8] text-[12px] uppercase outline-none focus:border-[#025cca]"
              />
              <button
                onClick={onApplyDiscount}
                disabled={busy || !promotionCode.trim()}
                className="h-[36px] px-3 rounded-[10px] border border-[#025cca] text-[12px] font-medium text-[#025cca] disabled:opacity-50"
              >
                {action === "discount" ? "Đang áp dụng" : "Áp dụng"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPrint}
              disabled={!detail}
              className="h-[36px] rounded-[10px] bg-[#f5f5f5] text-[12px] font-medium text-[#202325] disabled:opacity-50"
            >
              In hóa đơn
            </button>
            <button
              onClick={onSend}
              disabled={busy}
              className="h-[36px] rounded-[10px] bg-[#f0f8ff] text-[12px] font-medium text-[#025cca] disabled:opacity-50"
            >
              {action === "send" ? "Đang gửi" : "Gửi hóa đơn"}
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-dashed border-[#d9dcdf]">
            <p className="text-[13px] font-semibold text-[#202325]">
              Lịch sử thanh toán
            </p>
            {historyError && (
              <p className="text-[12px] text-[#d92d20]">{historyError}</p>
            )}
            {!historyError && payments.length === 0 && (
              <p className="text-[12px] text-[#797b7c]">
                Chưa có lịch sử thanh toán
              </p>
            )}
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-[10px] border border-[#e8e8e8] px-3 py-2 text-[11px] flex flex-col gap-1"
              >
                <div className="flex justify-between">
                  <span className="text-[#636566]">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </span>
                  <span className="font-semibold text-[#202325]">
                    {payment.amount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#797b7c]">
                    {formatDateTime(payment.createdAt)}
                  </span>
                  <span className="text-[#286b4a]">{payment.status}</span>
                </div>
                {payment.gatewayRef && (
                  <span className="text-[#797b7c] break-all">
                    {payment.gatewayRef}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Order panel ────────────────────────────────────────────────────────── */
const OrderPanel = ({
  items,
  hasSelectedMenu,
  onStatusChange,
  onCheckout,
  onCreateOrder,
  onAddItems,
  onNote,
  onRemoveItem,
  onCancelOrder,
  selectedTable,
  invoiceTools,
  checkoutDisabled,
  checkoutLabel,
}: {
  items: OrderItem[];
  hasSelectedMenu: boolean;
  onStatusChange: (orderId: string, orderItemId: string, status: string) => void;
  onCheckout: () => void;
  onCreateOrder: () => void;
  onAddItems: () => void;
  onNote: (id: string, text: string) => void;
  onRemoveItem: (orderId: string, orderItemId: string) => void;
  onCancelOrder: (orderIds: string[]) => void;
  selectedTable: TableItem | null;
  invoiceTools: ReactNode;
  checkoutDisabled: boolean;
  checkoutLabel: string;
}) => {
  const isEmpty = !!selectedTable && !selectedTable.occupied;
  const subtotal = isEmpty ? 0 : items.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;

  return (
    <div className="bg-white rounded-[12px] flex flex-col p-4 lg:p-6 w-[260px] md:w-[300px] lg:w-[360px] xl:w-[400px] shrink-0 h-full overflow-hidden">
      <div className="flex items-start justify-between shrink-0 mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-medium text-[#202325]">
            {isEmpty ? "Customer Name" : "Nguyen Van A"}
          </span>
          <span className="text-[14px] text-[#636566]">
            {selectedTable ? selectedTable.name : "—"}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isEmpty ? (
            <>
              <div className="bg-[#dcf7ea] flex items-center gap-1 px-2 py-1 rounded-[8px]">
                <CheckIcon />
                <span className="text-[12px] font-medium text-[#286b4a]">
                  Ready
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#48c185]" />
                <span className="text-[12px] text-[#636566]">
                  Ready to serve
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#f5f5f5] flex items-center gap-1 px-2 py-1 rounded-[8px]">
                <ReceiptIcon />
                <span className="text-[12px] font-medium text-[#202325]">
                  Thanh toán
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#202325]" />
                <span className="text-[12px] text-[#636566]">
                  Đợi thanh toán
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-[16px] font-semibold text-[#202325] shrink-0 mb-3">
        Chi tiết đơn hàng
      </p>
      <div className="h-px bg-[#e8e8e8] shrink-0 mb-3" />

      <div className="flex-1 overflow-y-auto min-h-0">
        {!isEmpty &&
          items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              onStatusChange={onStatusChange}
              onNote={onNote}
              onRemoveItem={onRemoveItem}
            />
          ))}
        {!isEmpty && invoiceTools}
      </div>

      <div className="shrink-0 mt-4 flex flex-col gap-3">
        <div className="h-px bg-[#e8e8e8]" />
        <div className="flex justify-between text-[14px]">
          <span className="font-medium text-[#636566]">
            Tổng ({isEmpty ? 0 : items.length} món)
          </span>
          <span className="font-semibold text-[#202325]">
            {isEmpty ? "0 đ" : `${subtotal.toLocaleString("vi-VN")} đ`}
          </span>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="font-medium text-[#636566]">Vat (8%)</span>
          <span className="font-semibold text-[#202325]">
            {isEmpty ? "0 đ" : `${vat.toLocaleString("vi-VN")} đ`}
          </span>
        </div>
        <div className="h-px bg-[#202325]" />
        <div className="flex justify-between text-[20px]">
          <span className="font-medium text-[#202325]">Tổng tiền</span>
          <span className="font-semibold text-[#202325]">
            {isEmpty ? "0 đ" : `${total.toLocaleString("vi-VN")} đ`}
          </span>
        </div>
        {isEmpty ? (
          <button
            onClick={onCreateOrder}
            className="bg-[#025cca] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors mt-1"
          >
            <span className="text-[16px] font-medium text-white">
              {hasSelectedMenu ? "Xác nhận Tạo Order" : "Tạo Order"}
            </span>
          </button>
        ) : hasSelectedMenu ? (
          <button
            onClick={onAddItems}
            className="bg-[#e85d04] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#dc2f02] transition-colors mt-1"
          >
            <span className="text-[16px] font-medium text-white">
              Thêm món vào Đơn
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={onCheckout}
              disabled={checkoutDisabled}
              className="bg-[#025cca] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-[16px] font-medium text-white">
                {checkoutLabel}
              </span>
            </button>
            {items.length > 0 && (
              <button
                onClick={() => {
                  const uniqueOrderIds = Array.from(
                    new Set(items.map((i) => i.orderId).filter(Boolean)),
                  );
                  onCancelOrder(uniqueOrderIds);
                }}
                className="bg-transparent border border-[#dc2f02] flex items-center justify-center h-[40px] rounded-[12px] w-full hover:bg-[#dc2f02] hover:text-white text-[#dc2f02] transition-colors"
              >
                <span className="text-[14px] font-medium">Hủy đơn hàng</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Success toast ──────────────────────────────────────────────────────── */
const SuccessToast = ({
  total,
  onDismiss,
}: {
  total: number;
  onDismiss: () => void;
}) => (
  <div
    className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#dcf7ea] border border-[#48c185] rounded-[16px] px-5 py-4 shadow-lg"
    style={{ minWidth: 360 }}
  >
    <div className="w-9 h-9 bg-[#48c185] rounded-full flex items-center justify-center shrink-0">
      <CheckIcon />
    </div>
    <div className="flex flex-col flex-1">
      <p className="text-[16px] font-semibold text-[#286b4a] leading-[1.5]">
        Thanh toán thành công!
      </p>
      <p className="text-[14px] text-[#286b4a] leading-[1.5]">
        Tổng: {total.toLocaleString("vi-VN")} đ
      </p>
    </div>
    <button
      onClick={onDismiss}
      className="text-[#286b4a] hover:text-[#1a4a30] transition-colors"
    >
      <XIcon />
    </button>
  </div>
);

/* ─── Main page ──────────────────────────────────────────────────────────── */
const TABLE_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "used", label: "Sử dụng" },
  { id: "empty", label: "Còn trống" },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  WAITER: "Phục vụ",
};

const CashierOrders = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<"menu" | "table">("menu");
  const [activeArea, setActiveArea] = useState<string>("all");
  const [tableFilter, setFilter] = useState("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [activeMenuCategory, setActiveMenuCategory] = useState("all");
  const [tables, setTables] = useState<TableItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [assistanceRequests, setAssistanceRequests] = useState<AssistanceRequest[]>([]);
  const [search, setSearch] = useState("");
  const [noteModal, setNoteModal] = useState<{
    open: boolean;
    itemId: string | null;
    text: string;
  }>({ open: false, itemId: null, text: "" });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [successTotal, setSuccessTotal] = useState<number | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [backendOrderId, setBackendOrderId] = useState("");
  const [invoiceChecked, setInvoiceChecked] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(
    null,
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [promotionCode, setPromotionCode] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceAction, setInvoiceAction] = useState<string | null>(null);
  const [invoiceMessage, setInvoiceMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setTablesLoading(true);
    listTables()
      .then((res) => {
        const items = res
          .filter((t) => t.active)
          .sort((a, b) => a.order - b.order)
          .map(toTableItem);
        setTables(items);
        // default to first area
        const firstArea = items[0]?.area;
        if (firstArea) setActiveArea(firstArea);
      })
      .catch(() => {
        /* silently keep empty */
      })
      .finally(() => setTablesLoading(false));
  }, []);

  const loadMenu = () => {
    Promise.all([listCategories(), searchItems({ available: true, size: 200 })])
      .then(([cats, page]) => {
        setMenuCategories(cats);
        setMenuItems(page.data.map((item) => ({ ...item, qty: 0 })));
      })
      .catch(() => {
        /* silently keep empty */
      });
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // "Call waiter" assistance requests raised by guests, polled for the bell dropdown.
  useEffect(() => {
    const fetchAssistance = async () => {
      try {
        setAssistanceRequests(await listPendingAssistance());
      } catch (err) {
        console.error(err);
      }
    };
    void fetchAssistance();
    const intv = setInterval(fetchAssistance, 10000);
    return () => clearInterval(intv);
  }, []);

  // Live orders, polled to keep table occupancy and the order panel in sync with the kitchen.
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await listOrders(0, 100);
        setActiveOrders(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    void fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Overlay live order totals onto the table grid (amount/guests/item count, orderId link).
  useEffect(() => {
    setTables((prevTables) =>
      prevTables.map((t) => {
        const tableOrders = activeOrders.filter(
          (o) => o.tableId === t.id && ACTIVE_ORDER_STATUSES.includes(o.status),
        );
        if (tableOrders.length === 0) {
          return { ...t, orderId: null };
        }
        const itemsCount = tableOrders.reduce(
          (total, order) =>
            total + order.items.reduce((sum, item) => sum + item.quantity, 0),
          0,
        );
        const totalAmount = tableOrders.reduce(
          (total, order) => total + order.totalAmount,
          0,
        );
        return {
          ...t,
          occupied: true,
          amount: totalAmount,
          items: itemsCount,
          orderId: tableOrders[0].id,
        };
      }),
    );
  }, [activeOrders]);

  useEffect(() => {
    if (successTotal !== null) {
      const t = setTimeout(() => setSuccessTotal(null), 3500);
      return () => clearTimeout(t);
    }
  }, [successTotal]);

  const areas = ["all", ...Array.from(new Set(tables.map((t) => t.area)))];
  const tablesInArea =
    activeArea === "all" ? tables : tables.filter((t) => t.area === activeArea);
  const selectedTable = tables.find((t) => t.selected) ?? null;

  // Build the order panel's item list for the selected table from the live orders feed.
  useEffect(() => {
    if (!selectedTable || !selectedTable.occupied) {
      setOrderItems([]);
      return;
    }
    const tableOrders = activeOrders.filter(
      (o) => o.tableId === selectedTable.id && ACTIVE_ORDER_STATUSES.includes(o.status),
    );
    if (tableOrders.length === 0) {
      setOrderItems([]);
      return;
    }
    const combinedItems: OrderItem[] = tableOrders.flatMap((order) =>
      order.items.map((i) => ({
        id: i.orderItemId,
        name: i.menuItemName,
        qty: i.quantity,
        price: i.unitPrice,
        status: COOKING_STATUS_LABEL[i.cookingStatus],
        notes: i.note || "",
        orderId: order.id,
      })),
    );
    setOrderItems(combinedItems);
  }, [selectedTable?.id, selectedTable?.occupied, activeOrders]);

  const selectedMenuItems = menuItems.filter((i) => i.qty > 0);
  const hasSelectedMenu = selectedMenuItems.length > 0;

  const resetInvoiceLink = () => {
    setBackendOrderId("");
    setInvoiceChecked(false);
    setInvoice(null);
    setInvoiceDetail(null);
    setPayments([]);
    setPromotionCode("");
    setInvoiceMessage(null);
    setHistoryError("");
    setPaymentOpen(false);
  };

  const loadInvoiceForOrder = async (orderId: string) => {
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      setInvoiceMessage({
        type: "error",
        text: "Vui lòng nhập backend orderId",
      });
      return null;
    }

    setInvoiceLoading(true);
    setInvoiceMessage(null);
    setHistoryError("");
    try {
      const foundInvoice =
        (await getInvoices({ orderId: normalizedOrderId }))[0] ?? null;
      setInvoiceChecked(true);
      setInvoice(foundInvoice);
      setPayments([]);
      setInvoiceDetail(null);

      if (!foundInvoice) return null;

      const detailData = await getInvoiceById(foundInvoice.id);
      setInvoiceDetail(detailData);
      try {
        setPayments(await getPayments(foundInvoice.id));
      } catch (historyLoadError) {
        setHistoryError(
          historyLoadError instanceof Error
            ? historyLoadError.message
            : "Không thể tải lịch sử thanh toán",
        );
      }
      return foundInvoice;
    } catch (loadError) {
      setInvoiceMessage({
        type: "error",
        text:
          loadError instanceof Error
            ? loadError.message
            : "Không thể tra cứu hóa đơn",
      });
      return null;
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleBackendOrderIdChange = (value: string) => {
    setBackendOrderId(value);
    setInvoiceChecked(false);
    setInvoice(null);
    setInvoiceDetail(null);
    setPayments([]);
    setPromotionCode("");
    setInvoiceMessage(null);
    setHistoryError("");
  };

  const handleGenerateInvoice = async () => {
    if (!backendOrderId.trim()) return;
    setInvoiceAction("generate");
    setInvoiceMessage(null);
    try {
      const created = await generateInvoice({
        orderId: backendOrderId.trim(),
        promotionCode: null,
      });
      await loadInvoiceForOrder(backendOrderId);
      setInvoiceMessage({
        type: "success",
        text: `Đã tạo hóa đơn ${created.id}`,
      });
    } catch (generateError) {
      setInvoiceMessage({
        type: "error",
        text:
          generateError instanceof Error
            ? generateError.message
            : "Không thể tạo hóa đơn",
      });
    } finally {
      setInvoiceAction(null);
    }
  };

  const handleApplyDiscount = async () => {
    if (!invoice || !promotionCode.trim()) return;
    setInvoiceAction("discount");
    setInvoiceMessage(null);
    try {
      await applyInvoiceDiscount(invoice.id, promotionCode.trim());
      await loadInvoiceForOrder(backendOrderId);
      setPromotionCode("");
      setInvoiceMessage({
        type: "success",
        text: "Áp dụng khuyến mãi thành công",
      });
    } catch (discountError) {
      setInvoiceMessage({
        type: "error",
        text:
          discountError instanceof Error
            ? discountError.message
            : "Không thể áp dụng khuyến mãi",
      });
    } finally {
      setInvoiceAction(null);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setInvoiceAction("send");
    setInvoiceMessage(null);
    try {
      const sent = await sendInvoice(invoice.id);
      setInvoiceMessage({ type: "success", text: sent.message });
    } catch (sendError) {
      setInvoiceMessage({
        type: "error",
        text:
          sendError instanceof Error
            ? sendError.message
            : "Không thể gửi hóa đơn",
      });
    } finally {
      setInvoiceAction(null);
    }
  };

  const handlePrintInvoice = () => {
    if (!invoiceDetail) return;
    const cashierName = getStoredUser()?.fullName || "Duy Tan";
    if (
      !printCashierInvoice(
        invoiceDetail,
        selectedTable?.name || "-",
        cashierName,
      )
    ) {
      setInvoiceMessage({
        type: "error",
        text: "Trình duyệt đã chặn cửa sổ in hóa đơn",
      });
    }
  };

  const handleProcessPayment = async (method: PaymentMethod) => {
    if (!invoice) {
      setPaymentError("Không xác định được hóa đơn cần thanh toán");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");
    try {
      const createdPayment = await processPayment(invoice.id, method);
      setPaymentOpen(false);
      setSuccessTotal(createdPayment.amount);
      await loadInvoiceForOrder(backendOrderId);
      setInvoiceMessage({ type: "success", text: "Thanh toán thành công" });
    } catch (processError) {
      setPaymentError(
        processError instanceof Error
          ? processError.message
          : "Không thể xử lý thanh toán",
      );
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleQtyChange = (id: string, delta: number) =>
    setMenuItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item,
      ),
    );
  const handleTableSelect = (id: string) => {
    setTables((ts) => ts.map((t) => ({ ...t, selected: t.id === id })));
    resetInvoiceLink();
  };

  const handleStatusChange = async (
    orderId: string,
    orderItemId: string,
    statusLabel: string,
  ) => {
    const status = COOKING_STATUS_FROM_LABEL[statusLabel];
    if (!status) return;
    try {
      await updateOrderItemStatus(orderId, orderItemId, status);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveItem = async (orderId: string, orderItemId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa món này khỏi đơn hàng?")) return;
    try {
      await removeOrderItem(orderId, orderItemId);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelOrder = async (orderIds: string[]) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;
    try {
      await Promise.all(orderIds.map((orderId) => cancelOrder(orderId, "Hủy bởi thu ngân")));
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenNote = (itemId: string, currentText: string) =>
    setNoteModal({ open: true, itemId, text: currentText });
  const handleConfirmNote = (itemId: string, text: string) => {
    setOrderItems((items) =>
      items.map((i) => (i.id === itemId ? { ...i, notes: text } : i)),
    );
    setNoteModal({ open: false, itemId: null, text: "" });
  };
  const handleCancelNote = () =>
    setNoteModal({ open: false, itemId: null, text: "" });

  const handleCreateOrder = async () => {
    if (!hasSelectedMenu) {
      setTab("menu");
      return;
    }
    if (!selectedTable) return;
    try {
      await createOrder(
        selectedTable.id,
        selectedMenuItems.map((m) => ({ menuItemId: m.id, quantity: m.qty })),
      );
      setMenuItems((items) => items.map((i) => ({ ...i, qty: 0 })));
      setTab("table");
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItems = async () => {
    if (!selectedTable || !selectedTable.orderId) return;
    try {
      await addOrderItems(
        selectedTable.orderId,
        selectedMenuItems.map((m) => ({ menuItemId: m.id, quantity: m.qty })),
      );
      setMenuItems((items) => items.map((i) => ({ ...i, qty: 0 })));
      setTab("table");
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveAssistance = async (id: string) => {
    try {
      await respondAssistance(id);
      setAssistanceRequests((reqs) => reqs.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMenu = menuItems.filter((i) => {
    const matchesCategory =
      activeMenuCategory === "all" || i.categoryId === activeMenuCategory;
    const matchesSearch =
      !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const menuCategoryPills: Category[] = [
    { id: "all", label: "Tất Cả", count: menuItems.length },
    ...menuCategories.map((c) => ({
      id: c.id,
      label: c.name,
      count: c.itemCount,
    })),
  ];
  const tableCounts: Record<string, number> = {
    all: tablesInArea.length,
    used: tablesInArea.filter((t) => t.occupied).length,
    empty: tablesInArea.filter((t) => !t.occupied).length,
  };
  const checkoutDisabled =
    !invoice ||
    !invoiceDetail ||
    invoice.paid ||
    invoiceAction !== null ||
    invoiceLoading;
  const checkoutLabel = invoice?.paid
    ? "Đã thanh toán"
    : invoice
      ? "Thanh Toán (F9)"
      : "Liên kết hóa đơn trước";

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] overflow-hidden font-sans">
      <Header
        employeeName={user?.fullName ?? user?.username ?? "Nhân viên"}
        roleLabel={ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? "Thu ngân"}
        role={user?.role}
        assistanceRequests={assistanceRequests}
        onResolveRequest={handleResolveAssistance}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePw(true)}
      />

      <div className="flex flex-1 gap-3 lg:gap-4 p-3 lg:p-4 overflow-hidden">
        <div className="flex flex-col flex-1 gap-2.5 min-w-0 overflow-hidden">
          {tab === "table" && (
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 min-h-[38px]">
              <div className="flex gap-2 flex-wrap">
                {areas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setActiveArea(area)}
                    className={`px-4 py-1.5 rounded-[8px] border border-[#e8e8e8] text-[14px] transition-colors ${activeArea === area ? "bg-white text-[#37383a]" : "bg-[#f5f5f5] text-[#797b7c] hover:bg-white"}`}
                  >
                    {area === "all" ? "Tất cả khu vực" : area}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-5">
                {TABLE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="flex items-center gap-2 text-[14px]"
                  >
                    <div
                      className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 ${tableFilter === f.id ? "border-[#025cca]" : "border-[#37383a]"}`}
                    >
                      {tableFilter === f.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#025cca]" />
                      )}
                    </div>
                    <span className="text-black">
                      {f.label} ({tableCounts[f.id]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between shrink-0">
            <div className="flex h-[52px] rounded-[12px] overflow-hidden border-2 border-[#e8e8e8]">
              {(
                [
                  ["table", "Phòng bàn"],
                  ["menu", "Menu"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setSearch("");
                  }}
                  className={`flex-1 min-w-[120px] text-[18px] lg:text-[20px] transition-colors ${tab === id ? "bg-[#dceefe] text-[#025cca] font-semibold" : "bg-[#f5f5f5] text-[#636566] font-medium"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 bg-white rounded-[12px] px-4 h-[44px] w-[160px] md:w-[220px] lg:w-[340px]">
              <SearchIcon className="w-5 h-5 text-[#797b7c] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "menu" ? "Tìm món" : "Tìm bàn"}
                className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-[24px] font-semibold text-[#202325]">
              {tab === "menu" ? "Chọn món" : "Chọn bàn"}
            </h2>
          </div>

          <div className="flex flex-col flex-1 gap-2.5 overflow-hidden">
            {tab === "menu" ? (
              <MenuView
                items={filteredMenu}
                categories={menuCategoryPills}
                activeCategory={activeMenuCategory}
                onCategoryChange={setActiveMenuCategory}
                onRefresh={loadMenu}
                onQtyChange={handleQtyChange}
              />
            ) : tablesLoading ? (
              <div className="flex-1 flex items-center justify-center text-[#797b7c] text-[14px]">
                Đang tải danh sách bàn...
              </div>
            ) : (
              <TableView
                tables={tablesInArea}
                onSelect={handleTableSelect}
                filter={tableFilter}
              />
            )}
          </div>
        </div>

        <OrderPanel
          items={orderItems}
          hasSelectedMenu={hasSelectedMenu}
          onStatusChange={handleStatusChange}
          onCheckout={() => {
            setPaymentError("");
            setPaymentOpen(true);
          }}
          onCreateOrder={handleCreateOrder}
          onAddItems={handleAddItems}
          onNote={handleOpenNote}
          onRemoveItem={handleRemoveItem}
          onCancelOrder={handleCancelOrder}
          selectedTable={selectedTable}
          checkoutDisabled={checkoutDisabled}
          checkoutLabel={checkoutLabel}
          invoiceTools={
            <CashierInvoicePanel
              orderId={backendOrderId}
              invoiceChecked={invoiceChecked}
              invoice={invoice}
              detail={invoiceDetail}
              payments={payments}
              promotionCode={promotionCode}
              loading={invoiceLoading}
              action={invoiceAction}
              message={invoiceMessage}
              historyError={historyError}
              onOrderIdChange={handleBackendOrderIdChange}
              onLookup={() => void loadInvoiceForOrder(backendOrderId)}
              onGenerate={() => void handleGenerateInvoice()}
              onPromotionCodeChange={setPromotionCode}
              onApplyDiscount={() => void handleApplyDiscount()}
              onPrint={handlePrintInvoice}
              onSend={() => void handleSendInvoice()}
            />
          }
        />
      </div>

      <BottomNav active="orders" />

      {paymentOpen && invoiceDetail && (
        <PaymentModal
          invoice={invoiceDetail}
          table={selectedTable}
          processing={paymentProcessing}
          error={paymentError}
          onClose={() => setPaymentOpen(false)}
          onConfirm={(method) => void handleProcessPayment(method)}
        />
      )}
      {successTotal !== null && (
        <SuccessToast
          total={successTotal}
          onDismiss={() => setSuccessTotal(null)}
        />
      )}
      {noteModal.open && noteModal.itemId !== null && (
        <AddNoteModal
          itemId={noteModal.itemId}
          initialText={noteModal.text}
          onConfirm={handleConfirmNote}
          onCancel={handleCancelNote}
        />
      )}
      {showChangePw && (
        <ChangePasswordModal onClose={() => setShowChangePw(false)} />
      )}
    </div>
  );
};
export default CashierOrders;
