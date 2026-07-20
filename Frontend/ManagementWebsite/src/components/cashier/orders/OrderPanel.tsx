import { useState } from "react";
import type { ReactNode } from "react";
import type { OrderItem, TableItem } from "./types";
import { COOKING_STATUS_LABEL } from "./types";
import { OrderItemRow } from "./OrderItemRow";
import { CheckIcon, ChevronDownIcon, ReceiptIcon } from "./icons";

export interface OrderCustomerDraft {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

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
  createOrderSubmitting,
  emptyOrderMessage,
  cancelOrderIds,
  onCloseOrder,
  customer,
  onCustomerChange,
  onSaveCustomer,
  customerSaving,
  customerError,
  orderExists,
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
  createOrderSubmitting?: boolean;
  emptyOrderMessage?: string;
  cancelOrderIds?: string[];
  onCloseOrder?: () => void;
  // Customer contact. Before the order exists this is a local draft; afterwards it is
  // the saved Order record that the receipt, payment modal and send-invoice all read.
  customer: OrderCustomerDraft;
  onCustomerChange: (customer: OrderCustomerDraft) => void;
  onSaveCustomer: () => void;
  customerSaving?: boolean;
  customerError?: string;
  orderExists: boolean;
}) => {
  const [customerOpen, setCustomerOpen] = useState(false);
  const isTableEmpty = !!selectedTable && !selectedTable.occupied;
  const hasItems = items.length > 0;
  const customerDisplayName = customer.customerName.trim() || "Khách lẻ";
  // Driven by whether an Order row actually exists — not selectedTable.occupied, which flips to
  // true the moment a reservation is checked in (table.status → OCCUPIED) even though no Order
  // has been created yet. Keying off orderId keeps the "Tạo Order" button reachable in that gap.
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

      <div className="shrink-0 mb-3 rounded-[10px] border border-[#e8e8e8] bg-white">
        <button
          type="button"
          onClick={() => setCustomerOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-[#202325]">
              Thông tin khách hàng
            </span>
            <span className="block truncate text-[11px] text-[#797b7c]">
              {customerDisplayName}
              {customer.customerEmail.trim()
                ? ` · ${customer.customerEmail.trim()}`
                : ""}
            </span>
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 shrink-0 text-[#636566] transition-transform ${customerOpen ? "rotate-180" : ""}`}
          />
        </button>
        {customerOpen && (
          <div className="flex flex-col gap-2 border-t border-[#e8e8e8] px-3 py-2.5">
            <input
              value={customer.customerName}
              onChange={(event) =>
                onCustomerChange({
                  ...customer,
                  customerName: event.target.value,
                })
              }
              placeholder="Tên khách hàng"
              className="h-[34px] rounded-[8px] border border-[#e8e8e8] px-2.5 text-[12px] outline-none focus:border-[#025cca]"
            />
            <input
              value={customer.customerPhone}
              onChange={(event) =>
                onCustomerChange({
                  ...customer,
                  customerPhone: event.target.value,
                })
              }
              placeholder="Số điện thoại"
              inputMode="tel"
              className="h-[34px] rounded-[8px] border border-[#e8e8e8] px-2.5 text-[12px] outline-none focus:border-[#025cca]"
            />
            <input
              value={customer.customerEmail}
              onChange={(event) =>
                onCustomerChange({
                  ...customer,
                  customerEmail: event.target.value,
                })
              }
              placeholder="Email (để gửi hóa đơn)"
              inputMode="email"
              className="h-[34px] rounded-[8px] border border-[#e8e8e8] px-2.5 text-[12px] outline-none focus:border-[#025cca]"
            />
            {customerError && (
              <p className="text-[11px] text-[#d92d20]">{customerError}</p>
            )}
            {orderExists ? (
              <button
                type="button"
                onClick={onSaveCustomer}
                disabled={customerSaving}
                className="h-[34px] rounded-[8px] border border-[#025cca] bg-white text-[12px] font-medium text-[#025cca] disabled:opacity-50"
              >
                {customerSaving ? "Đang lưu..." : "Lưu thông tin khách"}
              </button>
            ) : (
              <p className="text-[11px] text-[#797b7c]">
                Thông tin sẽ được lưu cùng đơn hàng khi tạo đơn.
              </p>
            )}
          </div>
        )}
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
          <span className="font-medium text-[#636566]">Số món</span>
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
          <div className="flex flex-col gap-2 mt-1">
            {visibleActionMessage && (
              <div
                className="px-3 py-2 rounded-[10px] bg-[#fff0f0] text-[#d92d20] text-[12px] leading-5"
                role="alert"
              >
                {visibleActionMessage}
              </div>
            )}
            <button
              onClick={onCreateOrder}
              disabled={
                !shiftOpen ||
                createOrderSubmitting ||
                selectedTable.status !== "AVAILABLE" ||
                Boolean(selectedTable.orderId)
              }
              className="bg-[#025cca] flex items-center justify-center h-[52px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-[16px] font-medium text-white">
                {createOrderSubmitting
                  ? "Đang tạo Order..."
                  : hasSelectedMenu
                    ? "Xác nhận Tạo Order"
                    : "Tạo Order"}
              </span>
            </button>
          </div>
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
