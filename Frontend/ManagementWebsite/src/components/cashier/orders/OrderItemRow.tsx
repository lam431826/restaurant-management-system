import type { OrderItem } from "./types";
import { STATUS_OPTIONS } from "./types";
import { TrashIcon, NoteIcon, ChevronDownIcon } from "./icons";

/* ─── Order item row ─────────────────────────────────────────────────────── */
export const OrderItemRow = ({
  item,
  onStatusChange,
  onNote,
  onRemoveItem,
}: {
  item: OrderItem;
  onStatusChange: (orderId: string, orderItemId: string, status: string) => void;
  onNote: (id: string, text: string) => void;
  onRemoveItem: (orderId: string, orderItemId: string) => void;
}) => (
  <div className="flex flex-col gap-3 py-2 border-b border-[#e8e8e8]">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-medium text-[#202325]">
            {item.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-medium text-[#202325] shrink-0">
              x{item.qty}
            </span>
            <button
              onClick={() => onRemoveItem(item.orderId, item.id)}
              className="text-[#dc2f02] hover:text-[#9d0208] transition-colors p-1"
              title="Xóa món"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        {item.notes && (
          <p className="text-[12px] text-[#636566] mt-1">{item.notes}</p>
        )}
      </div>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNote(item.id, item.notes || "")}
          className="bg-[#f0f8ff] flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full hover:bg-[#dceefe] transition-colors"
        >
          <NoteIcon />
          <span className="text-[12px] font-medium text-[#025cca]">
            Ghi chú
          </span>
        </button>
        <div className="relative">
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item.orderId, item.id, e.target.value)}
            className={`appearance-none border rounded-[12px] text-[10px] font-medium pl-3 pr-6 py-1 outline-none cursor-pointer ${
              item.status === "Chờ duyệt"
                ? "bg-[#ffedd5] text-[#f97316] border-[#f97316]"
                : "bg-white text-[#202325] border-[#e8e8e8]"
            }`}
          >
            <option value="Chờ duyệt" hidden={item.status !== "Chờ duyệt"}>
              Chờ duyệt
            </option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#636566] pointer-events-none" />
        </div>
      </div>
      <span className="text-[16px] font-semibold text-[#202325]">
        {item.price.toLocaleString("vi-VN")}đ
      </span>
    </div>
  </div>
);
