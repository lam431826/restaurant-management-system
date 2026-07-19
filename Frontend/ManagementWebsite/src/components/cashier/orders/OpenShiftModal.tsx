import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  openShift,
  getSuggestedOpeningFloat,
  openFloatingShift,
} from "../../../services/shiftService";
import type { ShiftSummary } from "../../../services/shiftService";
import { listMyAttendance } from "../../../services/rosterService";
import { ApiError } from "../../../services/api";

const formatDots = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("vi-VN");
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true); // attendance check in-flight
  // BR-X-01: distinguish why the cashier can't open a shift.
  // null = clocked in (allowed). The three blocked states are handled differently.
  const [blockReason, setBlockReason] = useState<
    "NOT_CLOCKED_IN" | "CLOCKED_OUT" | "NO_SHIFT" | null
  >(null);
  const [openingCash, setOpeningCash] = useState("");
  const [note, setNote] = useState("");
  const [startTime] = useState(nowLabel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Proactively check if the cashier is clocked in today
  useEffect(() => {
    const t = today();
    listMyAttendance(t, t)
      .then((records) => {
        // BR-X-01: three states — scheduled-but-not-clocked-in, already-clocked-out, no-shift-today.
        if (records.some((r) => r.status === "CHECKED_IN")) {
          setBlockReason(null);
        } else if (records.some((r) => r.status === "SCHEDULED")) {
          setBlockReason("NOT_CLOCKED_IN");
        } else if (
          records.some(
            (r) => r.status === "CHECKED_OUT" || r.status === "EARLY_LEAVE",
          )
        ) {
          setBlockReason("CLOCKED_OUT");
        } else {
          // No legacy roster record for today is no longer conclusive proof of
          // "no shift" — staff can now also be scheduled through the newer
          // Manager "Lịch làm việc" screen (module/attendance), which this
          // roster-only check cannot see. Let them try; the server enforces
          // BR-X-01 against both sources and returns CASHIER_NOT_CHECKED_IN
          // (handled below) if truly unscheduled.
          setBlockReason(null);
        }
      })
      .catch(() => {
        // If the check fails, let them try — the server will enforce BR-X-01
        setBlockReason(null);
      })
      .finally(() => setChecking(false));
  }, []);

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

  // BR-CS-18: open a floating shift to cover for a main shift owner (CHECKED_IN exempt).
  const handleOpenFloating = async () => {
    setLoading(true);
    setError("");
    try {
      const shift = await openFloatingShift();
      onOpened(shift);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể mở ca tạm.");
    } finally {
      setLoading(false);
    }
  };

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
      if (err instanceof ApiError && err.code === "CASHIER_NOT_CHECKED_IN") {
        setBlockReason("NOT_CLOCKED_IN");
        setError("");
      } else if (err instanceof ApiError && err.code === "SHIFT_ALREADY_OPEN") {
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
        {/* ── Checking attendance ── */}
        {checking && (
          <div className="p-8">
            <h2 className="text-[24px] font-bold text-[#202325] mb-4">
              Mở ca làm việc
            </h2>
            <div className="flex items-center justify-center gap-3 text-[#636566] text-[14px] py-4">
              <svg
                className="w-5 h-5 animate-spin text-[#025cca]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Đang kiểm tra lịch làm việc...
            </div>
          </div>
        )}

        {/* ── Not clocked in ── */}
        {!checking && blockReason !== null && (
          <div className="p-7 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-[#202325]">
                  {blockReason === "NOT_CLOCKED_IN" &&
                    "Bạn chưa chấm công hôm nay"}
                  {blockReason === "CLOCKED_OUT" && "Bạn đã chấm công ra"}
                  {blockReason === "NO_SHIFT" &&
                    "Bạn không có ca làm việc hôm nay"}
                </p>
                <p className="text-[13px] text-[#636566] mt-1 leading-relaxed">
                  {blockReason === "NOT_CLOCKED_IN" &&
                    "Bạn cần chấm công vào ca làm việc trước khi có thể mở ca thu ngân."}
                  {blockReason === "CLOCKED_OUT" &&
                    "Bạn đã kết thúc ca làm việc. Cần quản lý xác nhận (override) để mở ca thu ngân."}
                  {blockReason === "NO_SHIFT" &&
                    "Hôm nay bạn không được xếp ca. Cần quản lý xác nhận (override) để mở ca thu ngân."}
                </p>
              </div>
            </div>

            {blockReason === "NOT_CLOCKED_IN" && (
              <button
                type="button"
                onClick={() => navigate("/my-schedule")}
                className="h-11 rounded-lg bg-[#025cca] text-white font-semibold text-[15px] hover:bg-[#0251b3] transition-colors flex items-center justify-center gap-2"
              >
                Đi chấm công
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </button>
            )}
            {/* BR-CS-18: cover for an active cashier with a floating shift */}
            <button
              type="button"
              onClick={() => void handleOpenFloating()}
              disabled={loading}
              className="h-10 rounded-lg border border-[#025cca] text-[13px] text-[#025cca] font-medium hover:bg-[#025cca]/5 disabled:opacity-60 transition-colors"
            >
              Mở ca tạm để hỗ trợ thu ngân khác
            </button>
            {error && (
              <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBlockReason(null)}
                className="flex-1 h-10 rounded-lg border border-[#d1d5db] text-[13px] text-[#636566] hover:bg-[#f5f5f5] transition-colors"
              >
                ← Thử mở ca
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 h-10 rounded-lg border border-red-200 text-[13px] text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                  />
                </svg>
                Đăng xuất
              </button>
            </div>
          </div>
        )}

        {/* ── Open shift form ── */}
        {!checking && blockReason === null && (
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
        )}
      </div>
    </div>
  );
};
