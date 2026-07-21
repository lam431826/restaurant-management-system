import type { TableItem as TableServiceItem } from "../../../services/tableService";
import type { CookingStatus, OrderStatus } from "../../../services/orderApi";

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  qty: number;
}
export interface Category {
  id: string;
  label: string;
  count: number;
}
export interface TableItem {
  id: string;
  name: string;
  area: string;
  capacity: number;
  status: string;
  occupied: boolean;
  selected: boolean;
  amount: number;
  guests: number;
  items: number;
  orderId: string | null;
  upcomingReservation: {
    id: string;
    guestName: string;
    phone: string;
    partySize: number;
    datetime: string;
  } | null;
  /** Set only when this table's OCCUPIED status came from a walk-in check-in (no reservation).
   * Null for reservation-driven occupancy. */
  occupiedSince: string | null;
}
export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  notes: string;
  status: string;
  price: number;
  orderId: string;
  rejectionNote?: string | null;
  isQrOrder?: boolean;
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  note: string;
}

export const OCCUPIED_STATUSES = ["OCCUPIED", "BILLING"];

export const toTableItem = (dto: TableServiceItem): TableItem => {
  const hasActiveOrder = Boolean(dto.activeOrderId);
  return {
    id: dto.id,
    name: dto.name,
    area: dto.area,
    capacity: dto.seats,
    status:
      hasActiveOrder && dto.status === "AVAILABLE" ? "OCCUPIED" : dto.status,
    occupied: hasActiveOrder || OCCUPIED_STATUSES.includes(dto.status),
    selected: false,
    amount: 0,
    guests: 0,
    items: 0,
    orderId: dto.activeOrderId,
    upcomingReservation: dto.upcomingReservation ?? null,
    occupiedSince: dto.occupiedSince ?? null,
  };
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "ACCEPTED",
  "PREPARING",
  "SERVED",
];

export const COOKING_STATUS_LABEL: Record<CookingStatus, string> = {
  PENDING: "Chờ duyệt",
  COOKING: "Đang nấu",
  READY: "Đã nấu xong",
  SERVED: "Đã phục vụ",
  REJECTED: "Đã hủy",
};

export const COOKING_STATUS_FROM_LABEL: Record<string, CookingStatus> = {
  "Chờ duyệt": "PENDING",
  "Đang nấu": "COOKING",
  "Đã nấu xong": "READY",
  "Đã phục vụ": "SERVED",
  "Đã hủy": "REJECTED",
};

export const STATUS_OPTIONS = ["Đang nấu", "Đã nấu xong", "Đã phục vụ"];

export const DRAFT_ITEM_STATUS = "MỚI";

export const getAllowedNextStatusLabels = (status: string): string[] => {
  if (status === COOKING_STATUS_LABEL.PENDING) {
    return [COOKING_STATUS_LABEL.COOKING];
  }

  if (status === COOKING_STATUS_LABEL.COOKING) {
    return [COOKING_STATUS_LABEL.READY];
  }

  if (status === COOKING_STATUS_LABEL.READY) {
    return [COOKING_STATUS_LABEL.SERVED];
  }

  return [];
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  WAITER: "Phục vụ",
};
