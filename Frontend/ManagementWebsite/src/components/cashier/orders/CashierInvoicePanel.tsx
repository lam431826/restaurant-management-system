import type { InvoiceDetail, InvoiceSummary } from "../../../services/invoiceApi";
import type { Payment } from "../../../services/paymentApi";
import { PAYMENT_METHOD_LABELS } from "./types";
import { formatDateTime } from "./printInvoice";

/* ─── Invoice / payment panel ────────────────────────────────────────────── */
export const CashierInvoicePanel = ({
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
            Tra cứu theo mã đơn hàng backend
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
          placeholder="Mã đơn hàng backend"
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
