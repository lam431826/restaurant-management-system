import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  InvoiceDetail,
  InvoiceSummary,
  MergeInvoiceRequest,
  SplitInvoiceRequest,
} from "../../../services/invoiceApi";
import type { SelectablePaymentMethod } from "../../../services/paymentApi";
import type { UserRole } from "../../../context/AuthContext";
import type { TableItem } from "./types";
import { SplitInvoiceModal } from "./SplitInvoiceModal";
import {
  isInvoiceMergeEligible,
  MergeInvoiceModal,
} from "./MergeInvoiceModal";
import {
  ChevronDownIcon,
  CashMethodIcon,
  QRMethodIcon,
  XIcon,
  DeleteDigitIcon,
} from "./icons";
import {
  getLifecycleBadgeClass,
  getLifecycleLabel,
} from "../../transactions/invoiceLifecycle";

/* ─── Payment modal ──────────────────────────────────────────────────────── */
interface NonPayableReceiptItem {
  id: string;
  name: string;
  quantity: number;
  note?: string | null;
}

// Only CASH and VNPAY Sandbox are supported; CARD/E_WALLET are intentionally not offered.
const PAYMENT_METHODS = [
  { id: "CASH" as const, label: "Tiền mặt" },
  { id: "VNPAY" as const, label: "VNPAY Sandbox" },
];

export const PaymentModal = ({
  invoices,
  selectedInvoiceId,
  invoice,
  table,
  invoiceListLoading,
  invoiceListError,
  detailLoading,
  detailError,
  processing,
  error,
  promotionCode,
  action,
  splitError,
  mergeError,
  role,
  invoiceMessage,
  nonPayableItems = [],
  vnpayLoading,
  vnpayError,
  cashierName,
  shiftLabel,
  customer,
  customerSaving,
  customerError,
  onSaveCustomer,
  onClose,
  onSelectInvoice,
  onRefreshInvoices,
  onConfirmCash,
  onInitiateVnpay,
  onCheckVnpayStatus,
  onResetVnpayState,
  onPromotionCodeChange,
  onApplyDiscount,
  onPrint,
  onSend,
  onSplit,
  onMerge,
  onResetMergeError,
}: {
  invoices: InvoiceSummary[];
  selectedInvoiceId: string | null;
  invoice: InvoiceDetail | null;
  table: TableItem | null;
  invoiceListLoading: boolean;
  invoiceListError: string;
  detailLoading: boolean;
  detailError: string;
  processing: boolean;
  error: string;
  promotionCode: string;
  action: string | null;
  splitError: string;
  mergeError: string;
  role?: UserRole;
  invoiceMessage: { type: "success" | "error"; text: string } | null;
  nonPayableItems?: NonPayableReceiptItem[];
  // True while a VNPAY payment URL is being created (POST /vnpay/create in flight).
  vnpayLoading: boolean;
  vnpayError: string;
  // Real signed-in cashier and real current shift — never a fixed placeholder.
  cashierName: string;
  shiftLabel: string;
  customer: { name: string | null; phone: string | null; email: string | null };
  customerSaving: boolean;
  customerError: string;
  onSaveCustomer: (customer: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
  }) => Promise<boolean>;
  onClose: () => void;
  onSelectInvoice: (invoiceId: string) => void;
  onRefreshInvoices: () => void;
  onConfirmCash: (receivedAmount: number) => void;
  // Creates (or reuses) a PENDING VNPAY attempt and redirects the browser to VNPAY.
  onInitiateVnpay: () => void;
  // Asks VNPAY (server-side QueryDR) what happened to an attempt still stuck PENDING
  // locally, so a missed IPN cannot block this invoice indefinitely.
  onCheckVnpayStatus: () => void;
  onResetVnpayState: () => void;
  onPromotionCodeChange: (value: string) => void;
  onApplyDiscount: () => void;
  onPrint: () => void;
  onSend: () => void;
  onSplit: (request: SplitInvoiceRequest) => Promise<boolean>;
  onMerge: (request: MergeInvoiceRequest) => Promise<boolean>;
  onResetMergeError: () => void;
}) => {
  const [method, setMethod] = useState<SelectablePaymentMethod>("CASH");
  const [cashInput, setCashInput] = useState("");
  const [splitOpen, setSplitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
  });

  // Re-seed the editor whenever the stored customer changes so it never shows stale text.
  useEffect(() => {
    setCustomerDraft({
      customerName: customer.name ?? "",
      customerPhone: customer.phone ?? "",
      customerEmail: customer.email ?? "",
    });
  }, [customer.name, customer.phone, customer.email]);

  useEffect(() => {
    setSplitOpen(false);
    setMergeOpen(false);
    setCashInput("");
    setMethod("CASH");
    onResetVnpayState();
    // onResetVnpayState is stable from the parent (useState setter); omitting it from
    // deps avoids re-running this reset whenever the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoiceId]);

  const selectedInvoice =
    invoices.find((candidate) => candidate.id === selectedInvoiceId) ?? null;
  const subtotal = invoice?.subtotal ?? 0;
  const total = invoice?.totalAmount ?? selectedInvoice?.totalAmount ?? 0;

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

  const methodIcons: Record<SelectablePaymentMethod, ReactNode> = {
    CASH: <CashMethodIcon />,
    VNPAY: <QRMethodIcon />,
  };

  const handleDigit = (key: string) => {
    if (key === "del") setCashInput((v) => v.slice(0, -1));
    else setCashInput((v) => (v.length < 12 ? v + key : v));
  };
  const receivedAmount = cashInput ? parseInt(cashInput, 10) : 0;
  const changeAmount = Math.max(0, receivedAmount - total);
  const receivedAmountSufficient = cashInput !== "" && receivedAmount >= total;
  const displayAmount = cashInput
    ? receivedAmount.toLocaleString("vi-VN") + "đ"
    : "0đ";
  const actionBusy = action !== null;
  const isActiveInvoice = selectedInvoice?.status === "ACTIVE";
  const eligibleMergeCount = invoices.filter(isInvoiceMergeEligible).length;
  const mergeVisible =
    (role === "CASHIER" || role === "ADMIN") && eligibleMergeCount >= 2;
  const splitVisible =
    (role === "CASHIER" || role === "ADMIN") &&
    isActiveInvoice &&
    !selectedInvoice?.paid;
  const splitDisabledReason = (() => {
    if (!splitVisible) return "";
    if (detailLoading || !invoice) return "Đang tải chi tiết hóa đơn.";
    // Eligibility is counted in units, not lines: a single line of quantity 2 can be split.
    if (invoice.items.reduce((total, item) => total + item.quantity, 0) < 2) {
      return "Cần ít nhất hai phần món để chia hóa đơn.";
    }
    if (invoice.items.some((item) => !item.allocationId?.trim())) {
      return "Dữ liệu định danh món chưa đầy đủ.";
    }
    if (invoice.promotionId || invoice.discountAmount > 0) {
      return "Hóa đơn có khuyến mãi hoặc giảm giá không thể chia.";
    }
    if (
      invoice.subtotal <= 0 ||
      invoice.totalAmount <= 0 ||
      Math.abs(invoice.subtotal - invoice.totalAmount) >= 0.01
    ) {
      return "Tổng tiền hóa đơn chưa đủ điều kiện để chia.";
    }
    if (actionBusy || processing) return "Đang xử lý thao tác hóa đơn khác.";
    return "";
  })();
  // "Gửi hóa đơn" needs a real recipient — the backend refuses to send without one, so
  // the button stays disabled rather than pretending the email went out.
  const customerEmail = (customer.email ?? "").trim();
  const hasCustomerEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  const nonPayableFallbackNote = "Nhà hàng không thể phục vụ món này.";
  const confirmLabel = processing
    ? "Đang thanh toán..."
    : invoice?.paid
      ? "Đã thanh toán"
      : "Xác nhận thanh toán";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        style={{ opacity: 0.6 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Thanh toán hóa đơn"
        className="relative bg-white rounded-[16px] p-5 sm:p-6 flex flex-col gap-3 overflow-hidden w-[95vw] max-w-[840px] max-h-[calc(100vh-32px)]"
      >
        <div className="flex items-center justify-between shrink-0">
          <p className="text-[20px] font-semibold text-[#202325]">Thanh toán</p>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 bg-[#f5f5f5] rounded-full flex items-center justify-center text-[#636566] hover:bg-[#e8e8e8] hover:text-[#202325] transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="shrink-0 rounded-[10px] border border-[#e8e8e8] bg-white px-3 py-2">
          {invoiceListLoading ? (
            <p className="text-[13px] text-[#636566]">Đang tải danh sách hóa đơn...</p>
          ) : invoiceListError ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#d92d20]">{invoiceListError}</p>
              <button
                type="button"
                onClick={onRefreshInvoices}
                className="text-[13px] font-medium text-[#025cca]"
              >
                Tải lại
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-[13px] text-[#636566]">Đơn hàng chưa có hóa đơn.</p>
          ) : (
            <label className="flex items-center gap-3 text-[13px] text-[#636566]">
              <span className="shrink-0">Hóa đơn</span>
              <select
                value={selectedInvoiceId ?? ""}
                onChange={(event) => onSelectInvoice(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-[8px] border border-[#d9d9d9] bg-white px-2 text-[13px] text-[#202325] outline-none focus:border-[#025cca]"
              >
                {invoices.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.code} ·{" "}
                    {getLifecycleLabel(candidate.status)} ·{" "}
                    {candidate.status === "ACTIVE"
                      ? candidate.paid
                        ? "Đã thanh toán"
                        : "Chưa thanh toán"
                      : "Không áp dụng"}{" "}
                    · {candidate.totalAmount.toLocaleString("vi-VN")} đ
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {detailLoading && (
          <div className="flex min-h-[280px] items-center justify-center text-[14px] text-[#636566]">
            Đang tải chi tiết hóa đơn...
          </div>
        )}
        {!detailLoading && detailError && (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-[14px] text-[#d92d20]">{detailError}</p>
            <button
              type="button"
              onClick={onRefreshInvoices}
              className="h-9 rounded-[8px] border border-[#025cca] px-4 text-[13px] font-medium text-[#025cca]"
            >
              Tải lại hóa đơn
            </button>
          </div>
        )}

        {invoice && !detailLoading && !detailError && (
        <div className="flex gap-5 lg:gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
          {/* Receipt */}
          <div
            className="hidden lg:flex w-[320px] min-h-0 bg-[#fcf7ef] overflow-y-auto flex-col gap-3 px-4 py-6 shrink-0 rounded-[12px]"
            style={{ fontFamily: "monospace" }}
          >
            <div className="flex flex-col items-center gap-2">
              <p className="text-[#3f4e4f] text-[19px] font-semibold">
                Wasabi Sushi
              </p>
              <p className="text-black text-[11px] text-center tracking-tight">
                {dateStr} • {timeStr}
              </p>
            </div>
            <div className="border border-dashed border-[#b0a080] rounded px-3 py-2 text-center">
              <p className="text-[11px] tracking-widest text-black">Mã đơn hàng</p>
              <p
                className="text-[16px] font-bold tracking-wider text-black"
                title={invoice.orderId}
              >
                {invoice.orderCode}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 text-[12px]">
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Thu ngân</span>
                <span className="text-black text-right">{cashierName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Ca làm</span>
                <span className="text-black text-right">{shiftLabel}</span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-2.5 text-[12px]">
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Khách hàng</span>
                <span className="text-black text-right break-all">
                  {customer.name?.trim() || "Khách lẻ"}
                </span>
              </div>
              {customer.phone?.trim() && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#6d7278] shrink-0">Điện thoại</span>
                  <span className="text-black text-right break-all">
                    {customer.phone.trim()}
                  </span>
                </div>
              )}
              {customer.email?.trim() && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#6d7278] shrink-0">Email</span>
                  <span className="text-black text-right break-all">
                    {customer.email.trim()}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Hình thức</span>
                <span className="text-black">Tại bàn</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Số bàn</span>
                <span className="text-black">
                  {table?.name?.replace("Bàn ", "") ?? "—"}
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-2.5 text-[12px]">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex gap-2 justify-between">
                    <span className="text-black font-medium flex-1 truncate">
                      {item.menuItemName}
                    </span>
                    <span className="text-black shrink-0 font-bold">
                      {item.lineTotal.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <span className="text-[#6d7278] text-[11px]">
                    {item.quantity} x {item.unitPrice.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ))}
            </div>
            {nonPayableItems.length > 0 && (
              <>
                <div className="border-t border-dashed border-[#b0a080]" />
                <div className="flex flex-col gap-2.5 text-[12px]">
                  <p className="text-black font-bold">
                    Món đã hủy bởi nhà hàng
                  </p>
                  {nonPayableItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-black flex-1 truncate">
                          {item.name}
                        </span>
                        <span className="text-[#6d7278] shrink-0 text-[11px]">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#6d7278] text-[11px]">
                          Không tính tiền
                        </span>
                        <span className="text-black font-bold">0đ</span>
                      </div>
                      <p className="text-[#6d7278] text-[11px] leading-snug">
                        Ghi chú: {item.note?.trim() || nonPayableFallbackNote}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-2.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Tạm tính</span>
                <span className="text-black">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Giảm giá</span>
                <span className="text-black">
                  {invoice.discountAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex justify-between text-[15px] font-bold text-[#a27b5c]">
              <span>Tổng thanh toán</span>
              <span>{total.toLocaleString("vi-VN")}đ</span>
            </div>
            <p className="text-[10px] text-[#6d7278] leading-relaxed text-center">
              Cảm ơn quý khách. Hẹn gặp lại!
            </p>
            <p className="text-[#3f4e4f] text-[14px] font-semibold text-center">
              Wasabi Sushi
            </p>
          </div>

          {/* Payment panel — one scroll area + a sticky confirm footer, so no control is ever
              clipped by the modal's overflow-hidden regardless of viewport height. */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3">
              {/* Payment method comes first — it's the primary action for an active invoice
                  and must be reachable without scrolling past the secondary invoice-actions card. */}
              {isActiveInvoice && (
                <>
                  <p className="text-[14px] font-semibold text-[#202325]">
                    Chọn phương thức thanh toán
                  </p>
                  {/* Segmented control — only two methods, so a toggle is clearer than a
                      dropdown and never overlays the content below it. */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[12px] border border-[#e8e8e8] bg-[#f5f5f5]">
                    {PAYMENT_METHODS.map((pm) => {
                      const active = method === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setMethod(pm.id)}
                          aria-pressed={active}
                          className={`flex items-center justify-center gap-2 h-[42px] rounded-[9px] text-[14px] font-medium transition-colors ${
                            active
                              ? "bg-white text-[#025cca] shadow-sm ring-1 ring-[#cfe3fb]"
                              : "bg-transparent text-[#636566] hover:text-[#202325]"
                          }`}
                        >
                          <span className={active ? "text-[#025cca]" : "text-[#797b7c]"}>
                            {methodIcons[pm.id]}
                          </span>
                          <span className="truncate">{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {method === "CASH" && (
                    <div className="flex flex-col items-center gap-4 pb-1">
                      <div className="flex flex-col items-center gap-1.5 rounded-[12px] bg-[#f7f9fc] border border-[#eef1f5] w-full py-3">
                        <p className="text-[12px] font-medium text-[#797b7c]">
                          Tiền khách đưa
                        </p>
                        <p className="text-[34px] font-semibold leading-none text-[#202325] text-center">
                          {displayAmount}
                        </p>
                        <div className="flex items-center gap-4 mt-0.5">
                          <p className="text-[12px] text-[#797b7c]">
                            Cần thu: {total.toLocaleString("vi-VN")} đ
                          </p>
                          <p
                            className={`text-[12px] font-medium ${receivedAmountSufficient ? "text-[#286b4a]" : "text-[#797b7c]"}`}
                          >
                            Thối lại: {changeAmount.toLocaleString("vi-VN")} đ
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 w-full gap-2">
                        {[
                          "1", "2", "3",
                          "4", "5", "6",
                          "7", "8", "9",
                          ".", "0", "del",
                        ].map((key) => (
                          <button
                            key={key}
                            onClick={() => key !== "." && handleDigit(key)}
                            disabled={key === "."}
                            className={`h-[46px] flex items-center justify-center rounded-[10px] border transition-all active:scale-95 ${
                              key === "."
                                ? "opacity-0 cursor-default border-transparent"
                                : "border-[#e8e8e8] bg-white hover:bg-[#f5f5f5] hover:border-[#d9d9d9]"
                            }`}
                          >
                            {key === "del" ? (
                              <DeleteDigitIcon />
                            ) : (
                              <span className="text-[22px] font-medium text-[#202325]">
                                {key}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {method === "VNPAY" && (
                    <div className="flex flex-col items-center gap-3 pb-1">
                      <div className="w-[140px] h-[140px] bg-white flex items-center justify-center shrink-0 border border-dashed border-[#cfe3fb] rounded-[14px] text-[#025cca] [&_svg]:w-14 [&_svg]:h-14">
                        <QRMethodIcon />
                      </div>
                      <p className="text-[12px] text-center text-[#797b7c] px-2 leading-relaxed">
                        Bạn sẽ được chuyển đến cổng thanh toán VNPAY Sandbox để
                        hoàn tất giao dịch. Hệ thống sẽ tự động cập nhật trạng
                        thái hóa đơn sau khi thanh toán.
                      </p>
                      <p className="text-[13px] font-medium text-[#202325]">
                        Cần thu: {total.toLocaleString("vi-VN")} đ
                      </p>
                      {vnpayError && (
                        <p className="text-[12px] text-[#d92d20] text-center">
                          {vnpayError}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="rounded-[12px] border border-[#e8e8e8] bg-[#fafafa] p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold text-[#202325]">
                    Thao tác hóa đơn
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`kv-badge ${getLifecycleBadgeClass(invoice.status)}`}
                    >
                      {getLifecycleLabel(invoice.status)}
                    </span>
                    {invoice.paid && (
                      <span className="text-[12px] font-medium text-[#286b4a]">
                        Đã thanh toán
                      </span>
                    )}
                  </div>
                </div>
                {!isActiveInvoice ? (
                  <p className="text-[12px] text-[#636566]">
                    Hóa đơn lịch sử chỉ cho phép xem, in và gửi.
                  </p>
                ) : !invoice.paid ? (
                  <div className="flex gap-2">
                    <input
                      value={promotionCode}
                      onChange={(event) =>
                        onPromotionCodeChange(event.target.value.toUpperCase())
                      }
                      placeholder="Mã khuyến mãi"
                      className="flex-1 min-w-0 h-[38px] px-3 rounded-[10px] border border-[#e8e8e8] bg-white text-[13px] uppercase outline-none focus:border-[#025cca]"
                    />
                    <button
                      onClick={onApplyDiscount}
                      disabled={actionBusy || !promotionCode.trim()}
                      className="h-[38px] px-3.5 shrink-0 rounded-[10px] border border-[#025cca] bg-white text-[13px] font-medium text-[#025cca] transition-colors hover:bg-[#f0f8ff] disabled:opacity-50 disabled:hover:bg-white"
                    >
                      {action === "discount" ? "Đang áp dụng" : "Áp dụng mã"}
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#636566]">
                    Không thể áp dụng mã sau khi hóa đơn đã thanh toán
                  </p>
                )}
                {(splitVisible || mergeVisible) && (
                  <div className="grid grid-cols-2 gap-2">
                    {splitVisible && (
                      <button
                        type="button"
                        onClick={() => setSplitOpen(true)}
                        disabled={Boolean(splitDisabledReason)}
                        className={`h-[38px] rounded-[10px] border border-[#025cca] bg-white text-[13px] font-medium text-[#025cca] transition-colors hover:bg-[#f0f8ff] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white ${mergeVisible ? "" : "col-span-2"}`}
                      >
                        Chia hóa đơn
                      </button>
                    )}
                    {mergeVisible && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetMergeError();
                          setMergeOpen(true);
                        }}
                        disabled={actionBusy || processing || invoiceListLoading}
                        className={`h-[38px] rounded-[10px] bg-[#025cca] text-[13px] font-medium text-white transition-colors hover:bg-[#0250b0] disabled:cursor-not-allowed disabled:opacity-50 ${splitVisible ? "" : "col-span-2"}`}
                      >
                        Gộp hóa đơn
                      </button>
                    )}
                  </div>
                )}
                {splitVisible && splitDisabledReason && (
                  <p className="-mt-1 text-[11px] text-[#797b7c]">
                    {splitDisabledReason}
                  </p>
                )}
                {mergeVisible && (
                  <p className="-mt-1 text-[11px] text-[#797b7c]">
                    {eligibleMergeCount} hóa đơn đang đủ điều kiện sơ bộ.
                  </p>
                )}
                <div className="rounded-[10px] border border-[#e8e8e8] bg-white">
                  <button
                    type="button"
                    onClick={() => setCustomerOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-[#202325]">
                        Khách hàng
                      </span>
                      <span className="block truncate text-[11px] text-[#797b7c]">
                        {customer.name?.trim() || "Khách lẻ"}
                        {customerEmail ? ` · ${customerEmail}` : ""}
                      </span>
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-[#636566] transition-transform ${customerOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {customerOpen && (
                    <div className="flex flex-col gap-2 border-t border-[#e8e8e8] px-3 py-2.5">
                      <input
                        value={customerDraft.customerName}
                        onChange={(event) =>
                          setCustomerDraft((draft) => ({
                            ...draft,
                            customerName: event.target.value,
                          }))
                        }
                        placeholder="Tên khách hàng"
                        className="h-[36px] rounded-[8px] border border-[#e8e8e8] px-2.5 text-[13px] outline-none focus:border-[#025cca]"
                      />
                      <input
                        value={customerDraft.customerPhone}
                        onChange={(event) =>
                          setCustomerDraft((draft) => ({
                            ...draft,
                            customerPhone: event.target.value,
                          }))
                        }
                        placeholder="Số điện thoại"
                        inputMode="tel"
                        className="h-[36px] rounded-[8px] border border-[#e8e8e8] px-2.5 text-[13px] outline-none focus:border-[#025cca]"
                      />
                      <input
                        value={customerDraft.customerEmail}
                        onChange={(event) =>
                          setCustomerDraft((draft) => ({
                            ...draft,
                            customerEmail: event.target.value,
                          }))
                        }
                        placeholder="Email (để gửi hóa đơn)"
                        inputMode="email"
                        className="h-[36px] rounded-[8px] border border-[#e8e8e8] px-2.5 text-[13px] outline-none focus:border-[#025cca]"
                      />
                      {customerError && (
                        <p className="text-[11px] text-[#d92d20]">
                          {customerError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          void onSaveCustomer(customerDraft).then((saved) => {
                            if (saved) setCustomerOpen(false);
                          });
                        }}
                        disabled={customerSaving}
                        className="h-[36px] rounded-[8px] border border-[#025cca] bg-white text-[13px] font-medium text-[#025cca] transition-colors hover:bg-[#f0f8ff] disabled:opacity-50 disabled:hover:bg-white"
                      >
                        {customerSaving ? "Đang lưu..." : "Lưu thông tin khách"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onPrint}
                    className="h-[38px] rounded-[10px] border border-[#e8e8e8] bg-white text-[13px] font-medium text-[#202325] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
                  >
                    In hóa đơn
                  </button>
                  <button
                    onClick={onSend}
                    disabled={actionBusy || !hasCustomerEmail}
                    title={
                      hasCustomerEmail ? undefined : "Cần email khách hàng"
                    }
                    className="h-[38px] rounded-[10px] border border-[#cfe3fb] bg-[#f0f8ff] text-[13px] font-medium text-[#025cca] transition-colors hover:bg-[#e2f0ff] disabled:opacity-50"
                  >
                    {action === "send"
                      ? "Đang gửi"
                      : hasCustomerEmail
                        ? "Gửi hóa đơn"
                        : "Cần email khách hàng"}
                  </button>
                </div>
                {invoiceMessage && (
                  <p
                    className={`text-[12px] ${invoiceMessage.type === "success" ? "text-[#286b4a]" : "text-[#d92d20]"}`}
                  >
                    {invoiceMessage.text}
                  </p>
                )}
              </div>

              {!isActiveInvoice && (
                <div className="rounded-[10px] bg-[#f5f5f5] px-4 py-5 text-center text-[13px] text-[#636566]">
                  Hóa đơn {invoice.status} không thể thanh toán hoặc áp dụng khuyến mãi.
                </div>
              )}
            </div>

            {isActiveInvoice && (
              <div className="shrink-0 mt-3 pt-3 border-t border-[#e8e8e8]">
                {error && (
                  <p className="text-[13px] text-[#d92d20] text-center mb-2.5">
                    {error}
                  </p>
                )}
                {method === "CASH" && (
                  <button
                    onClick={() => onConfirmCash(receivedAmount)}
                    disabled={
                      processing ||
                      invoice.paid ||
                      !isActiveInvoice ||
                      actionBusy ||
                      !receivedAmountSufficient
                    }
                    className="w-full h-[50px] bg-[#025cca] rounded-[12px] text-[15px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-60 disabled:hover:bg-[#025cca]"
                  >
                    {confirmLabel}
                  </button>
                )}
                {method === "VNPAY" && (
                  <div className="w-full flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={onInitiateVnpay}
                      disabled={processing || actionBusy || vnpayLoading || invoice.paid}
                      className="w-full h-[50px] bg-[#025cca] rounded-[12px] text-[15px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-60 disabled:hover:bg-[#025cca]"
                    >
                      {vnpayLoading
                        ? "Đang xử lý..."
                        : invoice.paid
                          ? "Đã thanh toán"
                          : "Thanh toán qua VNPAY Sandbox"}
                    </button>
                    {/* Escape hatch for a transaction paid at VNPAY whose IPN never reached
                        this machine: asks VNPAY directly instead of trusting local state. */}
                    <button
                      type="button"
                      onClick={onCheckVnpayStatus}
                      disabled={processing || actionBusy || vnpayLoading || invoice.paid}
                      className="w-full h-[38px] rounded-[10px] border border-[#d1d5db] text-[13px] font-medium text-[#636566] transition-colors hover:bg-[#f5f5f5] disabled:opacity-60"
                    >
                      Kiểm tra trạng thái VNPAY
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
      {splitOpen && selectedInvoice && invoice && (
        <SplitInvoiceModal
          open={splitOpen}
          invoice={selectedInvoice}
          invoiceDetail={invoice}
          submitting={action === "split"}
          error={splitError}
          onClose={() => {
            if (action !== "split") setSplitOpen(false);
          }}
          onSubmit={(request) => {
            void onSplit(request).then((succeeded) => {
              if (succeeded) setSplitOpen(false);
            });
          }}
        />
      )}
      {mergeOpen && (
        <MergeInvoiceModal
          open={mergeOpen}
          orderId={invoice?.orderId ?? selectedInvoice?.orderId ?? ""}
          invoices={invoices}
          submitting={action === "merge"}
          error={mergeError}
          onClose={() => {
            if (action !== "merge") setMergeOpen(false);
          }}
          onSubmit={(request) =>
            onMerge(request).then((succeeded) => {
              if (succeeded) setMergeOpen(false);
              return succeeded;
            })
          }
        />
      )}
    </div>
  );
};
