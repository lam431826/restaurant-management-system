import type { InvoiceDetail, InvoiceSummary } from "../../../services/invoiceApi";

/* ─── Invoice / payment panel ────────────────────────────────────────────── */
export const CashierInvoicePanel = ({
  hasSelectedOrder,
  invoiceChecked,
  invoice,
  detail,
  loading,
  action,
  message,
  onGenerate,
}: {
  hasSelectedOrder: boolean;
  invoiceChecked: boolean;
  invoice: InvoiceSummary | null;
  detail: InvoiceDetail | null;
  loading: boolean;
  action: string | null;
  message: { type: "success" | "error"; text: string } | null;
  onGenerate: () => void;
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
            Theo đơn hàng đang chọn
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

      {!hasSelectedOrder && (
        <div className="px-3 py-2 rounded-[10px] bg-[#f5f5f5] text-[12px] text-[#636566]">
          Chọn bàn có đơn hàng để xem hóa đơn
        </div>
      )}

      {message && (
        <div
          className={`px-3 py-2 rounded-[10px] text-[12px] ${message.type === "success" ? "bg-[#dcf7ea] text-[#286b4a]" : "bg-[#fff0f0] text-[#d92d20]"}`}
        >
          {message.text}
        </div>
      )}

      {hasSelectedOrder && invoiceChecked && !invoice && !loading && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] bg-[#f5f5f5]">
          <span className="text-[12px] text-[#636566]">Chưa có hóa đơn</span>
          <button
            onClick={onGenerate}
            disabled={busy || !hasSelectedOrder}
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

        </>
      )}
    </div>
  );
};
