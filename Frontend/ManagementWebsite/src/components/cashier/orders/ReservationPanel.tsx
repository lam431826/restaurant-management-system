import type { TableItem } from "./types";

function formatDatetime(isoStr: string): { time: string; date: string } {
  const d = new Date(isoStr);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return { time, date };
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-baseline gap-3 py-2.5 border-b border-[#f0f0f0] last:border-0">
    <span className="text-[13px] text-[#797b7c] shrink-0">{label}</span>
    <span className="text-[14px] font-medium text-[#202325] text-right break-words min-w-0">
      {value}
    </span>
  </div>
);

export const ReservationPanel = ({
  table,
  onCheckIn,
  onNoShow,
  onCancel,
  loading,
  error,
}: {
  table: TableItem;
  onCheckIn: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) => {
  const res = table.upcomingReservation;

  return (
    <div className="bg-white rounded-[12px] flex flex-col p-4 lg:p-6 w-[260px] md:w-[300px] lg:w-[360px] xl:w-[400px] shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 shrink-0">
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
        <h3 className="text-[17px] font-semibold text-[#202325] flex-1 leading-tight">
          Đặt bàn trước
        </h3>
        <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[#dbeafe] text-blue-700 shrink-0">
          {table.name}
        </span>
      </div>

      {/* Content */}
      {!res ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-[#797b7c]">Không có thông tin đặt bàn</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            {(() => {
              const { time, date } = formatDatetime(res.datetime);
              return (
                <div className="flex flex-col">
                  <Row label="Tên khách" value={res.guestName} />
                  <Row label="Điện thoại" value={res.phone} />
                  <Row label="Số người" value={`${res.partySize} người`} />
                  <Row label="Giờ đặt" value={time} />
                  <Row label="Ngày" value={date} />
                  <Row label="Sức chứa bàn" value={`${table.capacity} chỗ`} />
                </div>
              );
            })()}
          </div>

          {error && (
            <p className="shrink-0 text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#e8e8e8] shrink-0">
            <button
              disabled={loading}
              onClick={onCheckIn}
              className="w-full h-12 rounded-[10px] bg-[#025cca] text-white text-[15px] font-semibold hover:bg-[#0251b3] active:bg-[#01429a] disabled:opacity-50 transition-colors"
            >
              {loading ? "Đang xử lý..." : "Check-In khách"}
            </button>
            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={onNoShow}
                className="flex-1 h-10 rounded-[10px] bg-amber-50 border border-amber-300 text-amber-700 text-[13px] font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                Không đến
              </button>
              <button
                disabled={loading}
                onClick={onCancel}
                className="flex-1 h-10 rounded-[10px] bg-red-50 border border-red-300 text-red-600 text-[13px] font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                Hủy đặt bàn
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
