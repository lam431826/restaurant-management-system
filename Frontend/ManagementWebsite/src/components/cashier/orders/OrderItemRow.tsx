import type { OrderItem } from "./types";
import {
  COOKING_STATUS_LABEL,
  DRAFT_ITEM_STATUS,
  getAllowedNextStatusLabels,
} from "./types";
import { TrashIcon, NoteIcon, ChevronDownIcon } from "./icons";

/* ─── Order item row ─────────────────────────────────────────────────────── */
export const OrderItemRow = ({
  item,
  onStatusChange,
  onNote,
  onRemoveItem,
  onRejectItem,
  itemMutationDisabled,
  itemMutationDisabledMessage,
}: {
  item: OrderItem;
  onStatusChange: (orderId: string, orderItemId: string, status: string) => void;
  onNote: (id: string, text: string) => void;
  onRemoveItem: (orderId: string, orderItemId: string) => void;
  onRejectItem?: (orderId: string, orderItemId: string) => void;
  itemMutationDisabled?: boolean;
  itemMutationDisabledMessage?: string;
}) => {
  const isDraftItem = item.orderId === "cart" || item.status === DRAFT_ITEM_STATUS;
  const isPendingItem = item.status === COOKING_STATUS_LABEL.PENDING;
  const isCookingItem = item.status === COOKING_STATUS_LABEL.COOKING;
  const isRejectedItem = item.status === COOKING_STATUS_LABEL.REJECTED;
  const mutationLocked = !!itemMutationDisabled;
  const allowedNextStatuses = !isDraftItem && !mutationLocked
    ? getAllowedNextStatusLabels(item.status)
    : [];
  const canRemoveItem = isDraftItem || (!mutationLocked && isPendingItem);
  const canEditNote = isDraftItem || (!mutationLocked && isPendingItem);
  const canCancelItem = !isDraftItem && !mutationLocked && isCookingItem && !!onRejectItem;
  const canChangeStatus = allowedNextStatuses.length > 0;

  const statusClassName = isPendingItem
    ? "bg-[#ffedd5] text-[#f97316] border-[#f97316]"
    : "bg-white text-[#202325] border-[#e8e8e8]";

  return (
    <div className={`flex flex-col gap-3 py-2 border-b border-[#e8e8e8] ${isRejectedItem ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-[16px] font-medium ${isRejectedItem ? "text-[#dc2f02] line-through" : "text-[#202325]"}`}>
              {item.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-medium text-[#202325] shrink-0">
                x{item.qty}
              </span>
              {canRemoveItem && (
                <button
                  onClick={() => onRemoveItem(item.orderId, item.id)}
                  className="text-[#dc2f02] hover:text-[#9d0208] transition-colors p-1"
                  title="Xóa món"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </div>
          {item.notes && (
            <p className="text-[12px] text-[#636566] mt-1">{item.notes}</p>
          )}
          {item.rejectionNote && (
            <p className="text-[12px] text-[#dc2f02] mt-1 italic">Lý do hủy: {item.rejectionNote}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canEditNote && (
            <button
              onClick={() => onNote(item.id, item.notes || "")}
              className="bg-[#f0f8ff] flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full hover:bg-[#dceefe] transition-colors"
            >
              <NoteIcon />
              <span className="text-[12px] font-medium text-[#025cca]">
                Ghi chú
              </span>
            </button>
          )}
          {canCancelItem && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Xác nhận hủy món đang nấu? Chỉ thực hiện khi bếp báo món không thể phục vụ.",
                  )
                ) {
                  onRejectItem?.(item.orderId, item.id);
                }
              }}
              className="bg-[#fff0f0] flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full hover:bg-[#ffe0e0] transition-colors"
            >
              <span className="text-[12px] font-medium text-[#dc2f02]">
                Hủy món
              </span>
            </button>
          )}
          {canChangeStatus ? (
            <div className="relative">
              <select
                value={item.status}
                onChange={(e) => onStatusChange(item.orderId, item.id, e.target.value)}
                className={`appearance-none border rounded-[12px] text-[10px] font-medium pl-3 pr-6 py-1 outline-none cursor-pointer ${statusClassName}`}
              >
                <option value={item.status} hidden>
                  {item.status}
                </option>
                {allowedNextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#636566] pointer-events-none" />
            </div>
          ) : (
            <span
              title={mutationLocked ? itemMutationDisabledMessage : undefined}
              className={`border rounded-[12px] text-[10px] font-medium px-3 py-1 ${statusClassName}`}
            >
              {item.status}
            </span>
          )}
        </div>
        <span className="text-[16px] font-semibold text-[#202325]">
          {item.price.toLocaleString("vi-VN")}đ
        </span>
      </div>
    </div>
  );
};
