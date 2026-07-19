import type { ReactNode } from "react";
import type { OrderItem, TableItem } from "./types";
import { COOKING_STATUS_LABEL } from "./types";
import { OrderItemRow } from "./OrderItemRow";
import { CheckIcon, ReceiptIcon } from "./icons";

/* ─── Order panel ────────────────────────────────────────────────────────── */
export const OrderPanel = ({
  items,
  hasSelectedMenu,
  onStatusChange,
  onCheckout,
  onCreateOrder,
  onAddItems,
  onNote,
  onRemoveItem,
  onRejectItem,
  onCancelOrder,
  selectedTable,
  invoiceTools,
  checkoutDisabled,
  checkoutLabel,
  shiftOpen,
  invoicePaid,
  itemMutationDisabled,
  itemMutationDisabledMessage,
  orderActionMessage,
  emptyOrderMessage,
  cancelOrderIds,
  onCloseOrder,
}: {
  items: OrderItem[];
  hasSelectedMenu: boolean;
  onStatusChange: (
    orderId: string,
    orderItemId: string,
    status: string,
  ) => void;
  onCheckout: () => void;
  onCreateOrder: () => void;
  onAddItems: () => void;
  onNote: (id: string, text: string) => void;
  onRemoveItem: (orderId: string, orderItemId: string) => void;
  onRejectItem?: (orderId: string, orderItemId: string) => void;
  onCancelOrder: (orderIds: string[]) => void;
  selectedTable: TableItem | null;
  invoiceTools: ReactNode;
  checkoutDisabled: boolean;
  checkoutLabel: string;
  shiftOpen?: boolean;
  invoicePaid?: boolean;
  itemMutationDisabled?: boolean;
  itemMutationDisabledMessage?: string;
  orderActionMessage?: { type: "error"; text: string } | null;
  emptyOrderMessage?: string;
  cancelOrderIds?: string[];
  onCloseOrder?: () => void;
}) => {
  // Driven by whether an Order row actually exists — not selectedTable.occupied, which flips to
  // true the moment a reservation is checked in (table.status → OCCUPIED) even though no Order
  // has been created yet. Keying off orderId keeps the "Tạo Order" button reachable in that gap.
  const isTableEmpty = !!selectedTable && !selectedTable.orderId;
  const hasItems = items.length > 0;
  const reservationInfo = selectedTable?.upcomingReservation ?? null;
  const billableOrderItems = items.filter(
    (item) => item.status !== COOKING_STATUS_LABEL.REJECTED,
  );
  const visibleActionMessage = orderActionMessage?.text ?? emptyOrderMessage;
  const cancellableOrderIds = Array.from(
    new Set([
      ...(cancelOrderIds ?? []),
      ...items.map((i) => i.orderId).filter((id) => id && id !== "cart"),
    ]),
  );
  const canCancelOrder = !invoicePaid && cancellableOrderIds.length > 0;
  const subtotal = billableOrderItems.length
    ? billableOrderItems.reduce((s, i) => s + i.price * i.qty, 0)
    : 0;

  return (
    <div className="bg-white rounded-[12px] flex flex-col p-4 lg:p-6 w-[260px] md:w-[300px] lg:w-[360px] xl:w-[400px] shrink-0 h-full overflow-hidden">
      <div className="flex items-start justify-between shrink-0 mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-medium text-[#202325]">
            {reservationInfo
              ? reservationInfo.guestName
              : isTableEmpty
                ? "Customer Name"
                : "Walk-in Customer"}
          </span>
          <span className="text-[14px] text-[#636566]">
            {selectedTable ? selectedTable.name : "–"}
            {reservationInfo ? ` · ${reservationInfo.partySize} người` : ""}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isTableEmpty ? (
            <>
              <div className="bg-[#dcf7ea] flex items-center gap-1 px-2 py-1 rounded-[8px]">
                <CheckIcon />
                <span className="text-[12px] font-medium text-[#286b4a]">
                  Ready
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#48c185]" />
                <span className="text-[12px] text-[#636566]">
                  Ready to serve
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#f5f5f5] flex items-center gap-1 px-2 py-1 rounded-[8px]">
                <ReceiptIcon />
                <span className="text-[12px] font-medium text-[#202325]">
                  Thanh toán
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#202325]" />
                <span className="text-[12px] text-[#636566]">
                  Đợi thanh toán
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-[16px] font-semibold text-[#202325] shrink-0 mb-3">
        Chi tiết đơn hàng
      </p>
      <div className="h-px bg-[#e8e8e8] shrink-0 mb-3" />

      <div className="flex-1 overflow-y-auto min-h-0">
        {hasItems &&
          items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              onStatusChange={onStatusChange}
              onNote={onNote}
              onRemoveItem={onRemoveItem}
              onRejectItem={onRejectItem}
              itemMutationDisabled={itemMutationDisabled}
              itemMutationDisabledMessage={itemMutationDisabledMessage}
            />
          ))}
        {!isTableEmpty && invoiceTools}
      </div>

      <div className="shrink-0 mt-4 flex flex-col gap-3">
        <div className="h-px bg-[#e8e8e8]" />
        <div className="flex justify-between text-[14px]">
          <span className="font-medium text-[#636566]">
            Số món
          </span>
          <span className="font-semibold text-[#202325]">
            {billableOrderItems.length} món
          </span>
        </div>
        <div className="h-px bg-[#202325]" />
        <div className="flex justify-between text-[20px]">
          <span className="font-medium text-[#202325]">Tạm tính</span>
          <span className="font-semibold text-[#202325]">
            {subtotal ? `${subtotal.toLocaleString("vi-VN")} đ` : "0 đ"}
          </span>
        </div>
        {isTableEmpty ? (
          <button
            onClick={onCreateOrder}
            disabled={!shiftOpen}
            className="bg-[#025cca] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[16px] font-medium text-white">
              {hasSelectedMenu ? "Xác nhận Tạo Order" : "Tạo Order"}
            </span>
          </button>
        ) : hasSelectedMenu ? (
          <div className="flex flex-col gap-2 mt-1">
            {visibleActionMessage && (
              <div className="px-3 py-2 rounded-[10px] bg-[#fff0f0] text-[#d92d20] text-[12px] leading-5">
                {visibleActionMessage}
              </div>
            )}
            {itemMutationDisabled && itemMutationDisabledMessage && (
              <div className="px-3 py-2 rounded-[10px] bg-[#fff0f0] text-[#d92d20] text-[12px] leading-5">
                {itemMutationDisabledMessage}
              </div>
            )}
          <button
            onClick={onAddItems}
            disabled={!shiftOpen || itemMutationDisabled}
            title={
              itemMutationDisabled ? itemMutationDisabledMessage : undefined
            }
            className="bg-[#e85d04] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#dc2f02] transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[16px] font-medium text-white">
              Thêm món vào Đơn
            </span>
          </button>
          {canCancelOrder && (
            <button
              onClick={() => onCancelOrder(cancellableOrderIds)}
              className="bg-transparent border border-[#dc2f02] flex items-center justify-center h-[40px] rounded-[12px] w-full hover:bg-[#dc2f02] hover:text-white text-[#dc2f02] transition-colors"
            >
              <span className="text-[14px] font-medium">Hủy đơn hàng</span>
            </button>
          )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-1">
            {visibleActionMessage && (
              <div className="px-3 py-2 rounded-[10px] bg-[#fff0f0] text-[#d92d20] text-[12px] leading-5">
                {visibleActionMessage}
              </div>
            )}
            {invoicePaid ? (
              <button
                onClick={onCloseOrder}
                className="bg-[#286b4a] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#1a4a32] transition-colors"
              >
                <span className="text-[16px] font-medium text-white">
                  Đóng đơn & Dọn bàn
                </span>
              </button>
            ) : (
              <button
                onClick={onCheckout}
                disabled={checkoutDisabled}
                className="bg-[#025cca] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-[16px] font-medium text-white">
                  {checkoutLabel}
                </span>
              </button>
            )}
            {canCancelOrder && (
              <button
                onClick={() => onCancelOrder(cancellableOrderIds)}
                className="bg-transparent border border-[#dc2f02] flex items-center justify-center h-[40px] rounded-[12px] w-full hover:bg-[#dc2f02] hover:text-white text-[#dc2f02] transition-colors"
              >
                <span className="text-[14px] font-medium">Hủy đơn hàng</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
