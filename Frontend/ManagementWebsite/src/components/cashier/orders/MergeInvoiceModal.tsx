import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InvoiceSummary,
  MergeInvoiceRequest,
} from "../../../services/invoiceApi";
import { XIcon } from "./icons";
import { getLifecycleLabel } from "../../transactions/invoiceLifecycle";

interface MergeInvoiceModalProps {
  open: boolean;
  orderId: string;
  invoices: InvoiceSummary[];
  submitting: boolean;
  error: string;
  onSubmit: (request: MergeInvoiceRequest) => Promise<boolean>;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  `${value.toLocaleString("vi-VN")} đ`;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.isConnected &&
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );

export const getMergeDisabledReason = (invoice: InvoiceSummary): string => {
  if (invoice.status === "SPLIT") return "Hóa đơn lịch sử đã được chia.";
  if (invoice.status === "MERGED") return "Hóa đơn lịch sử đã được gộp.";
  if (invoice.status !== "ACTIVE") return "Trạng thái hóa đơn không hỗ trợ gộp.";
  if (invoice.paid) return "Hóa đơn đã thanh toán.";
  if (invoice.promotionId) return "Hóa đơn đã áp dụng khuyến mãi.";
  if (invoice.discountAmount !== 0) return "Hóa đơn đã có giảm giá.";
  if (
    !Number.isFinite(invoice.subtotal) ||
    !Number.isFinite(invoice.totalAmount)
  ) {
    return "Thông tin tổng tiền chưa đầy đủ.";
  }
  if (invoice.subtotal <= 0 || invoice.totalAmount <= 0) {
    return "Tổng tiền hóa đơn phải lớn hơn 0.";
  }
  if (Math.abs(invoice.subtotal - invoice.totalAmount) >= 0.01) {
    return "Tạm tính và tổng tiền không khớp.";
  }
  return "";
};

export const isInvoiceMergeEligible = (invoice: InvoiceSummary) =>
  getMergeDisabledReason(invoice) === "";

export const MergeInvoiceModal = ({
  open,
  orderId,
  invoices,
  submitting,
  error,
  onSubmit,
  onClose,
}: MergeInvoiceModalProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const submitGuardRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);

  onCloseRef.current = onClose;
  submittingRef.current = submitting;

  const eligibleIds = useMemo(
    () => new Set(invoices.filter(isInvoiceMergeEligible).map(({ id }) => id)),
    [invoices],
  );
  const firstEligibleId = invoices.find(isInvoiceMergeEligible)?.id;

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    submitGuardRef.current = false;
  }, [open, orderId]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds((current) =>
      current.filter((invoiceId) => eligibleIds.has(invoiceId)),
    );
  }, [eligibleIds, open]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableElements = getFocusableElements(dialog);
      const initialFocus =
        focusableElements.find(
          (element) => element.dataset.mergeInitialFocus === "true",
        ) ?? focusableElements[0];
      (initialFocus ?? dialog).focus();
    });

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (event.key === "Escape") {
        if (!submittingRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsOutside =
        !(activeElement instanceof Node) || !dialog.contains(activeElement);

      if (event.shiftKey && (activeElement === firstFocusable || focusIsOutside)) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastFocusable || focusIsOutside)
      ) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const selectedInvoices = selectedIds
    .map((invoiceId) => invoices.find(({ id }) => id === invoiceId))
    .filter((invoice): invoice is InvoiceSummary => Boolean(invoice));
  const selectedSubtotal = selectedInvoices.reduce(
    (total, invoice) => total + invoice.subtotal,
    0,
  );
  const selectedTotal = selectedInvoices.reduce(
    (total, invoice) => total + invoice.totalAmount,
    0,
  );
  const canSubmit = selectedIds.length >= 2 && !submitting;

  const toggleInvoice = (invoiceId: string) => {
    if (!eligibleIds.has(invoiceId) || submitting) return;
    setSelectedIds((current) =>
      current.includes(invoiceId)
        ? current.filter((id) => id !== invoiceId)
        : [...current, invoiceId],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitGuardRef.current) return;
    const uniqueInvoiceIds = [...new Set(selectedIds)];
    if (uniqueInvoiceIds.length < 2) return;

    submitGuardRef.current = true;
    try {
      const succeeded = await onSubmit({ invoiceIds: uniqueInvoiceIds });
      if (!succeeded) submitGuardRef.current = false;
    } catch {
      submitGuardRef.current = false;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-invoice-title"
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[16px] border border-[#e8e8e8] bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-[#e8e8e8] bg-white px-5 py-4">
          <div>
            <h2 id="merge-invoice-title" className="text-[20px] font-semibold text-[#202325]">
              Gộp hóa đơn
            </h2>
            <p className="mt-1 text-[12px] text-[#636566]">
              Chọn ít nhất hai hóa đơn đang hoạt động của đơn hàng.
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng hộp thoại gộp hóa đơn"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] text-[#202325] disabled:opacity-50"
          >
            <XIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            {invoices.map((invoice) => {
              const disabledReason = getMergeDisabledReason(invoice);
              const disabled = Boolean(disabledReason) || submitting;
              const selected = selectedIds.includes(invoice.id);
              const reasonId = `merge-reason-${invoice.id}`;
              return (
                <label
                  key={invoice.id}
                  className={`flex gap-3 rounded-[10px] border px-3 py-3 ${
                    disabledReason
                      ? "border-[#e8e8e8] bg-[#f7f7f7] text-[#797b7c]"
                      : selected
                        ? "border-[#025cca] bg-[#f0f7ff] text-[#202325]"
                        : "border-[#d9d9d9] bg-white text-[#202325]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    aria-describedby={disabledReason ? reasonId : undefined}
                    data-merge-initial-focus={
                      invoice.id === firstEligibleId ? "true" : undefined
                    }
                    onChange={() => toggleInvoice(invoice.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#025cca]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className="font-mono text-[13px] font-semibold"
                        title={invoice.id}
                      >
                        {invoice.code}
                      </span>
                      <span className="text-[12px] font-medium">
                        {formatCurrency(invoice.totalAmount)}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                      <span>Trạng thái: {getLifecycleLabel(invoice.status)}</span>
                      <span>{invoice.paid ? "Đã thanh toán" : "Chưa thanh toán"}</span>
                      <span>Tạm tính: {formatCurrency(invoice.subtotal)}</span>
                    </span>
                    {disabledReason && (
                      <span id={reasonId} className="mt-1 block text-[11px] text-[#797b7c]">
                        {disabledReason}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[#e8e8e8] pt-4 text-[13px] text-[#202325]">
            <div className="flex justify-between gap-3">
              <span>Đã chọn</span>
              <strong>{selectedIds.length} hóa đơn</strong>
            </div>
            {selectedInvoices.map((invoice) => (
              <div key={invoice.id} className="mt-2 flex justify-between gap-3 text-[12px] text-[#636566]">
                <span className="font-mono" title={invoice.id}>
                  {invoice.code}
                </span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
            ))}
            <div className="mt-3 flex justify-between gap-3 border-t border-[#e8e8e8] pt-3">
              <span>Tạm tính đã chọn</span>
              <strong>{formatCurrency(selectedSubtotal)}</strong>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span>Tổng xem trước</span>
              <strong>{formatCurrency(selectedTotal)}</strong>
            </div>
            <p className="mt-2 text-[11px] text-[#636566]">
              Số tiền chỉ để xem trước. Máy chủ sẽ kiểm tra và quyết định tổng cuối cùng.
            </p>
          </div>

          {error && (
            <p className="mt-4 text-[13px] text-[#d92d20]" role="alert" aria-live="polite">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#e8e8e8] bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 rounded-[10px] border border-[#d9d9d9] px-4 text-[13px] font-medium text-[#202325] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="h-10 rounded-[10px] bg-[#025cca] px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Đang gộp..." : "Gộp hóa đơn"}
          </button>
        </div>
      </div>
    </div>
  );
};
