import { CheckIcon, XIcon } from "./icons";

/* ─── Success toast ──────────────────────────────────────────────────────── */
export const SuccessToast = ({
  total,
  onDismiss,
}: {
  total: number;
  onDismiss: () => void;
}) => (
  <div
    className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#dcf7ea] border border-[#48c185] rounded-[16px] px-5 py-4 shadow-lg"
    style={{ minWidth: 360 }}
  >
    <div className="w-9 h-9 bg-[#48c185] rounded-full flex items-center justify-center shrink-0">
      <CheckIcon />
    </div>
    <div className="flex flex-col flex-1">
      <p className="text-[16px] font-semibold text-[#286b4a] leading-[1.5]">
        Thanh toán thành công!
      </p>
      <p className="text-[14px] text-[#286b4a] leading-[1.5]">
        Tổng: {total.toLocaleString("vi-VN")} đ
      </p>
    </div>
    <button
      onClick={onDismiss}
      className="text-[#286b4a] hover:text-[#1a4a30] transition-colors"
    >
      <XIcon />
    </button>
  </div>
);
