import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  InvoiceDetail,
  InvoiceSummary,
  MergeInvoiceRequest,
  SplitInvoiceRequest,
} from "../../../services/invoiceApi";
import type { Payment, SelectablePaymentMethod } from "../../../services/paymentApi";
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

/* ─── Payment modal ──────────────────────────────────────────────────────── */
interface NonPayableReceiptItem {
  id: string;
  name: string;
  quantity: number;
  note?: string | null;
}

// Only CASH and QR are supported; CARD/E_WALLET are intentionally not offered.
const PAYMENT_METHODS = [
  { id: "CASH" as const, label: "Tiền mặt" },
  { id: "QR" as const, label: "Mã QR" },
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
  qrPayment,
  qrLoading,
  qrError,
  onClose,
  onSelectInvoice,
  onRefreshInvoices,
  onConfirmCash,
  onInitiateQr,
  onSimulateQrSuccess,
  onCancelQr,
  onResetQrState,
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
  // Current simulated QR transaction for the selected invoice, if any.
  qrPayment: Payment | null;
  qrLoading: boolean;
  qrError: string;
  onClose: () => void;
  onSelectInvoice: (invoiceId: string) => void;
  onRefreshInvoices: () => void;
  onConfirmCash: (receivedAmount: number) => void;
  onInitiateQr: () => void;
  onSimulateQrSuccess: () => void;
  onCancelQr: () => void;
  onResetQrState: () => void;
  onPromotionCodeChange: (value: string) => void;
  onApplyDiscount: () => void;
  onPrint: () => void;
  onSend: () => void;
  onSplit: (request: SplitInvoiceRequest) => Promise<boolean>;
  onMerge: (request: MergeInvoiceRequest) => Promise<boolean>;
  onResetMergeError: () => void;
}) => {
  const [method, setMethod] = useState<SelectablePaymentMethod>("CASH");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [splitOpen, setSplitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  useEffect(() => {
    setSplitOpen(false);
    setMergeOpen(false);
    setDropdownOpen(false);
    setCashInput("");
    setMethod("CASH");
    onResetQrState();
    // onResetQrState is stable from the parent (useState setter); omitting it from
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
    QR: <QRMethodIcon />,
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
    if (invoice.items.length < 2) return "Cần ít nhất hai món để chia hóa đơn.";
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
        className="relative bg-white rounded-[16px] p-6 flex flex-col gap-2.5 overflow-hidden w-[95vw] max-w-[711px] max-h-[calc(100vh-32px)]"
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ height: 44 }}
        >
          <p className="text-[24px] font-semibold text-[#202325]">Thanh toán</p>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center text-[#202325] hover:bg-[#e8e8e8] transition-colors"
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
                    {candidate.id.slice(0, 8)} · {candidate.status} ·{" "}
                    {candidate.paid ? "Đã thanh toán" : "Chưa thanh toán"} ·{" "}
                    {candidate.totalAmount.toLocaleString("vi-VN")} đ
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
        <div className="flex gap-6 lg:gap-10 items-stretch flex-1 min-h-0 overflow-hidden">
          {/* Receipt */}
          <div
            className="hidden lg:flex w-[300px] min-h-0 bg-[#fcf7ef] overflow-y-auto flex-col gap-3 px-4 py-8 shrink-0"
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
              <p className="text-[10px] tracking-widest text-black">Mã đơn hàng</p>
              <p className="text-[14px] font-bold tracking-wider text-black break-all">
                {invoice.orderId}
              </p>
            </div>
            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Thu ngân</span>
                <span className="text-black">Duy Tan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6d7278]">Ca làm</span>
                <span className="text-black">09.00 - 12.00 AM</span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-3 text-[10px]">
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Khách hàng</span>
                <span className="text-black">Nguyen Van A</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Mã thành viên</span>
                <span className="text-black">-</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Hình thức</span>
                <span className="text-black">Tại bàn</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6d7278] shrink-0">Số bàn</span>
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
            {nonPayableItems.length > 0 && (
              <>
                <div className="border-t border-dashed border-[#b0a080]" />
                <div className="flex flex-col gap-3 text-[10px]">
                  <p className="text-black font-bold">
                    Món đã hủy bởi nhà hàng
                  </p>
                  {nonPayableItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#6d7278] flex-1 truncate">
                          {item.name}
                        </span>
                        <span className="text-[#6d7278] shrink-0">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#6d7278]">
                          Không tính tiền
                        </span>
                        <span className="text-black font-bold">0đ</span>
                      </div>
                      <p className="text-[#6d7278] leading-snug">
                        Ghi chú: {item.note?.trim() || nonPayableFallbackNote}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="border-t border-dashed border-[#b0a080]" />
            <div className="flex flex-col gap-3 text-[10px]">
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
            <div className="flex justify-between text-[14px] font-bold text-[#a27b5c]">
              <span>Tổng thanh toán</span>
              <span>{total.toLocaleString("vi-VN")}đ</span>
            </div>
            <p className="text-[8px] text-black leading-relaxed">
              Cảm ơn quý khách. Hẹn gặp lại!
            </p>
            <p className="text-[#3f4e4f] text-[24px] font-medium text-center">
              Wasabi Sushi
            </p>
          </div>

          {/* Payment panel */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="relative flex flex-col gap-3 shrink-0">
              <div className="rounded-[12px] border border-[#e8e8e8] bg-[#f5f5f5] p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-[#202325]">
                    Thao tác hóa đơn
                  </p>
                  <span className="text-[11px] font-medium text-[#636566]">
                    {invoice.status}
                  </span>
                  {invoice.paid && (
                    <span className="text-[12px] font-medium text-[#286b4a]">
                      Đã thanh toán
                    </span>
                  )}
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
                      className="flex-1 min-w-0 h-[36px] px-3 rounded-[10px] border border-[#e8e8e8] bg-white text-[12px] uppercase outline-none focus:border-[#025cca]"
                    />
                    <button
                      onClick={onApplyDiscount}
                      disabled={actionBusy || !promotionCode.trim()}
                      className="h-[36px] px-3 rounded-[10px] border border-[#025cca] bg-white text-[12px] font-medium text-[#025cca] disabled:opacity-50"
                    >
                      {action === "discount" ? "Đang áp dụng" : "Áp dụng mã"}
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#636566]">
                    Không thể áp dụng mã sau khi hóa đơn đã thanh toán
                  </p>
                )}
                {splitVisible && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSplitOpen(true)}
                      disabled={Boolean(splitDisabledReason)}
                      className="h-[36px] w-full rounded-[10px] border border-[#025cca] bg-white text-[12px] font-medium text-[#025cca] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Chia hóa đơn
                    </button>
                    {splitDisabledReason && (
                      <p className="mt-1 text-[11px] text-[#797b7c]">
                        {splitDisabledReason}
                      </p>
                    )}
                  </div>
                )}
                {mergeVisible && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        onResetMergeError();
                        setMergeOpen(true);
                      }}
                      disabled={actionBusy || processing || invoiceListLoading}
                      className="h-[36px] w-full rounded-[10px] border border-[#025cca] bg-[#025cca] text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Gộp hóa đơn
                    </button>
                    <p className="mt-1 text-[11px] text-[#797b7c]">
                      {eligibleMergeCount} hóa đơn đang đủ điều kiện sơ bộ.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onPrint}
                    className="h-[36px] rounded-[10px] bg-white text-[12px] font-medium text-[#202325] disabled:opacity-50"
                  >
                    In hóa đơn
                  </button>
                  <button
                    onClick={onSend}
                    disabled={actionBusy}
                    className="h-[36px] rounded-[10px] bg-[#f0f8ff] text-[12px] font-medium text-[#025cca] disabled:opacity-50"
                  >
                    {action === "send" ? "Đang gửi" : "Gửi hóa đơn"}
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

              <p className={`text-[16px] font-semibold text-[#202325] ${!isActiveInvoice ? "hidden" : ""}`}>
                Chọn phương thức thanh toán
              </p>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className={`items-center justify-between px-2 py-3 rounded-[12px] border transition-colors ${isActiveInvoice ? "flex" : "hidden"} ${dropdownOpen ? "border-[#025cca] bg-white" : "border-[#e8e8e8] bg-[#f5f5f5]"}`}
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
              {isActiveInvoice && dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e8e8e8] rounded-[12px] shadow-md z-10 flex flex-col gap-1 px-2 py-3">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => {
                        setMethod(pm.id);
                        setDropdownOpen(false);
                        if (pm.id === "QR" && !qrPayment) onInitiateQr();
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

            <div className={`flex-1 min-h-0 overflow-y-auto mt-6 pr-1 ${!isActiveInvoice ? "hidden" : ""}`}>
              {method === "CASH" && (
                <div className="flex flex-col items-center gap-5 pb-2">
                  <div className="flex flex-col items-center gap-2 py-2">
                    <p className="text-[13px] font-medium text-[#636566]">
                      Tiền khách đưa
                    </p>
                    <p className="text-[40px] font-medium leading-none text-[#202325] text-center">
                      {displayAmount}
                    </p>
                    <p className="text-[12px] text-[#797b7c]">
                      Cần thanh toán: {total.toLocaleString("vi-VN")} đ
                    </p>
                    <p
                      className={`text-[13px] font-medium ${receivedAmountSufficient ? "text-[#286b4a]" : "text-[#797b7c]"}`}
                    >
                      Tiền thối lại: {changeAmount.toLocaleString("vi-VN")} đ
                    </p>
                  </div>
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
                        className={`h-11 flex items-center justify-center rounded-[8px] active:scale-95 transition-all ${key === "." ? "opacity-30 cursor-default" : "hover:bg-[#f5f5f5]"}`}
                      >
                        {key === "del" ? (
                          <DeleteDigitIcon />
                        ) : (
                          <span
                            className={`text-[24px] text-[#202325] ${key === "." ? "font-normal" : "font-medium"}`}
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
                  <div className="w-[160px] h-[160px] bg-white overflow-hidden flex items-center justify-center shrink-0 border border-dashed border-[#d9d9d9] rounded-[12px]">
                    <img
                      src="/images/qr-code.png"
                      alt="QR mô phỏng"
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                  <p className="text-[11px] text-center text-[#a2a4a4] px-4 -mt-2">
                    Đây là cổng thanh toán QR mô phỏng (không kết nối ngân hàng
                    thật). Dùng để giả lập callback từ hệ thống thanh toán bên
                    ngoài.
                  </p>

                  {qrLoading && (
                    <p className="text-[13px] text-[#636566]">
                      Đang tạo giao dịch QR...
                    </p>
                  )}

                  {!qrLoading && qrError && (
                    <div className="w-full flex flex-col items-center gap-2">
                      <p className="text-[13px] text-[#d92d20] text-center">
                        {qrError}
                      </p>
                      <button
                        type="button"
                        onClick={onInitiateQr}
                        className="h-9 px-4 rounded-[8px] border border-[#025cca] text-[13px] font-medium text-[#025cca]"
                      >
                        Thử tạo lại giao dịch QR
                      </button>
                    </div>
                  )}

                  {!qrLoading && !qrError && qrPayment && (
                    <div className="w-full border-t border-[#e8e8e8] px-3 pt-4 flex flex-col gap-2 items-center">
                      <p className="text-[14px] text-[#636566]">
                        <span className="text-[#a2a4a4]">Số tiền:</span>{" "}
                        <span className="text-[#202325] font-medium">
                          {qrPayment.amount.toLocaleString("vi-VN")} đ
                        </span>
                      </p>
                      <p className="text-[14px] text-[#636566] break-all text-center">
                        <span className="text-[#a2a4a4]">Mã giao dịch:</span>{" "}
                        <span className="text-[#202325] font-medium">
                          {qrPayment.gatewayRef ?? "—"}
                        </span>
                      </p>
                      <span
                        className={`kv-badge ${qrPayment.status === "PAID" ? "kv-badge-success" : "kv-badge-warning"}`}
                      >
                        {qrPayment.status === "PAID"
                          ? "Đã thanh toán"
                          : "Đang chờ thanh toán"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`shrink-0 mt-5 pt-4 border-t border-[#e8e8e8] ${!isActiveInvoice ? "hidden" : ""}`}>
              {error && (
                <p className="text-[13px] text-[#d92d20] text-center mb-3">
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
                  className="w-full h-[52px] bg-[#025cca] rounded-[12px] text-[16px] font-semibold text-white hover:bg-[#0250b0] transition-colors disabled:opacity-60"
                >
                  {confirmLabel}
                </button>
              )}
              {method === "QR" &&
                !qrLoading &&
                !qrError &&
                qrPayment &&
                qrPayment.status === "PENDING" && (
                  <div className="w-full flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={onSimulateQrSuccess}
                      disabled={processing || actionBusy}
                      className="w-full h-[44px] bg-[#025cca] rounded-[10px] text-[14px] font-semibold text-white disabled:opacity-60"
                    >
                      {processing
                        ? "Đang xác nhận..."
                        : "Giả lập thanh toán thành công"}
                    </button>
                    <button
                      type="button"
                      onClick={onCancelQr}
                      disabled={processing || actionBusy}
                      className="w-full h-[38px] rounded-[10px] border border-[#d1d5db] text-[13px] text-[#636566] disabled:opacity-60"
                    >
                      Hủy giao dịch QR
                    </button>
                  </div>
                )}
            </div>
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
