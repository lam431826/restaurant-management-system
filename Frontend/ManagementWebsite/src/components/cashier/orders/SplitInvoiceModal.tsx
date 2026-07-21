import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InvoiceDetail,
  InvoiceSummary,
  SplitInvoiceRequest,
} from "../../../services/invoiceApi";
import { XIcon } from "./icons";

/** Units to peel off each line into the new invoice. Keyed by allocationId. */
type SplitQuantities = Record<string, number>;

interface SplitInvoiceModalProps {
  open: boolean;
  invoice: InvoiceSummary;
  invoiceDetail: InvoiceDetail;
  submitting: boolean;
  error: string;
  onSubmit: (request: SplitInvoiceRequest) => void;
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

/** Start empty: the cashier picks what moves to the new invoice. */
const createInitialQuantities = (detail: InvoiceDetail): SplitQuantities =>
  Object.fromEntries(detail.items.map((item) => [item.allocationId, 0]));

export const SplitInvoiceModal = ({
  open,
  invoice,
  invoiceDetail,
  submitting,
  error,
  onSubmit,
  onClose,
}: SplitInvoiceModalProps) => {
  const [quantities, setQuantities] = useState<SplitQuantities>(() =>
    createInitialQuantities(invoiceDetail),
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);

  onCloseRef.current = onClose;
  submittingRef.current = submitting;

  useEffect(() => {
    if (open) setQuantities(createInitialQuantities(invoiceDetail));
  }, [open, invoiceDetail.id]);

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
          (element) => element.dataset.splitInitialFocus === "true",
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

  const itemByAllocationId = useMemo(
    () =>
      new Map(
        invoiceDetail.items.map((item) => [item.allocationId, item] as const),
      ),
    [invoiceDetail.items],
  );
  const totalSourceQuantity = invoiceDetail.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const movedQuantity = invoiceDetail.items.reduce(
    (total, item) => total + (quantities[item.allocationId] ?? 0),
    0,
  );
  const movedSubtotal = invoiceDetail.items.reduce(
    (total, item) => total + item.unitPrice * (quantities[item.allocationId] ?? 0),
    0,
  );
  const remainingQuantity = totalSourceQuantity - movedQuantity;
  const remainingSubtotal = invoice.totalAmount - movedSubtotal;
  // The source stays open and payable, so it must keep at least one unit.
  const canSubmit =
    movedQuantity >= 1 && remainingQuantity >= 1 && !submitting;

  if (!open) return null;

  const setQuantity = (allocationId: string, next: number) => {
    const item = itemByAllocationId.get(allocationId);
    if (!item) return;
    const clamped = Math.max(0, Math.min(next, item.quantity));
    setQuantities((current) => ({ ...current, [allocationId]: clamped }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-invoice-title"
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[12px] bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-4">
          <div className="min-w-0">
            <h2
              id="split-invoice-title"
              className="text-[22px] font-semibold text-[#202325]"
            >
              Chia hóa đơn
            </h2>
            <p
              className="mt-1 truncate text-[13px] text-[#636566]"
              title={invoice.id}
            >
              Hóa đơn{" "}
              <span className="font-mono">{invoice.code}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại chia hóa đơn"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5] text-[#202325] hover:bg-[#e8e8e8] disabled:opacity-50"
          >
            <XIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-4 text-[13px] text-[#636566]">
            Chọn số lượng chuyển sang hóa đơn mới. Hóa đơn hiện tại giữ lại phần
            còn lại và vẫn có thể thanh toán.
          </p>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[12px] text-[#636566]">Hóa đơn hiện tại giữ</p>
              <p className="text-[18px] font-semibold text-[#202325]">
                {formatCurrency(remainingSubtotal)}
              </p>
              <p className="text-[12px] text-[#636566]">
                {remainingQuantity} phần món
              </p>
            </div>
            <div>
              <p className="text-[12px] text-[#636566]">Hóa đơn mới nhận</p>
              <p className="text-[18px] font-semibold text-[#202325]">
                {formatCurrency(movedSubtotal)}
              </p>
              <p className="text-[12px] text-[#636566]">
                {movedQuantity} phần món
              </p>
            </div>
            <div>
              <p className="text-[12px] text-[#636566]">Đối soát</p>
              <p
                className={`text-[14px] font-medium ${canSubmit ? "text-[#286b4a]" : "text-[#9a6700]"}`}
              >
                {movedQuantity < 1
                  ? "Chưa chọn phần món nào"
                  : remainingQuantity < 1
                    ? "Phải giữ lại ít nhất một phần món"
                    : "Tổng tiền khớp"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {invoiceDetail.items.map((item, itemIndex) => {
              const selected = quantities[item.allocationId] ?? 0;
              const remainingForItem = item.quantity - selected;
              return (
                <section
                  key={item.allocationId}
                  className="rounded-[8px] border border-[#d9d9d9] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-[#202325]">
                        {item.menuItemName}
                      </p>
                      <p className="text-[12px] text-[#636566]">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <strong className="shrink-0 text-[13px] text-[#202325]">
                      {formatCurrency(item.lineTotal)}
                    </strong>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#636566]">
                        Chuyển sang hóa đơn mới
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.allocationId, selected - 1)
                          }
                          disabled={submitting || selected <= 0}
                          aria-label={`Giảm số lượng tách của ${item.menuItemName}`}
                          className="h-8 w-8 rounded-[8px] border border-[#d9d9d9] text-[16px] text-[#202325] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={selected}
                          data-split-initial-focus={
                            itemIndex === 0 ? "true" : undefined
                          }
                          onChange={(event) =>
                            setQuantity(
                              item.allocationId,
                              Number(event.target.value),
                            )
                          }
                          disabled={submitting}
                          aria-label={`Số lượng tách của ${item.menuItemName}`}
                          className="h-8 w-14 rounded-[8px] border border-[#d9d9d9] bg-white px-2 text-center text-[13px] text-[#202325] outline-none focus:border-[#025cca]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.allocationId, selected + 1)
                          }
                          disabled={submitting || selected >= item.quantity}
                          aria-label={`Tăng số lượng tách của ${item.menuItemName}`}
                          className="h-8 w-8 rounded-[8px] border border-[#d9d9d9] text-[16px] text-[#202325] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#636566]">
                      Còn lại: <strong>{remainingForItem}</strong> ·{" "}
                      {formatCurrency(item.unitPrice * selected)}
                    </p>
                  </div>
                </section>
              );
            })}
          </div>

          {error && (
            <p className="mt-4 text-[13px] text-[#d92d20]" role="alert">
              {error}
            </p>
          )}
          {movedQuantity >= 1 && remainingQuantity < 1 && (
            <p className="mt-3 text-[12px] text-[#9a6700]">
              Hóa đơn hiện tại phải giữ lại ít nhất một phần món.
            </p>
          )}
        </div>

        <footer className="flex gap-3 border-t border-[#e8e8e8] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 flex-1 rounded-[10px] bg-[#f5f5f5] text-[14px] font-medium text-[#202325] hover:bg-[#e8e8e8] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                // One group: everything selected moves into a single new invoice.
                groups: [
                  {
                    items: invoiceDetail.items
                      .map((item) => ({
                        allocationId: item.allocationId,
                        quantity: quantities[item.allocationId] ?? 0,
                      }))
                      .filter((selection) => selection.quantity > 0),
                  },
                ],
              })
            }
            disabled={!canSubmit}
            className="h-11 flex-1 rounded-[10px] bg-[#025cca] text-[14px] font-semibold text-white hover:bg-[#0250b0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Đang chia hóa đơn..." : "Xác nhận chia"}
          </button>
        </footer>
      </div>
    </div>
  );
};
