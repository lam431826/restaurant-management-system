import { useState } from "react";

/* ─── Add note modal ─────────────────────────────────────────────────────── */
export const AddNoteModal = ({
  itemId,
  initialText,
  onConfirm,
  onCancel,
  title = "Ghi chú món",
}: {
  itemId: string;
  initialText: string;
  onConfirm: (id: string, text: string) => void;
  onCancel: () => void;
  title?: string;
}) => {
  const [text, setText] = useState(initialText);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      <div className="relative bg-white rounded-[12px] p-6 w-[431px] flex flex-col gap-5 items-center shadow-xl">
        <div className="flex items-center w-full">
          <p className="text-[24px] font-semibold text-[#202325] leading-[1.5]">
            {title}
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="Nhập ghi chú..."
          rows={3}
          className="w-full bg-white border border-[#024eab] rounded-[12px] px-4 py-3 text-[14px] text-[#202325] placeholder-[#797b7c] outline-none resize-none leading-[1.5]"
          style={{ minHeight: 99 }}
        />
        <div className="flex gap-2 w-full">
          <button
            onClick={onCancel}
            className="flex-1 h-[52px] bg-[#f5f5f5] rounded-[12px] text-[16px] font-medium text-[#202325] hover:bg-[#e8e8e8] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(itemId, text)}
            className="flex-1 h-[52px] bg-[#025cca] rounded-[12px] text-[16px] font-semibold text-white hover:bg-[#0250b0] transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};
