import type { InvoiceSummary } from "../../../services/invoiceApi";
import type { Order } from "../../../services/orderApi";
import type { TableItem } from "./types";
import { ACTIVE_ORDER_STATUSES, OCCUPIED_STATUSES } from "./types";

export const TABLE_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "used", label: "Sử dụng" },
  { id: "empty", label: "Còn trống" },
];

// Mirrors OrderServiceImpl.create()'s WALK_IN_ON_RESERVED_MIN_GAP_MINUTES: seating a walk-in on
// a RESERVED table is only safe if the walk-in's dining+cleanup window fully clears before the
// reservation is due.
export const WALK_IN_MIN_GAP_MINUTES = 120;


export const chooseInvoiceId = (
  invoiceList: InvoiceSummary[],
  preferredInvoiceId: string | null,
) => {
  if (
    preferredInvoiceId &&
    invoiceList.some((candidate) => candidate.id === preferredInvoiceId)
  ) {
    return preferredInvoiceId;
  }
  return (
    invoiceList.find(
      (candidate) => candidate.status === "ACTIVE" && !candidate.paid,
    )?.id ??
    invoiceList.find((candidate) => candidate.status === "ACTIVE")?.id ??
    invoiceList[0]?.id ??
    null
  );
};

// One-time cashier-return context written by VnpayResultPage (router state, with this
// localStorage key as a fallback/cross-tab channel). localStorage (not sessionStorage) is
// required here: VNPAY now opens in a separate tab (see handleInitiateVnpay), so this is the
// only channel that reaches back into the original cashier tab — sessionStorage is per-tab
// and would never be visible outside the popup that wrote it. All fields originate from the
// verified backend VnpayStatusResponse, never from raw VNPAY URL/query parameters.
export interface VnpayReturnContext {
  tableId?: string;
  orderId?: string;
  invoiceId?: string;
  txnRef?: string;
  paymentResult?: string;
  amount?: number;
}

export const VNPAY_RETURN_STORAGE_KEY = "vnpay_return_context";

export const readStoredVnpayReturnContext = (): VnpayReturnContext | null => {
  try {
    const raw = localStorage.getItem(VNPAY_RETURN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VnpayReturnContext) : null;
  } catch {
    return null;
  }
};

export const clearStoredVnpayReturnContext = () => {
  try {
    localStorage.removeItem(VNPAY_RETURN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

// Cross-references one table against the live active-orders list to compute its
// order-linked fields (orderId/amount/items/occupied/status). Shared by the
// [activeOrders]-driven table overlay effect below and loadCashierState's returned
// snapshot, so a caller that needs this correctly-linked data immediately (VNPAY
// restoration) doesn't have to wait for that effect's own extra render cycle to converge —
// loadCashierState's own setTables call deliberately preserves the table's *previous*
// orderId (old?.orderId ?? null) rather than the fresh one, since this overlay is what's
// meant to be authoritative for that field.
export const applyActiveOrdersToTable = (
  table: TableItem,
  activeOrders: Order[],
): TableItem => {
  const tableOrders = activeOrders.filter(
    (order) =>
      order.tableId === table.id && ACTIVE_ORDER_STATUSES.includes(order.status),
  );
  if (tableOrders.length === 0) {
    return {
      ...table,
      orderId: null,
      occupied: OCCUPIED_STATUSES.includes(table.status),
      amount: 0,
      items: 0,
    };
  }
  let itemsCount = 0;
  let totalAmount = 0;
  tableOrders.forEach((order) => {
    order.items.forEach((item) => {
      const isPendingQr =
        item.cookingStatus === "PENDING" && (item.isQrOrder ?? item.qrOrder);
      const isRejected = item.cookingStatus === "REJECTED";
      if (!isPendingQr && !isRejected) {
        itemsCount += item.quantity;
        totalAmount += item.unitPrice * item.quantity;
      }
    });
  });
  return {
    ...table,
    occupied: true,
    status: table.status === "BILLING" ? "BILLING" : "OCCUPIED",
    amount: totalAmount,
    items: itemsCount,
    orderId: tableOrders[0].id,
  };
};
