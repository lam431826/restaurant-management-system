import { useState } from "react";
import type { ReactNode } from "react";
import type { InvoiceDetail } from "../../../services/invoiceApi";
import type { PaymentMethod } from "../../../services/paymentApi";
import type { TableItem } from "./types";
import { PAYMENT_METHOD_LABELS } from "./types";
import {
  ChevronDownIcon,
  CashMethodIcon,
  QRMethodIcon,
  DebitMethodIcon,
  XIcon,
  DeleteDigitIcon,
} from "./icons";

/* ─── Payment modal ──────────────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  { id: "CASH" as const, label: "Tiền mặt" },
  { id: "CARD" as const, label: "Thẻ" },
  { id: "QR" as const, label: "Mã QR" },
  { id: "E_WALLET" as const, label: "Ví điện tử" },
];

export const PaymentModal = ({
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
