import { useState, useMemo } from "react";
import type { Order, OrderItemLine } from "../../../services/orderApi";

export interface QROrderConfirmationModalProps {
  orders: Order[];
  tables: { id: string; name: string; area: string }[];
  onClose: () => void;
  onAccept: (order: Order) => void;
  onReject: (order: Order) => void;
}

type TabKey = "pending" | "confirmed" | "cancelled";

const timeAgo = (dateStr: string) => {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "1 phút trước"; // Match screenshot's "1 phút trước" style
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  return `${hours} giờ trước`;
};

/* ─── Clock icon ──────────────────────────────────────────────── */
const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4 text-blue-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
  </svg>
);

/* ─── Chevron down icon ───────────────────────────────────────── */
const ChevronDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4 text-gray-800"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

/* ─── Empty state icon ────────────────────────────────────────── */
const EmptyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-14 h-14 text-blue-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export const QROrderConfirmationModal = ({
  orders,
  tables,
  onClose,
  onAccept,
  onReject,
}: QROrderConfirmationModalProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedTable, setSelectedTable] = useState("all");

  /* ── Derive area list from tables ──────────────────────────── */
  const areas = useMemo(() => {
    const set = new Set(tables.map((t) => t.area));
    return ["all", ...Array.from(set)];
  }, [tables]);

  const tableNames = useMemo(() => {
    const filtered =
      selectedArea === "all"
        ? tables
        : tables.filter((t) => t.area === selectedArea);
    const set = new Set(filtered.map((t) => t.name));
    return ["all", ...Array.from(set)];
  }, [tables, selectedArea]);

  /* ── Classify orders ───────────────────────────────────────── */
  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "PENDING" ||
          (o.status !== "CANCELLED" &&
            o.status !== "CLOSED" &&
            o.items.some(
              (i) =>
                i.cookingStatus === "PENDING" && (i.isQrOrder || i.qrOrder),
            )),
      ),
    [orders],
  );

  const confirmedOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== "PENDING" &&
          o.status !== "CANCELLED" &&
          o.status !== "CLOSED" &&
          o.items.some(
            (i) =>
              i.cookingStatus === "COOKING" ||
              i.cookingStatus === "READY" ||
              i.cookingStatus === "SERVED",
          ),
      ),
    [orders],
  );

  const cancelledOrders = useMemo(
    () =>
      orders.filter((o) => {
        const isCancelled =
          o.status === "CANCELLED" ||
          (o.status !== "PENDING" &&
            o.status !== "CLOSED" &&
            o.items.every((i) => i.cookingStatus === "REJECTED"));
        if (!isCancelled) return false;
        const fourHoursInMs = 4 * 60 * 60 * 1000;
        return Date.now() - new Date(o.createdAt).getTime() <= fourHoursInMs;
      }),
    [orders],
  );

  /* ── Apply zone/table filter on top of active tab ──────────── */
  const applyFilter = (list: Order[]) =>
    list.filter((o) => {
      if (selectedArea !== "all") {
        const table = tables.find((t) => t.id === o.tableId);
        if (!table || table.area !== selectedArea) return false;
      }
      if (selectedTable !== "all" && o.tableName !== selectedTable)
        return false;
      return true;
    });

  const displayedOrders =
    activeTab === "pending"
      ? applyFilter(pendingOrders)
      : activeTab === "confirmed"
        ? applyFilter(confirmedOrders)
        : applyFilter(cancelledOrders);

  /* ── Tab pill class ────────────────────────────────────────── */
  const tabCls = (key: TabKey) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer select-none ${
      activeTab === key
        ? "bg-[#2563eb] text-white"
        : "bg-[#f1f5f9] text-[#202325] hover:bg-[#e2e8f0]"
    }`;

  /* ── Render an order card ──────────────────────────────────── */
  const renderCard = (order: Order) => {
    const pendingItems = order.items.filter(
      (i) => i.cookingStatus === "PENDING" && (i.isQrOrder || i.qrOrder),
    );
    const acceptedItems = order.items.filter(
      (i) =>
        (i.cookingStatus === "COOKING" ||
          i.cookingStatus === "READY" ||
          i.cookingStatus === "SERVED") &&
        (i.isQrOrder || i.qrOrder),
    );
    const rejectedItems = order.items.filter(
      (i) => i.cookingStatus === "REJECTED" && (i.isQrOrder || i.qrOrder),
    );

    // Decide which items to show as main list
    let mainItems: OrderItemLine[];
    if (activeTab === "pending") {
      mainItems =
        order.status === "PENDING"
          ? order.items.filter((i) => i.isQrOrder || i.qrOrder)
          : pendingItems;
    } else if (activeTab === "confirmed") {
      mainItems = acceptedItems;
    } else {
      mainItems = order.items.filter((i) => i.isQrOrder || i.qrOrder);
    }

    if (mainItems.length === 0 && rejectedItems.length === 0) return null;

    const table = tables.find((t) => t.id === order.tableId);
    const areaName = table ? table.area : "";
    const headerTitle = areaName
      ? `${order.tableName} - ${areaName}`
      : order.tableName;

    return (
      <div
        key={order.id}
        className="bg-white rounded-2xl border-l-[6px] border-l-[#2563eb] border border-gray-200 overflow-hidden shadow-sm"
      >
        {/* Card header */}
        <div className="flex items-center gap-2 px-6 py-4">
          <ChevronDown />
          <span className="font-bold text-gray-900 text-base">
            {headerTitle}
          </span>
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-blue-500 text-sm font-semibold flex items-center gap-1.5">
            <ClockIcon /> {timeAgo(order.createdAt)}
          </span>
        </div>

        {/* Item rows */}
        <div className="px-6 pb-2">
          {mainItems.map((item) => (
            <div
              key={item.orderItemId}
              className="flex items-center justify-between py-3 border-t border-gray-100"
            >
              <div className="flex items-center gap-2 min-w-0 text-gray-800 text-[15px] font-medium">
                <span className="whitespace-nowrap">{item.quantity}</span>
                <span className="text-gray-400">×</span>
                <span className="truncate">{item.menuItemName}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <span className="text-[15px] font-semibold text-gray-700">
                  {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Rejected items section (shown in "Đã xác nhận" tab) */}
        {activeTab === "confirmed" && rejectedItems.length > 0 && (
          <div className="mx-6 mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="font-bold text-[15px] text-gray-900 mb-2">
              Món đã hủy
            </p>
            {rejectedItems.map((item) => (
              <div
                key={item.orderItemId}
                className="flex items-center justify-between py-1.5 text-gray-600 text-[15px]"
              >
                <div className="flex items-center gap-2">
                  <span>{item.quantity}</span>
                  <span className="text-gray-400">x</span>
                  <span className="font-medium">{item.menuItemName}</span>
                  {item.rejectionNote && (
                    <span className="text-red-500 font-semibold text-sm">
                      {" "}
                      - Lý do: {item.rejectionNote}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-gray-500">
                  {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons (only on pending tab) */}
        {activeTab === "pending" && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => onReject(order)}
              className="px-6 py-2 bg-red-50 text-red-600 rounded-full text-[15px] font-bold hover:bg-red-100 flex items-center gap-1.5 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 stroke-[3px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Hủy
            </button>
            <button
              onClick={() => onAccept(order)}
              className="px-6 py-2 bg-[#2563eb] text-white rounded-full text-[15px] font-bold hover:bg-[#1d4ed8] flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 stroke-[3px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Xác nhận
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ── Empty state ───────────────────────────────────────────── */
  const emptyMessages: Record<TabKey, { title: string; sub: string }> = {
    pending: {
      title: "Danh sách trống",
      sub: "Hiện chưa có lượt gọi món nào chờ xác nhận",
    },
    confirmed: {
      title: "Danh sách trống",
      sub: "Hiện chưa có lượt gọi món nào đã xác nhận",
    },
    cancelled: {
      title: "Danh sách trống",
      sub: "Hiện chưa có lượt gọi món nào đã huỷ",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1040px] max-h-[85vh] flex flex-col overflow-hidden mx-4">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Xác nhận gọi món</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Tabs + Filters row ─────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pb-4 gap-4 flex-wrap">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              className={tabCls("pending")}
              onClick={() => setActiveTab("pending")}
            >
              Chưa xác nhận ({pendingOrders.length})
            </button>
            <button
              className={tabCls("confirmed")}
              onClick={() => setActiveTab("confirmed")}
            >
              Đã xác nhận ({confirmedOrders.length})
            </button>
            <button
              className={tabCls("cancelled")}
              onClick={() => setActiveTab("cancelled")}
            >
              Hủy gọi món ({cancelledOrders.length})
            </button>
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-3">
            <select
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setSelectedTable("all");
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white min-w-[160px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">Tất cả khu vực</option>
              {areas
                .filter((a) => a !== "all")
                .map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
            </select>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white min-w-[160px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">Tất cả phòng/bàn</option>
              {tableNames
                .filter((t) => t !== "all")
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="border-t" />

        {/* ── Content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f8f8f8]">
          {displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
              <EmptyIcon />
              <p className="mt-4 font-bold text-gray-800 text-base">
                {emptyMessages[activeTab].title}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {emptyMessages[activeTab].sub}
              </p>
            </div>
          ) : (
            <div className="space-y-4">{displayedOrders.map(renderCard)}</div>
          )}
        </div>
      </div>
    </div>
  );
};
