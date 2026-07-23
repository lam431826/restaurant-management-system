import { useState, useEffect } from "react";
import {
  openShift,
  getSuggestedOpeningFloat,
} from "../../../services/shiftService";
import type { ShiftSummary } from "../../../services/shiftService";
import { ApiError } from "../../../services/api";

const formatDots = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("vi-VN");
};

const nowLabel = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const PencilIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-[#9499a0] shrink-0"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const OpenShiftModal = ({
  employeeName,
  onOpened,
  onLogout,
  onClose,
}: {
  employeeName: string;
  onOpened: (shift: ShiftSummary) => void;
  onLogout: () => void;
  onClose?: () => void;
}) => {
  const [openingCash, setOpeningCash] = useState("");
  const [note, setNote] = useState("");
  const [startTime] = useState(nowLabel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // BR-CS-09/11: prefill the opening float with the cashier's last handover amount.
  useEffect(() => {
    getSuggestedOpeningFloat()
      .then((amount) => {
        if (amount > 0) {
          setOpeningCash(amount.toLocaleString("vi-VN"));
        }
      })
      .catch(() => {
        /* no prior handover — leave the field empty */
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(openingCash.replace(/\D/g, "") || "0", 10);
    if (isNaN(amount) || amount < 0) {
      setError("Vui lòng nhập số tiền hợp lệ (≥ 0)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const shift = await openShift(amount);
      onOpened(shift);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SHIFT_ALREADY_OPEN") {
        setError(
          "Bạn đang có một ca thu ngân đang mở. Vui lòng đóng ca cũ trước.",
        );
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Không thể mở ca. Vui lòng thử lại.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] mx-4 overflow-hidden">
        <form onSubmit={(e) => void handleSubmit(e)} className="p-8 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#9499a0] hover:text-[#202325] hover:bg-[#f0f0f0] transition-colors"
              aria-label="Đóng"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          <h2 className="text-[24px] font-bold text-[#202325]">
            Mở ca làm việc
          </h2>
          <p className="text-[15px] text-[#3a3f45] mt-3 leading-relaxed">
            Vui lòng mở ca làm việc mới để có thể thực hiện được các chức năng
            dành cho nhân viên thu ngân
          </p>

          <div className="flex flex-col gap-5 mt-7">
            {/* Nhân viên ca */}
            <div className="flex items-center gap-4">
              <label className="w-[9.5rem] shrink-0 text-[15px] font-medium text-[#202325]">
                Nhân viên ca <span className="text-red-500">*</span>
              </label>
              <div className="flex-1 border-b border-[#d1d5db] pb-1.5 text-[15px] text-[#9499a0]">
                {employeeName}
              </div>
            </div>

            {/* Giờ bắt đầu */}
            <div className="flex items-center gap-4">
              <label className="w-[9.5rem] shrink-0 text-[15px] font-medium text-[#202325]">
                Giờ bắt đầu
              </label>
              <div className="flex-1 border-b border-[#d1d5db] pb-1.5 text-[15px] text-[#202325]">
                {startTime}
              </div>
            </div>

            {/* Tiền mặt đầu ca */}
            <div className="flex items-center gap-4">
              <label className="w-[9.5rem] shrink-0 text-[15px] font-medium text-[#202325]">
                Tiền mặt đầu ca <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={openingCash}
                onChange={(e) => {
                  setOpeningCash(formatDots(e.target.value));
                  if (error) setError("");
                }}
                className="flex-1 border-b border-[#d1d5db] pb-1.5 text-[15px] text-[#202325] outline-none focus:border-[#025cca] bg-transparent"
                autoFocus
              />
            </div>

            {/* Ghi chú */}
            <div className="flex items-center gap-4">
              <label className="w-[9.5rem] shrink-0 text-[15px] font-medium text-[#202325]">
                Ghi chú
              </label>
              <div className="flex-1 flex items-center gap-2 border-b border-[#d1d5db] pb-1.5">
                <PencilIcon />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 text-[15px] text-[#202325] outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onLogout}
              className="px-7 h-11 rounded-xl bg-[#e8f1fc] text-[#025cca] font-semibold text-[15px] hover:bg-[#d7e7fa] transition-colors"
            >
              Đăng xuất
            </button>
            <button
              type="submit"
              disabled={loading || !openingCash}
              className="px-9 h-11 rounded-xl bg-[#025cca] text-white font-semibold text-[15px] hover:bg-[#0251b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang mở ca..." : "Mở ca"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
