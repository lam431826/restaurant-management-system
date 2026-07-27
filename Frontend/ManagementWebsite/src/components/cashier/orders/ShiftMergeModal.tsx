import type { OpenShiftBrief } from "../../../services/shiftService";

interface ShiftMergeModalProps {
  targets: OpenShiftBrief[];
  targetId: string;
  cash: string;
  note: string;
  loading: boolean;
  error: string;
  onTargetChange: (shiftId: string) => void;
  onCashChange: (cash: string) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const ShiftMergeModal = ({
  targets,
  targetId,
  cash,
  note,
  loading,
  error,
  onTargetChange,
  onCashChange,
  onNoteChange,
  onSubmit,
  onClose,
}: ShiftMergeModalProps) => (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] mx-4 overflow-hidden">
      <div className="px-6 py-5 border-b border-[#eceef0]">
        <h2 className="text-[18px] font-bold text-[#202325]">
          Gộp ca tạm vào ca chính
        </h2>
        <p className="text-[13px] text-[#636566] mt-1">
          Đếm tiền mặt đã thu trong ca tạm và chọn ca chính để gộp. Giao dịch
          sẽ được chuyển vào ca chính (giữ nguyên người thu).
        </p>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-[#202325]">
            Ca chính
          </label>
          {targets.length === 0 ? (
            <p className="text-[13px] text-[#636566]">
              Không có ca chính nào đang mở để gộp.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {targets.map((target) => (
                <label
                  key={target.shiftId}
                  className="flex items-center gap-2 text-[14px] text-[#202325] cursor-pointer"
                >
                  <input
                    type="radio"
                    name="merge-target"
                    checked={targetId === target.shiftId}
                    onChange={() => onTargetChange(target.shiftId)}
                  />
                  {target.cashierName}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-[#202325]">
            Tiền mặt đã đếm (VNĐ)
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={cash}
            onChange={(event) =>
              onCashChange(
                parseInt(
                  event.target.value.replace(/\D/g, "") || "0",
                  10,
                ).toLocaleString("vi-VN"),
              )
            }
            className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[15px] text-[#202325] outline-none focus:border-[#025cca]"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Ghi chú (nếu lệch tiền)"
          className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[14px] text-[#202325] outline-none focus:border-[#025cca]"
        />
        {error && (
          <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
            {error}
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t border-[#eceef0] flex justify-end gap-2">
        <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>
          Hủy
        </button>
        <button
          className="kv-btn kv-btn-primary h-10"
          disabled={loading || targets.length === 0}
          onClick={onSubmit}
        >
          {loading ? "Đang gộp..." : "Gộp ca"}
        </button>
      </div>
    </div>
  </div>
);
