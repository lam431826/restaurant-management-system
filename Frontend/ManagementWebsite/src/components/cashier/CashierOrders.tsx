import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../api/auth";
import { ApiError } from "../../services/api";
import { ApiClientError } from "../../services/apiClient";
import { getMyShift } from "../../services/shiftService";
import type { ShiftSummary } from "../../services/shiftService";
import { OpenShiftModal } from "./orders/OpenShiftModal";
import { CloseShiftModal } from "./orders/CloseShiftModal";
import { CashMovementModal } from "./orders/CashMovementModal";
import { listTables } from "../../services/tableService";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import {
  applyInvoiceDiscount,
  generateInvoice,
  getInvoiceById,
  getInvoices,
  sendInvoice,
} from "../../services/invoiceApi";
import type { InvoiceDetail, InvoiceSummary } from "../../services/invoiceApi";
import { processPayment } from "../../services/paymentApi";
import type { PaymentMethod } from "../../services/paymentApi";
import { getStoredUser } from "../../services/tokenStorage";
import { listCategories, searchItems } from "../../services/menuService";
import type { MenuCategory } from "../../services/menuService";
import {
  addOrderItems,
  cancelOrder,
  createOrder,
  closeOrder,
  listOrders,
  listPendingAssistance,
  acceptOrder,
  removeOrderItem,
  respondAssistance,
  updateOrderItemStatus,
  updateOrderItemNote,
} from "../../services/orderApi";
import type { AssistanceRequest, Order } from "../../services/orderApi";

import type {
  MenuItem,
  Category,
  TableItem,
  OrderItem,
  CartItem,
} from "./orders/types";
import {
  toTableItem,
  ACTIVE_ORDER_STATUSES,
  COOKING_STATUS_LABEL,
  COOKING_STATUS_FROM_LABEL,
  ROLE_LABEL,
} from "./orders/types";
import { printCashierInvoice } from "./orders/printInvoice";
import { Header } from "./orders/Header";
import { BottomNav } from "./orders/BottomNav";
import { MenuView } from "./orders/MenuView";
import { TableView } from "./orders/TableView";
import { AddNoteModal } from "./orders/AddNoteModal";
import { PaymentModal } from "./orders/PaymentModal";
import { OrderPanel } from "./orders/OrderPanel";
import { SuccessToast } from "./orders/SuccessToast";
import { SearchIcon } from "./orders/icons";
import { QROrderConfirmationModal } from "./orders/QROrderConfirmationModal";

/* ─── Main page ──────────────────────────────────────────────────────────── */
const TABLE_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "used", label: "Sử dụng" },
  { id: "empty", label: "Còn trống" },
];

const ORDER_ALREADY_INVOICED_MESSAGE =
  "Đơn hàng đã có hóa đơn nên không thể chỉnh sửa món.";
const ORDER_FINAL_ITEM_LOCK_MESSAGE =
  "Đơn hàng đã đóng hoặc đã hủy nên không thể chỉnh sửa món.";
const EMPTY_ORDER_MESSAGE =
  "Đơn hàng chưa có món. Vui lòng thêm món hoặc hủy đơn.";

const ORDER_ACTION_ERROR_MESSAGES: Record<string, string> = {
  ORDER_ALREADY_INVOICED: ORDER_ALREADY_INVOICED_MESSAGE,
  INVOICE_NOT_FOUND: "Không thể đóng đơn vì đơn chưa có hóa đơn.",
  ORDER_NOT_CLOSEABLE:
    "Không thể đóng đơn khi hóa đơn chưa được thanh toán hoặc đơn không còn hợp lệ để đóng.",
  CANNOT_CANCEL_INVOICED_ORDER:
    "Không thể hủy đơn vì đơn đã có hóa đơn.",
  CANNOT_CANCEL_PAID_ORDER:
    "Không thể hủy đơn vì hóa đơn đã được thanh toán.",
  CANNOT_CANCEL_ORDER_ITEMS_NOT_PENDING:
    "Không thể hủy đơn vì có món đã được bếp xử lý hoặc phục vụ.",
  ORDER_ITEM_STATUS_TRANSITION_NOT_ALLOWED:
    "Không thể hủy món ở trạng thái hiện tại.",
  ORDER_ITEM_REMOVE_NOT_ALLOWED:
    "Chỉ có thể xóa món khi món đang chờ duyệt.",
  INVALID_STATUS_TRANSITION:
    "Thao tác đổi trạng thái không hợp lệ. Vui lòng dùng đúng luồng xử lý.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
};

const ORDER_ACTION_FALLBACK_ERROR =
  "Thao tác thất bại. Vui lòng thử lại hoặc kiểm tra trạng thái đơn.";

const getOrderActionErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code) {
    return ORDER_ACTION_ERROR_MESSAGES[error.code] ?? ORDER_ACTION_FALLBACK_ERROR;
  }

  return ORDER_ACTION_FALLBACK_ERROR;
};

const INVOICE_GENERATION_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_INVOICEABLE:
    "Đơn hàng chưa đủ điều kiện tạo hóa đơn.",
  ORDER_NOT_READY_FOR_INVOICE:
    "Đơn hàng chưa đủ điều kiện tạo hóa đơn.",
  INVALID_ORDER_ITEMS:
    "Đơn hàng không có món hợp lệ để tạo hóa đơn.",
  INVALID_INVOICE_ITEMS:
    "Đơn hàng không có món hợp lệ để tạo hóa đơn.",
  INVALID_INVOICE_TOTAL:
    "Hóa đơn có tổng tiền không hợp lệ.",
  INVOICE_ALREADY_EXISTS: "Đơn hàng này đã có hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  PROMOTION_NOT_FOUND: "Không tìm thấy mã khuyến mãi.",
  PROMOTION_INACTIVE: "Mã khuyến mãi không còn hoạt động.",
  PROMOTION_EXPIRED: "Mã khuyến mãi đã hết hạn.",
  PROMOTION_NOT_STARTED: "Mã khuyến mãi chưa đến thời gian áp dụng.",
  PROMOTION_USAGE_LIMIT_REACHED:
    "Mã khuyến mãi đã đạt giới hạn sử dụng.",
  INVALID_STATUS_TRANSITION: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
};

const INVOICE_GENERATION_MESSAGE_FALLBACKS: Record<string, string> = {
  "Order cannot be invoiced in its current status":
    INVOICE_GENERATION_ERROR_MESSAGES.ORDER_NOT_INVOICEABLE,
  "Order is not ready for invoice because some items are still pending or cooking":
    INVOICE_GENERATION_ERROR_MESSAGES.ORDER_NOT_READY_FOR_INVOICE,
  "Order contains invalid invoice items":
    INVOICE_GENERATION_ERROR_MESSAGES.INVALID_ORDER_ITEMS,
  "Order must contain at least one item before invoice generation":
    INVOICE_GENERATION_ERROR_MESSAGES.INVALID_ORDER_ITEMS,
  "Order does not contain any payable items":
    INVOICE_GENERATION_ERROR_MESSAGES.INVALID_ORDER_ITEMS,
  "Invoice subtotal must be greater than zero and total amount cannot be negative":
    INVOICE_GENERATION_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  "Invoice already exists for this order":
    INVOICE_GENERATION_ERROR_MESSAGES.INVOICE_ALREADY_EXISTS,
  "Order not found": INVOICE_GENERATION_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Promotion not found": INVOICE_GENERATION_ERROR_MESSAGES.PROMOTION_NOT_FOUND,
  "Promotion is inactive":
    INVOICE_GENERATION_ERROR_MESSAGES.PROMOTION_INACTIVE,
  "Promotion has expired":
    INVOICE_GENERATION_ERROR_MESSAGES.PROMOTION_EXPIRED,
  "Promotion has not started":
    INVOICE_GENERATION_ERROR_MESSAGES.PROMOTION_NOT_STARTED,
  "Promotion usage limit has been reached":
    INVOICE_GENERATION_ERROR_MESSAGES.PROMOTION_USAGE_LIMIT_REACHED,
  "Promotion is not valid":
    INVOICE_GENERATION_ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
  "Validation failed": INVOICE_GENERATION_ERROR_MESSAGES.VALIDATION_ERROR,
  "Invalid enum value": INVOICE_GENERATION_ERROR_MESSAGES.BAD_REQUEST,
  "Malformed or unreadable request body":
    INVOICE_GENERATION_ERROR_MESSAGES.BAD_REQUEST,
};

const INVOICE_GENERATION_FALLBACK_ERROR =
  "Không thể tạo hóa đơn. Vui lòng thử lại.";

const getInvoiceGenerationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return (
      INVOICE_GENERATION_ERROR_MESSAGES[error.code] ??
      INVOICE_GENERATION_FALLBACK_ERROR
    );
  }

  const message = error instanceof Error ? error.message : "";
  const fallback = Object.entries(INVOICE_GENERATION_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  );

  return fallback?.[1] ?? INVOICE_GENERATION_FALLBACK_ERROR;
};

const PROMOTION_DISCOUNT_ERROR_MESSAGES: Record<string, string> = {
  PROMOTION_NOT_FOUND: "Không tìm thấy mã khuyến mãi.",
  PROMOTION_INACTIVE: "Mã khuyến mãi không còn hoạt động.",
  PROMOTION_EXPIRED: "Mã khuyến mãi đã hết hạn.",
  PROMOTION_NOT_STARTED: "Mã khuyến mãi chưa đến thời gian áp dụng.",
  PROMOTION_USAGE_LIMIT_REACHED:
    "Mã khuyến mãi đã đạt giới hạn sử dụng.",
  INVALID_STATUS_TRANSITION: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  INVOICE_ALREADY_PAID:
    "Hóa đơn này đã được thanh toán.",
  INVOICE_PROMOTION_ALREADY_APPLIED:
    "Hóa đơn này đã được áp dụng mã khuyến mãi này rồi.",
  PROMOTION_CHANGE_NOT_ALLOWED:
    "Không thể thay đổi mã khuyến mãi sau khi đã áp dụng.",
  ORDER_NOT_DISCOUNTABLE:
    "Không thể áp dụng khuyến mãi cho đơn đã đóng hoặc đã hủy.",
  INVOICE_ALREADY_DISCOUNTED:
    "Hóa đơn này đã có khuyến mãi, không thể áp dụng thêm.",
};

const PROMOTION_DISCOUNT_MESSAGE_FALLBACKS: Record<string, string> = {
  "Promotion not found": PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_NOT_FOUND,
  "Promotion is inactive":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_INACTIVE,
  "Promotion has expired":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_EXPIRED,
  "Promotion has not started":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_NOT_STARTED,
  "Promotion usage limit has been reached":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_USAGE_LIMIT_REACHED,
  "Promotion is not valid":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
  "Invoice not found": PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  "Order not found": PROMOTION_DISCOUNT_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Invoice already paid": PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "Invoice has already been paid":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "Cannot apply a promotion to a paid invoice":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "The same promotion has already been applied to this invoice":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_PROMOTION_ALREADY_APPLIED,
  "This promotion has already been applied to this invoice":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_PROMOTION_ALREADY_APPLIED,
  "Cannot change promotion after one has already been applied":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_CHANGE_NOT_ALLOWED,
  "Changing the promotion on an invoice is not allowed":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_CHANGE_NOT_ALLOWED,
  "Order is not discountable":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.ORDER_NOT_DISCOUNTABLE,
  "Order cannot apply discount in its current status":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.ORDER_NOT_DISCOUNTABLE,
  "Invoice already has a discount":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_DISCOUNTED,
  "Invoice already has a promotion discount":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_DISCOUNTED,
};

const PROMOTION_DISCOUNT_FALLBACK_ERROR =
  "Không thể áp dụng khuyến mãi. Vui lòng thử lại.";

const getPromotionDiscountErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return (
      PROMOTION_DISCOUNT_ERROR_MESSAGES[error.code] ??
      PROMOTION_DISCOUNT_FALLBACK_ERROR
    );
  }

  const message = error instanceof Error ? error.message : "";
  const fallback = Object.entries(PROMOTION_DISCOUNT_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  );

  return fallback?.[1] ?? PROMOTION_DISCOUNT_FALLBACK_ERROR;
};

const PAYMENT_PROCESS_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_PAYABLE: "Không thể thanh toán đơn đã đóng hoặc đã hủy.",
  INVALID_INVOICE_TOTAL:
    "Hóa đơn có tổng tiền không hợp lệ.",
  INVOICE_ALREADY_PAID: "Hóa đơn này đã được thanh toán.",
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
};

const PAYMENT_PROCESS_MESSAGE_FALLBACKS: Record<string, string> = {
  "Order cannot be paid in its current status":
    PAYMENT_PROCESS_ERROR_MESSAGES.ORDER_NOT_PAYABLE,
  "Invoice subtotal must be greater than zero and total amount cannot be negative":
    PAYMENT_PROCESS_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  "Invoice has already been paid":
    PAYMENT_PROCESS_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "A paid payment already exists for this invoice":
    PAYMENT_PROCESS_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "Invoice not found": PAYMENT_PROCESS_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  "Order not found": PAYMENT_PROCESS_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Validation failed": PAYMENT_PROCESS_ERROR_MESSAGES.VALIDATION_ERROR,
  "Invalid enum value": PAYMENT_PROCESS_ERROR_MESSAGES.BAD_REQUEST,
  "Malformed or unreadable request body":
    PAYMENT_PROCESS_ERROR_MESSAGES.BAD_REQUEST,
};

const PAYMENT_PROCESS_FALLBACK_ERROR =
  "Không thể xử lý thanh toán. Vui lòng thử lại.";

const getPaymentProcessErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return (
      PAYMENT_PROCESS_ERROR_MESSAGES[error.code] ??
      PAYMENT_PROCESS_FALLBACK_ERROR
    );
  }

  const message = error instanceof Error ? error.message : "";
  const fallback = Object.entries(PAYMENT_PROCESS_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  );

  return fallback?.[1] ?? PAYMENT_PROCESS_FALLBACK_ERROR;
};

const INVOICE_UI_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  ORDER_ALREADY_INVOICED:
    "Đơn hàng đã có hóa đơn nên không thể chỉnh sửa món.",
  INVOICE_ALREADY_PAID: "Hóa đơn này đã được thanh toán.",
  ORDER_NOT_PAYABLE: "Không thể thanh toán đơn đã đóng hoặc đã hủy.",
  INVALID_INVOICE_TOTAL: "Hóa đơn có tổng tiền không hợp lệ.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
};

const INVOICE_UI_MESSAGE_FALLBACKS: Record<string, string> = {
  "Invoice not found": INVOICE_UI_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  "Order not found": INVOICE_UI_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Invoice has already been paid":
    INVOICE_UI_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "A paid payment already exists for this invoice":
    INVOICE_UI_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "Order cannot be paid in its current status":
    INVOICE_UI_ERROR_MESSAGES.ORDER_NOT_PAYABLE,
  "Invoice subtotal must be greater than zero and total amount cannot be negative":
    INVOICE_UI_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  "Validation failed": INVOICE_UI_ERROR_MESSAGES.VALIDATION_ERROR,
  "Invalid enum value": INVOICE_UI_ERROR_MESSAGES.BAD_REQUEST,
  "Malformed or unreadable request body":
    INVOICE_UI_ERROR_MESSAGES.BAD_REQUEST,
};

const INVOICE_DETAIL_LOAD_FALLBACK_ERROR =
  "Không thể tải chi tiết hóa đơn.";
const SEND_INVOICE_SUCCESS_MESSAGE =
  "Đã ghi nhận gửi hóa đơn mô phỏng.";
const SEND_INVOICE_FALLBACK_ERROR =
  "Không thể gửi hóa đơn. Vui lòng thử lại.";

const getInvoiceUiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (error instanceof ApiClientError && error.code) {
    return INVOICE_UI_ERROR_MESSAGES[error.code] ?? fallbackMessage;
  }

  const message = error instanceof Error ? error.message : "";
  const fallback = Object.entries(INVOICE_UI_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  );

  return fallback?.[1] ?? fallbackMessage;
};

const CashierOrders = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<"menu" | "table">("menu");
  const [activeArea, setActiveArea] = useState<string>("all");
  const [tableFilter, setFilter] = useState("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [activeMenuCategory, setActiveMenuCategory] = useState("all");
  const [tables, setTables] = useState<TableItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [assistanceRequests, setAssistanceRequests] = useState<
    AssistanceRequest[]
  >([]);
  const [search, setSearch] = useState("");
  const [noteModal, setNoteModal] = useState<{
    open: boolean;
    itemId: string | null;
    text: string;
  }>({ open: false, itemId: null, text: "" });
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    orderId: string | null;
    itemId: string | null;
    text: string;
  }>({ open: false, orderId: null, itemId: null, text: "" });
  const [removeConfirmModal, setRemoveConfirmModal] = useState<{
    open: boolean;
    orderId: string | null;
    orderItemId: string | null;
  }>({ open: false, orderId: null, orderItemId: null });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [successTotal, setSuccessTotal] = useState<number | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [backendOrderId, setBackendOrderId] = useState("");
  const [invoiceChecked, setInvoiceChecked] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(
    null,
  );
  const [promotionCode, setPromotionCode] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceAction, setInvoiceAction] = useState<string | null>(null);
  const [invoiceMessage, setInvoiceMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [orderActionMessage, setOrderActionMessage] = useState<{
    type: "error";
    text: string;
  } | null>(null);

  // ── Cash shift state ──────────────────────────────────────────────────────
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    getMyShift()
      .then((s) => {
        setShift(s);
        if (!s) setShiftModalOpen(true);
      })
      .catch(() => {
        setShift(null);
        setShiftModalOpen(true);
      })
      .finally(() => setShiftLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setTablesLoading(true);
    listTables()
      .then((res) => {
        const items = res
          .filter((t) => t.active)
          .sort((a, b) => a.order - b.order)
          .map(toTableItem);
        setTables(items);
        // default to first area
        const firstArea = items[0]?.area;
        if (firstArea) setActiveArea(firstArea);
      })
      .catch(() => {
        /* silently keep empty */
      })
      .finally(() => setTablesLoading(false));
  }, []);

  const loadMenu = () => {
    Promise.all([listCategories(), searchItems({ available: true, size: 200 })])
      .then(([cats, page]) => {
        setMenuCategories(cats);
        setMenuItems(page.data.map((item) => ({ ...item, qty: 0 })));
      })
      .catch(() => {
        /* silently keep empty */
      });
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // "Call waiter" assistance requests raised by guests, polled for the bell dropdown.
  useEffect(() => {
    const fetchAssistance = async () => {
      try {
        setAssistanceRequests(await listPendingAssistance());
      } catch (err) {
        console.error(err);
      }
    };
    void fetchAssistance();
    const intv = setInterval(fetchAssistance, 3000);
    return () => clearInterval(intv);
  }, []);

  // Live orders, polled to keep table occupancy and the order panel in sync with the kitchen.
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await listOrders(0, 100);
        setActiveOrders(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    void fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Overlay live order totals onto the table grid (amount/guests/item count, orderId link).
  useEffect(() => {
    setTables((prevTables) =>
      prevTables.map((t) => {
        const tableOrders = activeOrders.filter(
          (o) => o.tableId === t.id && ACTIVE_ORDER_STATUSES.includes(o.status),
        );
        if (tableOrders.length === 0) {
          return {
            ...t,
            orderId: null,
            occupied: false,
            amount: 0,
            items: 0,
            status: "AVAILABLE",
          };
        }
        const itemsCount = tableOrders.reduce(
          (total, order) =>
            total + order.items.reduce((sum, item) => sum + item.quantity, 0),
          0,
        );
        const totalAmount = tableOrders.reduce(
          (total, order) => total + order.totalAmount,
          0,
        );
        return {
          ...t,
          occupied: true,
          status: "OCCUPIED",
          amount: totalAmount,
          items: itemsCount,
          orderId: tableOrders[0].id,
        };
      }),
    );
  }, [activeOrders]);

  useEffect(() => {
    if (successTotal !== null) {
      const t = setTimeout(() => setSuccessTotal(null), 3500);
      return () => clearTimeout(t);
    }
  }, [successTotal]);

  const areas = ["all", ...Array.from(new Set(tables.map((t) => t.area)))];
  const tablesInArea =
    activeArea === "all" ? tables : tables.filter((t) => t.area === activeArea);
  const selectedTable = tables.find((t) => t.selected) ?? null;

  // Build the order panel's item list for the selected table from the live orders feed.
  useEffect(() => {
    if (!selectedTable || !selectedTable.occupied) {
      setOrderItems([]);
      return;
    }
    const tableOrders = activeOrders.filter(
      (o) =>
        o.tableId === selectedTable.id &&
        ACTIVE_ORDER_STATUSES.includes(o.status),
    );
    if (tableOrders.length === 0) {
      setOrderItems([]);
      return;
    }
    const combinedItems: OrderItem[] = tableOrders.flatMap((order) =>
      order.items.map((i) => ({
        id: i.orderItemId,
        name: i.menuItemName,
        qty: i.quantity,
        price: i.unitPrice,
        status: COOKING_STATUS_LABEL[i.cookingStatus],
        notes: i.note || "",
        rejectionNote: i.rejectionNote,
        orderId: order.id,
      })),
    );
    setOrderItems(combinedItems);
  }, [selectedTable?.id, selectedTable?.occupied, activeOrders]);

  const hasSelectedMenu = cart.length > 0;
  const selectedOrderId = selectedTable?.orderId ?? "";
  const selectedOrder = activeOrders.find((order) => order.id === selectedOrderId);
  const selectedOrderItemCount =
    selectedOrder?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const nonPayableRejectedItems =
    selectedOrder?.items
      .filter((item) => item.cookingStatus === "REJECTED")
      .map((item) => ({
        id: item.orderItemId,
        name: item.menuItemName,
        quantity: item.quantity,
        note: item.rejectionNote,
      })) ?? [];

  const pendingOrders = activeOrders.filter(
    (o) => o.status === "PENDING" || (o.status !== "CANCELLED" && o.status !== "CLOSED" && o.items.some((i) => i.cookingStatus === "PENDING"))
  );
  const pendingOrdersCount = pendingOrders.length;
  const orderHasInvoice =
    !!invoice && !!selectedOrderId && invoice.orderId === selectedOrderId;
  const currentOrderInvoice = orderHasInvoice ? invoice : null;
  const currentOrderInvoiceDetail =
    currentOrderInvoice &&
    invoiceDetail?.id === currentOrderInvoice.id &&
    invoiceDetail.orderId === selectedOrderId
      ? invoiceDetail
      : null;
  const orderIsFinal =
    selectedOrder?.status === "CLOSED" || selectedOrder?.status === "CANCELLED";
  const canCloseSelectedOrder =
    !!selectedOrder && !!currentOrderInvoice?.paid && !orderIsFinal;
  const emptyOrderWithoutInvoice =
    !!selectedOrder &&
    invoiceChecked &&
    !currentOrderInvoice &&
    !orderIsFinal &&
    selectedOrderItemCount === 0;
  const disableItemMutation = orderHasInvoice || orderIsFinal;
  const itemMutationDisabledMessage = orderHasInvoice
    ? ORDER_ALREADY_INVOICED_MESSAGE
    : ORDER_FINAL_ITEM_LOCK_MESSAGE;

  const showItemMutationBlockedMessage = () => {
    setOrderActionMessage({
      type: "error",
      text: itemMutationDisabledMessage,
    });
  };

  const resetInvoiceLink = () => {
    setBackendOrderId("");
    setInvoiceChecked(false);
    setInvoice(null);
    setInvoiceDetail(null);
    setPromotionCode("");
    setInvoiceAction(null);
    setInvoiceMessage(null);
    setPaymentOpen(false);
    setPaymentError("");
    setPaymentProcessing(false);
    setOrderActionMessage(null);
  };

  const loadInvoiceForOrder = async (orderId: string) => {
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      setInvoiceMessage({
        type: "error",
        text: "Vui lòng chọn đơn hàng trước khi tạo hóa đơn",
      });
      return null;
    }

    setInvoiceLoading(true);
    setInvoiceMessage(null);
    try {
      const foundInvoice =
        (await getInvoices({ orderId: normalizedOrderId }))[0] ?? null;
      setInvoiceChecked(true);
      setInvoice(foundInvoice);
      setInvoiceDetail(null);

      if (!foundInvoice) return null;

      const detailData = await getInvoiceById(foundInvoice.id);
      setInvoiceDetail(detailData);
      return foundInvoice;
    } catch (loadError) {
      setInvoiceMessage({
        type: "error",
        text: getInvoiceUiErrorMessage(
          loadError,
          INVOICE_DETAIL_LOAD_FALLBACK_ERROR,
        ),
      });
      return null;
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    const invoiceOrderId = selectedOrderId.trim();
    if (!invoiceOrderId) {
      setInvoiceMessage({
        type: "error",
        text: "Vui lòng chọn đơn hàng trước khi tạo hóa đơn",
      });
      return;
    }
    if (emptyOrderWithoutInvoice) {
      setPaymentOpen(false);
      setInvoiceMessage(null);
      setOrderActionMessage({
        type: "error",
        text: EMPTY_ORDER_MESSAGE,
      });
      return;
    }
    setInvoiceAction("generate");
    setInvoiceMessage(null);
    setOrderActionMessage(null);
    try {
      setBackendOrderId(invoiceOrderId);
      await generateInvoice({
        orderId: invoiceOrderId,
        promotionCode: null,
      });
      const createdInvoice = await loadInvoiceForOrder(invoiceOrderId);
      if (createdInvoice) setPaymentOpen(true);
      setInvoiceMessage({
        type: "success",
        text: "Hóa đơn đã được tạo và sẵn sàng thanh toán.",
      });
    } catch (generateError) {
      const message = getInvoiceGenerationErrorMessage(generateError);
      setInvoiceMessage({
        type: "error",
        text: message,
      });
      setOrderActionMessage({
        type: "error",
        text: message,
      });
      setPaymentOpen(false);
    } finally {
      setInvoiceAction(null);
    }
  };

  const handleApplyDiscount = async () => {
    if (!invoice || !promotionCode.trim()) return;
    setInvoiceAction("discount");
    setInvoiceMessage(null);
    try {
      await applyInvoiceDiscount(invoice.id, promotionCode.trim());
      await loadInvoiceForOrder(invoice.orderId);
      setPromotionCode("");
      setInvoiceMessage({
        type: "success",
        text: "Áp dụng khuyến mãi thành công",
      });
    } catch (discountError) {
      setInvoiceMessage({
        type: "error",
        text: getPromotionDiscountErrorMessage(discountError),
      });
    } finally {
      setInvoiceAction(null);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setInvoiceAction("send");
    setInvoiceMessage(null);
    try {
      await sendInvoice(invoice.id);
      setInvoiceMessage({ type: "success", text: SEND_INVOICE_SUCCESS_MESSAGE });
    } catch (sendError) {
      setInvoiceMessage({
        type: "error",
        text: getInvoiceUiErrorMessage(sendError, SEND_INVOICE_FALLBACK_ERROR),
      });
    } finally {
      setInvoiceAction(null);
    }
  };

  const handlePrintInvoice = () => {
    if (!invoiceDetail) return;
    const cashierName = getStoredUser()?.fullName || "Duy Tan";
    if (
      !printCashierInvoice(
        invoiceDetail,
        selectedTable?.name || "-",
        cashierName,
      )
    ) {
      setInvoiceMessage({
        type: "error",
        text: "Trình duyệt đã chặn cửa sổ in hóa đơn",
      });
    }
  };

  const handleProcessPayment = async (method: PaymentMethod) => {
    if (!invoice) {
      setPaymentError("Không xác định được hóa đơn cần thanh toán");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");
    try {
      const createdPayment = await processPayment(invoice.id, method);
      setPaymentOpen(false);
      setSuccessTotal(createdPayment.amount);
      await loadInvoiceForOrder(invoice.orderId);
      setInvoiceMessage({ type: "success", text: "Thanh toán thành công" });
    } catch (processError) {
      setPaymentError(getPaymentProcessErrorMessage(processError));
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleQtyChange = (id: string, delta: number) => {
    if (delta > 0) {
      const menuItem = menuItems.find((m) => m.id === id);
      if (menuItem) {
        setCart((prev) => {
          const existing = prev.find((c) => c.menuItemId === id);
          if (existing) {
            // Increment qty on existing entry
            return prev.map((c) =>
              c.menuItemId === id ? { ...c, qty: c.qty + 1 } : c,
            );
          }
          // Add new grouped entry
          return [
            ...prev,
            {
              cartItemId: Math.random().toString(36).substring(2, 11),
              menuItemId: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              qty: 1,
              note: "",
            },
          ];
        });
      }
    } else {
      setCart((prev) => {
        const existing = prev.find((c) => c.menuItemId === id);
        if (!existing) return prev;
        if (existing.qty <= 1) {
          // Remove entry entirely
          return prev.filter((c) => c.menuItemId !== id);
        }
        // Decrement qty
        return prev.map((c) =>
          c.menuItemId === id ? { ...c, qty: c.qty - 1 } : c,
        );
      });
    }
    setMenuItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item,
      ),
    );
  };

  const handleTableSelect = (id: string | null) => {
    setTables((ts) => ts.map((t) => ({ ...t, selected: t.id === id })));
    resetInvoiceLink();
    if (id) {
      const selected = tables.find((t) => t.id === id);
      if (selected) {
        setActiveArea(selected.area);
      }
    }
  };

  useEffect(() => {
    if (
      selectedTable &&
      selectedTable.occupied &&
      selectedTable.orderId &&
      selectedOrder?.id === selectedTable.orderId &&
      !backendOrderId
    ) {
      setBackendOrderId(selectedTable.orderId);
      loadInvoiceForOrder(selectedTable.orderId);
    }
  }, [selectedTable?.orderId, selectedTable?.occupied, selectedOrder?.id, backendOrderId]);

  const handleStatusChange = async (
    orderId: string,
    orderItemId: string,
    statusLabel: string,
  ) => {
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    const status = COOKING_STATUS_FROM_LABEL[statusLabel];
    if (!status) return;

    if (status === "REJECTED") {
      setRejectModal({ open: true, orderId, itemId: orderItemId, text: "" });
      return;
    }

    setOrderActionMessage(null);
    try {
      await updateOrderItemStatus(orderId, orderItemId, status);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };
  const handleRemoveItem = (orderId: string, orderItemId: string) => {
    setRemoveConfirmModal({ open: true, orderId, orderItemId });
  };

  const executeRemoveItem = async () => {
    const { orderId, orderItemId } = removeConfirmModal;
    setRemoveConfirmModal({ open: false, orderId: null, orderItemId: null });
    if (!orderId || !orderItemId) return;
    if (orderId === "cart") {
      const itemToRemove = cart.find((c) => c.cartItemId === orderItemId);
      if (itemToRemove) {
        setCart((prev) => prev.filter((c) => c.cartItemId !== orderItemId));
        setMenuItems((items) =>
          items.map((item) =>
            item.id === itemToRemove.menuItemId
              ? { ...item, qty: Math.max(0, item.qty - 1) }
              : item,
          ),
        );
      }
      return;
    }
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    try {
      await removeOrderItem(orderId, orderItemId);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleCancelOrder = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;
    setOrderActionMessage(null);
    try {
      await Promise.all(
        orderIds.map((orderId) => cancelOrder(orderId, "Hủy bởi thu ngân")),
      );
      setOrderActionMessage(null);
      setRefreshTrigger((t) => t + 1);
      setCart([]);
      handleTableSelect(null);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleOpenNote = (itemId: string, currentText: string) =>
    setNoteModal({ open: true, itemId, text: currentText });
  const handleConfirmNote = async (itemId: string, text: string) => {
    const isDraft = cart.some((i) => i.cartItemId === itemId);
    
    if (isDraft) {
      setCart((prevCart) =>
        prevCart.map((i) =>
          i.cartItemId === itemId ? { ...i, note: text } : i,
        ),
      );
    } else {
      // Find the item in orderItems to get the orderId
      const item = orderItems.find((i) => i.id === itemId);
      if (item && item.orderId) {
        if (disableItemMutation) {
          showItemMutationBlockedMessage();
          return;
        }
        try {
          await updateOrderItemNote(item.orderId, itemId, text);
          setOrderItems((items) =>
            items.map((i) => (i.id === itemId ? { ...i, notes: text } : i)),
          );
          setRefreshTrigger((t) => t + 1);
        } catch (e) {
          console.error(e);
          setOrderActionMessage({
            type: "error",
            text: getOrderActionErrorMessage(e),
          });
        }
      }
    }
    setNoteModal({ open: false, itemId: null, text: "" });
  };
  const handleCancelNote = () =>
    setNoteModal({ open: false, itemId: null, text: "" });

  const handleOpenReject = (orderId: string, itemId: string) => {
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    setRejectModal({ open: true, orderId, itemId, text: "" });
  };

  const handleConfirmReject = async (
    orderId: string,
    itemId: string,
    text: string,
  ) => {
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    try {
      await updateOrderItemStatus(orderId, itemId, "REJECTED", text);
      setRefreshTrigger((t) => t + 1);
      setRejectModal({ open: false, orderId: null, itemId: null, text: "" });
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleCancelReject = () =>
    setRejectModal({ open: false, orderId: null, itemId: null, text: "" });

  const handleCloseOrder = async () => {
    if (!selectedOrderId) return;
    const closedOrderId = selectedOrderId;
    const closedTableId = selectedTable?.id;
    setOrderActionMessage(null);
    try {
      await closeOrder(closedOrderId);
      resetInvoiceLink();
      setActiveOrders((orders) =>
        orders.filter((order) => order.id !== closedOrderId),
      );
      setOrderItems([]);
      if (closedTableId) {
        setTables((currentTables) =>
          currentTables.map((table) =>
            table.id === closedTableId
              ? {
                  ...table,
                  orderId: null,
                  occupied: false,
                  amount: 0,
                  items: 0,
                  status: "AVAILABLE",
                }
              : table,
          ),
        );
      }
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      setTab("menu");
      return;
    }
    if (!selectedTable) return;
    try {
      await createOrder(
        selectedTable.id,
        cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.qty,
          note: c.note,
        })),
      );
      setCart([]);
      setMenuItems((items) => items.map((i) => ({ ...i, qty: 0 })));
      setTab("table");
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItems = async () => {
    if (!selectedTable || !selectedTable.orderId) return;
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    try {
      await addOrderItems(
        selectedTable.orderId,
        cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.qty,
          note: c.note,
        })),
      );
      setCart([]);
      setMenuItems((items) => items.map((i) => ({ ...i, qty: 0 })));
      setTab("table");
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleResolveAssistance = async (id: string) => {
    try {
      await respondAssistance(id);
      setAssistanceRequests((reqs) => reqs.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptPendingOrder = async (order: Order) => {
    try {
      await acceptOrder(order.id);
      setRefreshTrigger(t => t + 1);
      setShowQRModal(false);
      handleTableSelect(order.tableId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPendingOrder = async (order: Order) => {
    try {
      await cancelOrder(order.id, "Thu ngân hủy (QR)");
      setRefreshTrigger(t => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveItemFromPending = (orderId: string, orderItemId: string) => {
    setRejectModal({ open: true, orderId, itemId: orderItemId, text: "" });
  };

  const filteredMenu = menuItems.filter((i) => {
    const matchesCategory =
      activeMenuCategory === "all" || i.categoryId === activeMenuCategory;
    const matchesSearch =
      !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const menuCategoryPills: Category[] = [
    { id: "all", label: "Tất Cả", count: menuItems.length },
    ...menuCategories.map((c) => ({
      id: c.id,
      label: c.name,
      count: c.itemCount,
    })),
  ];
  const tableCounts: Record<string, number> = {
    all: tablesInArea.length,
    used: tablesInArea.filter((t) => t.occupied).length,
    empty: tablesInArea.filter((t) => !t.occupied).length,
  };
  const checkoutDisabled =
    invoiceAction !== null ||
    invoiceLoading ||
    !selectedOrderId ||
    emptyOrderWithoutInvoice ||
    (currentOrderInvoice
      ? !currentOrderInvoiceDetail || currentOrderInvoice.paid
      : !invoiceChecked);
  const checkoutLabel = currentOrderInvoice?.paid
    ? "Đã thanh toán"
    : currentOrderInvoice
      ? "Mở thanh toán"
      : invoiceChecked
        ? "Tạo hóa đơn"
        : "Đang kiểm tra hóa đơn";

  if (shiftLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f5] font-sans">
        <span className="text-[#636566] text-[16px]">
          Đang tải ca làm việc...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] overflow-hidden font-sans">
      {!shift && shiftModalOpen && (
        <OpenShiftModal
          onOpened={(s) => {
            setShift(s);
            setShiftModalOpen(false);
          }}
          onLogout={handleLogout}
          onClose={() => setShiftModalOpen(false)}
        />
      )}

      <Header
        employeeName={user?.fullName ?? user?.username ?? "Nhân viên"}
        roleLabel={ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? "Thu ngân"}
        role={user?.role}
        shift={shift}
        assistanceRequests={assistanceRequests}
        onResolveRequest={handleResolveAssistance}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePw(true)}
        onCloseShift={() => setShowCloseShift(true)}
        onCashMovement={() => setShowCashMovement(true)}
      />

      {!shift && !shiftModalOpen && (
        <div className="mx-3 lg:mx-4 mt-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-amber-700 text-[14px]">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span>Ca thu ngân chưa mở — không thể tạo đơn hàng mới.</span>
          </div>
          <button
            onClick={() => setShiftModalOpen(true)}
            className="shrink-0 h-8 px-3 rounded-lg bg-amber-500 text-white text-[13px] font-medium hover:bg-amber-600 transition-colors"
          >
            Mở ca
          </button>
        </div>
      )}

      <div className="flex flex-1 gap-3 lg:gap-4 p-3 lg:p-4 overflow-hidden">
        <div className="flex flex-col flex-1 gap-2.5 min-w-0 overflow-hidden">
          {tab === "table" && (
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 min-h-[38px]">
              <div className="flex gap-2 flex-wrap">
                {areas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setActiveArea(area)}
                    className={`px-4 py-1.5 rounded-[8px] border border-[#e8e8e8] text-[14px] transition-colors ${activeArea === area ? "bg-white text-[#37383a]" : "bg-[#f5f5f5] text-[#797b7c] hover:bg-white"}`}
                  >
                    {area === "all" ? "Tất cả khu vực" : area}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-5">
                {TABLE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="flex items-center gap-2 text-[14px]"
                  >
                    <div
                      className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 ${tableFilter === f.id ? "border-[#025cca]" : "border-[#37383a]"}`}
                    >
                      {tableFilter === f.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#025cca]" />
                      )}
                    </div>
                    <span className="text-black">
                      {f.label} ({tableCounts[f.id]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between shrink-0">
            <div className="flex h-[52px] rounded-[12px] overflow-hidden border-2 border-[#e8e8e8]">
              {(
                [
                  ["table", "Phòng bàn"],
                  ["menu", "Menu"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setSearch("");
                  }}
                  className={`flex-1 min-w-[120px] text-[18px] lg:text-[20px] transition-colors ${tab === id ? "bg-[#dceefe] text-[#025cca] font-semibold" : "bg-[#f5f5f5] text-[#636566] font-medium"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-3 bg-white rounded-[12px] px-4 h-[44px] w-[160px] md:w-[220px] lg:w-[340px]">
                <SearchIcon className="w-5 h-5 text-[#797b7c] shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === "menu" ? "Tìm món" : "Tìm bàn"}
                  className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
                />
              </div>
              {tab === "table" && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="bg-white shadow-sm border border-[#e8e8e8] px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-semibold text-[#202325] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 text-[#202325]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                    <span>{pendingOrdersCount} lượt gọi món qua QR</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-[24px] font-semibold text-[#202325]">
              {tab === "menu" ? "Chọn món" : "Chọn bàn"}
            </h2>
          </div>

          <div className="flex flex-col flex-1 gap-2.5 overflow-hidden">
            {tab === "menu" ? (
              <MenuView
                items={filteredMenu}
                categories={menuCategoryPills}
                activeCategory={activeMenuCategory}
                onCategoryChange={setActiveMenuCategory}
                onRefresh={loadMenu}
                onQtyChange={handleQtyChange}
              />
            ) : tablesLoading ? (
              <div className="flex-1 flex items-center justify-center text-[#797b7c] text-[14px]">
                Đang tải danh sách bàn...
              </div>
            ) : (
              <TableView
                tables={tablesInArea}
                onSelect={handleTableSelect}
                filter={tableFilter}
              />
            )}
          </div>
        </div>

        <OrderPanel
          items={[
            ...orderItems,
            ...cart.map((c) => ({
              id: c.cartItemId,
              name: c.name,
              qty: c.qty,
              notes: c.note,
              status: "MỚI",
              price: c.price,
              orderId: "cart",
            })),
          ]}
          hasSelectedMenu={hasSelectedMenu}
          onStatusChange={handleStatusChange}
          onCheckout={() => {
            setOrderActionMessage(null);
            setPaymentError("");
            if (currentOrderInvoice) {
              setPaymentOpen(true);
            } else {
              void handleGenerateInvoice();
            }
          }}
          onCreateOrder={handleCreateOrder}
          onAddItems={handleAddItems}
          onNote={handleOpenNote}
          onRemoveItem={handleRemoveItem}
          onRejectItem={handleOpenReject}
          onCancelOrder={handleCancelOrder}
          selectedTable={selectedTable}
          checkoutDisabled={checkoutDisabled}
          checkoutLabel={checkoutLabel}
          shiftOpen={!!shift}
          invoicePaid={canCloseSelectedOrder}
          itemMutationDisabled={disableItemMutation}
          itemMutationDisabledMessage={itemMutationDisabledMessage}
          actionMessage={null}
          emptyOrderMessage={
            emptyOrderWithoutInvoice ? EMPTY_ORDER_MESSAGE : undefined
          }
          cancelOrderIds={
            emptyOrderWithoutInvoice && selectedOrderId
              ? [selectedOrderId]
              : undefined
          }
          onCloseOrder={handleCloseOrder}
          invoiceTools={null}
        />
      </div>

      {showQRModal && (
        <QROrderConfirmationModal
          orders={activeOrders}
          tables={tables}
          onClose={() => setShowQRModal(false)}
          onAccept={handleAcceptPendingOrder}
          onReject={handleRejectPendingOrder}
          onRemoveItem={handleRemoveItemFromPending}
        />
      )}

      {removeConfirmModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-gray-600 mb-6">Bạn có chắc chắn muốn xóa món này khỏi đơn hàng?</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setRemoveConfirmModal({ open: false, orderId: null, orderItemId: null })}
                className="flex-1 border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => void executeRemoveItem()}
                className="flex-1 bg-[#dc2f02] text-white font-bold py-2.5 rounded-xl hover:bg-[#9d0208] transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {orderActionMessage && orderActionMessage.type === "error" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Thông báo</h3>
            <p className="text-sm text-gray-600 mb-6">{orderActionMessage.text}</p>
            <button 
              onClick={() => setOrderActionMessage(null)} 
              className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <BottomNav active="orders" />

      {paymentOpen && currentOrderInvoiceDetail && (
        <PaymentModal
          invoice={currentOrderInvoiceDetail}
          table={selectedTable}
          processing={paymentProcessing}
          error={paymentError}
          promotionCode={promotionCode}
          action={invoiceAction}
          invoiceMessage={invoiceMessage}
          nonPayableItems={nonPayableRejectedItems}
          onClose={() => setPaymentOpen(false)}
          onConfirm={(method) => void handleProcessPayment(method)}
          onPromotionCodeChange={setPromotionCode}
          onApplyDiscount={() => void handleApplyDiscount()}
          onPrint={handlePrintInvoice}
          onSend={() => void handleSendInvoice()}
        />
      )}
      {successTotal !== null && (
        <SuccessToast
          total={successTotal}
          onDismiss={() => setSuccessTotal(null)}
        />
      )}
      {noteModal.open && noteModal.itemId !== null && (
        <AddNoteModal
          itemId={noteModal.itemId}
          initialText={noteModal.text}
          onConfirm={handleConfirmNote}
          onCancel={handleCancelNote}
        />
      )}
      {rejectModal.open &&
        rejectModal.itemId !== null &&
        rejectModal.orderId !== null && (
          <AddNoteModal
            itemId={rejectModal.itemId}
            initialText=""
            onConfirm={(itemId, text) =>
              handleConfirmReject(rejectModal.orderId!, itemId, text)
            }
            onCancel={handleCancelReject}
            title="Lý do hủy món"
          />
        )}
      {showChangePw && (
        <ChangePasswordModal onClose={() => setShowChangePw(false)} />
      )}
      {showCloseShift && shift && (
        <CloseShiftModal
          shift={shift}
          onClosed={() => {
            setShift(null);
            setShowCloseShift(false);
          }}
          onCancel={() => setShowCloseShift(false)}
        />
      )}
      {showCashMovement && shift && (
        <CashMovementModal
          shift={shift}
          onUpdated={(s) => setShift(s)}
          onClose={() => setShowCashMovement(false)}
        />
      )}
    </div>
  );
};
export default CashierOrders;
