import type { TableItem } from "./types";

/* ─── Table view ─────────────────────────────────────────────────────────── */

function formatResTime(dt: string): string {
  const d = new Date(dt);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const mon = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${hh}:${mm} ${day}/${mon}`;
}
const Chairs = ({ color }: { color: string }) => (
  <div className="flex gap-[15px] shrink-0">
    <div
      className="h-[17px] w-[63px] rounded-[12px]"
      style={{ backgroundColor: color }}
    />
    <div
      className="h-[17px] w-[63px] rounded-[12px]"
      style={{ backgroundColor: color }}
    />
  </div>
);

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "#e8e8e8",
  OCCUPIED: "#ffedd5",
  BILLING: "#fde68a",
  RESERVED: "#dbeafe",
  CLEANING: "#f3f4f6",
};
const STATUS_LABEL_VI: Record<string, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Đang dùng",
  BILLING: "Chờ thanh toán",
  RESERVED: "Đã đặt",
  CLEANING: "Đang dọn",
};

const TableCard = ({
  table,
  onSelect,
}: {
  table: TableItem;
  onSelect: (id: string) => void;
}) => {
  const seatColor = STATUS_COLOR[table.status] ?? "#e8e8e8";
  const selectedBg = table.occupied ? "bg-[#dceefe]" : "bg-[#d9e7f7]";
  return (
    <button
      onClick={() => onSelect(table.id)}
      className={`flex flex-col gap-3 items-center p-[10px] rounded-[30px] w-[184px] shrink-0 border-2 transition-colors ${table.selected ? `${selectedBg} border-[#025cca]` : "bg-white border-transparent hover:border-[#e8e8e8]"}`}
    >
      <Chairs color={seatColor} />
      <div
        className="relative h-[80px] w-[164px] rounded-[12px] shrink-0"
        style={{ backgroundColor: seatColor }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2">
          {/* Not gated on status === "RESERVED": a table also carries an upcomingReservation
              once it frees back to AVAILABLE with a later same-day guest still CONFIRMED on it. */}
          {table.upcomingReservation && !table.occupied ? (
            <>
              <p className="text-[11px] font-semibold text-blue-800 leading-tight truncate w-full text-center">
                {table.upcomingReservation.guestName}
              </p>
              <p className="text-[10px] text-blue-700">
                {formatResTime(table.upcomingReservation.datetime)}
              </p>
              <p className="text-[10px] text-blue-600">
                {table.upcomingReservation.partySize} người
              </p>
            </>
          ) : table.occupied ? (
            <>
              {table.amount > 0 ? (
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] font-medium text-black/70">
                    Tạm tính
                  </span>
                  <span className="text-[16px] font-semibold text-black">
                    {table.amount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ) : (
                <p className="text-[16px] font-semibold text-black leading-tight">
                  {STATUS_LABEL_VI[table.status]}
                </p>
              )}
              {table.items > 0 && (
                <div className="flex gap-2.5 text-[10px] text-black">
                  <span>{table.guests} người</span>
                  <span>{table.items} món</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-[12px] text-[#636566] font-medium">
              {STATUS_LABEL_VI[table.status] ?? table.status}
            </p>
          )}
        </div>
      </div>
      <Chairs color={seatColor} />
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[16px] font-semibold text-center leading-[1.5] text-black">
          {table.name}
        </p>
        <p className="text-[11px] text-[#797b7c]">{table.capacity} chỗ</p>
      </div>
    </button>
  );
};

// Statuses that occupy a table slot (not available for new walk-ins)
const BUSY_STATUSES = ["OCCUPIED", "BILLING", "RESERVED"];

export const TableView = ({
  tables,
  onSelect,
  filter,
}: {
  tables: TableItem[];
  onSelect: (id: string) => void;
  filter: string;
}) => {
  const filtered =
    filter === "used"
      ? tables.filter((t) => BUSY_STATUSES.includes(t.status))
      : filter === "empty"
        ? tables.filter((t) => !BUSY_STATUSES.includes(t.status))
        : tables;
  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.length === 0 ? (
        <p className="text-[14px] text-[#797b7c] py-8 text-center">
          Không có bàn
        </p>
      ) : (
        <div className="flex flex-wrap gap-3 pr-2">
          {filtered.map((table) => (
            <TableCard key={table.id} table={table} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};
