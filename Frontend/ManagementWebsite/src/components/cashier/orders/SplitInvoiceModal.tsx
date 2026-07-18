import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InvoiceDetail,
  InvoiceSummary,
  SplitInvoiceRequest,
} from "../../../services/invoiceApi";
import { XIcon } from "./icons";

interface DraftGroup {
  id: number;
  allocationIds: string[];
}

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

const createInitialGroups = (detail: InvoiceDetail): DraftGroup[] => {
  const allocationIds = detail.items.map((item) => item.allocationId);
  return [
    { id: 1, allocationIds: allocationIds.slice(0, 1) },
    { id: 2, allocationIds: allocationIds.slice(1) },
  ];
};

export const SplitInvoiceModal = ({
  open,
  invoice,
  invoiceDetail,
  submitting,
  error,
  onSubmit,
  onClose,
}: SplitInvoiceModalProps) => {
  const [groups, setGroups] = useState<DraftGroup[]>(() =>
    createInitialGroups(invoiceDetail),
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);

  onCloseRef.current = onClose;
  submittingRef.current = submitting;

  useEffect(() => {
    if (open) setGroups(createInitialGroups(invoiceDetail));
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
  const assignedAllocationIds = groups.flatMap((group) => group.allocationIds);
  const uniqueAssignedIds = new Set(assignedAllocationIds);
  const sourceAllocationIds = invoiceDetail.items.map(
    (item) => item.allocationId,
  );
  const sourceAllocationSet = new Set(sourceAllocationIds);
  const groupSubtotals = groups.map((group) =>
    group.allocationIds.reduce(
      (total, allocationId) =>
        total + (itemByAllocationId.get(allocationId)?.lineTotal ?? 0),
      0,
    ),
  );
  const groupedTotal = groupSubtotals.reduce((total, value) => total + value, 0);
  const totalsConserved = Math.abs(groupedTotal - invoice.totalAmount) < 0.01;
  const assignmentsExact =
    sourceAllocationIds.length > 0 &&
    sourceAllocationIds.every((allocationId) => allocationId.trim()) &&
    sourceAllocationSet.size === sourceAllocationIds.length &&
    assignedAllocationIds.length === sourceAllocationIds.length &&
    uniqueAssignedIds.size === sourceAllocationIds.length &&
    assignedAllocationIds.every((allocationId) =>
      sourceAllocationSet.has(allocationId),
    );
  const canSubmit =
    groups.length >= 2 &&
    groups.every((group) => group.allocationIds.length > 0) &&
    assignmentsExact &&
    totalsConserved &&
    !submitting;

  if (!open) return null;

  const moveAllocation = (allocationId: string, targetGroupId: number) => {
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        allocationIds:
          group.id === targetGroupId
            ? group.allocationIds.includes(allocationId)
              ? group.allocationIds
              : [...group.allocationIds, allocationId]
            : group.allocationIds.filter((id) => id !== allocationId),
      })),
    );
  };

  const addGroup = () => {
    setGroups((current) => {
      if (current.length >= sourceAllocationIds.length) return current;
      const nextId = Math.max(...current.map((group) => group.id), 0) + 1;
      return [...current, { id: nextId, allocationIds: [] }];
    });
  };

  const removeGroup = (groupId: number) => {
    setGroups((current) => {
      const target = current.find((group) => group.id === groupId);
      if (current.length <= 2 || !target || target.allocationIds.length > 0) {
        return current;
      }
      return current.filter((group) => group.id !== groupId);
    });
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
            <p className="mt-1 truncate text-[13px] text-[#636566]">
              Hóa đơn {invoice.id}
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
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[12px] text-[#636566]">Tổng hóa đơn nguồn</p>
              <p className="text-[18px] font-semibold text-[#202325]">
                {formatCurrency(invoice.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-[#636566]">Tổng các nhóm</p>
              <p className="text-[18px] font-semibold text-[#202325]">
                {formatCurrency(groupedTotal)}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-[#636566]">Đối soát</p>
              <p
                className={`text-[14px] font-medium ${totalsConserved ? "text-[#286b4a]" : "text-[#d92d20]"}`}
              >
                {totalsConserved ? "Tổng tiền khớp" : "Tổng tiền chưa khớp"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.map((group, groupIndex) => (
              <section
                key={group.id}
                className="rounded-[8px] border border-[#d9d9d9] p-4"
                aria-labelledby={`split-group-${group.id}`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3
                      id={`split-group-${group.id}`}
                      className="text-[15px] font-semibold text-[#202325]"
                    >
                      Nhóm {groupIndex + 1}
                    </h3>
                    <p className="text-[12px] text-[#636566]">
                      {group.allocationIds.length} món ·{" "}
                      {formatCurrency(groupSubtotals[groupIndex])}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    disabled={
                      submitting ||
                      groups.length <= 2 ||
                      group.allocationIds.length > 0
                    }
                    className="text-[12px] font-medium text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Xóa nhóm trống
                  </button>
                </div>

                {group.allocationIds.length === 0 ? (
                  <p className="rounded-[8px] bg-[#f5f5f5] px-3 py-5 text-center text-[13px] text-[#797b7c]">
                    Chưa có món trong nhóm này
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {group.allocationIds.map((allocationId) => {
                      const item = itemByAllocationId.get(allocationId);
                      if (!item) return null;
                      return (
                        <div
                          key={allocationId}
                          className="border-b border-[#eeeeee] pb-3 last:border-0 last:pb-0"
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
                          <label className="mt-2 flex items-center gap-2 text-[12px] text-[#636566]">
                            Chuyển đến
                            <select
                              value={group.id}
                              data-split-initial-focus="true"
                              onChange={(event) =>
                                moveAllocation(
                                  allocationId,
                                  Number(event.target.value),
                                )
                              }
                              disabled={submitting}
                              aria-label={`Chọn nhóm cho ${item.menuItemName}`}
                              className="h-8 flex-1 rounded-[8px] border border-[#d9d9d9] bg-white px-2 text-[#202325] outline-none focus:border-[#025cca]"
                            >
                              {groups.map((option, optionIndex) => (
                                <option key={option.id} value={option.id}>
                                  Nhóm {optionIndex + 1}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={addGroup}
            disabled={submitting || groups.length >= sourceAllocationIds.length}
            className="mt-4 h-10 rounded-[8px] border border-[#025cca] px-4 text-[13px] font-medium text-[#025cca] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Thêm nhóm
          </button>

          {error && (
            <p className="mt-4 text-[13px] text-[#d92d20]" role="alert">
              {error}
            </p>
          )}
          {!groups.every((group) => group.allocationIds.length > 0) && (
            <p className="mt-3 text-[12px] text-[#9a6700]">
              Mỗi nhóm phải có ít nhất một món trước khi xác nhận.
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
                groups: groups.map((group) => ({
                  allocationIds: [...group.allocationIds],
                })),
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
