import type { InvoiceStatus, InvoiceSummary } from "../../services/invoiceApi";

export type InvoiceViewTab = "operational" | "history";

export const OPERATIONAL_STATUSES: InvoiceStatus[] = ["ACTIVE"];
export const HISTORY_STATUSES: InvoiceStatus[] = ["SPLIT", "MERGED"];

const LIFECYCLE_LABELS: Record<InvoiceStatus, string> = {
  ACTIVE: "Đang hiệu lực",
  SPLIT: "Đã tách",
  MERGED: "Đã gộp",
};

const LIFECYCLE_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  ACTIVE: "kv-badge-success",
  SPLIT: "kv-badge-neutral",
  MERGED: "kv-badge-neutral",
};

/** Historical sources can never be paid, so payment state does not apply to them. */
export const PAYMENT_NOT_APPLICABLE_LABEL = "Không áp dụng";

export const isActiveInvoice = (invoice: InvoiceSummary) =>
  invoice.status === "ACTIVE";

export const getLifecycleLabel = (status: InvoiceStatus) =>
  LIFECYCLE_LABELS[status] ?? status;

export const getLifecycleBadgeClass = (status: InvoiceStatus) =>
  LIFECYCLE_BADGE_CLASSES[status] ?? "kv-badge-neutral";

/**
 * Payment wording. Only an ACTIVE invoice carries a real payment state; a SPLIT or
 * MERGED source is permanently unpayable and must never read "Chưa thanh toán",
 * which would imply a collectible balance.
 */
export const getPaymentLabel = (invoice: {
  status: InvoiceStatus;
  paid: boolean;
}) => {
  if (invoice.status !== "ACTIVE") return PAYMENT_NOT_APPLICABLE_LABEL;
  return invoice.paid ? "Đã thanh toán" : "Chưa thanh toán";
};

export const getPaymentBadgeClass = (invoice: {
  status: InvoiceStatus;
  paid: boolean;
}) => {
  if (invoice.status !== "ACTIVE") return "kv-badge-neutral";
  return invoice.paid ? "kv-badge-success" : "kv-badge-warning";
};

/** Short lineage hint, e.g. the merge target or the split source this row came from. */
export const getLineageHint = (invoice: InvoiceSummary): string | null => {
  if (invoice.status === "MERGED" && invoice.mergedIntoInvoiceId) {
    return `Đã gộp vào ${invoice.mergedIntoInvoiceCode ?? "—"}`;
  }
  if (invoice.status === "SPLIT") {
    return "Đã chuyển tiếp sang hóa đơn con";
  }
  if (invoice.status === "ACTIVE" && invoice.splitFromInvoiceId) {
    return `Tách từ ${invoice.splitFromInvoiceCode ?? "—"}`;
  }
  return null;
};
