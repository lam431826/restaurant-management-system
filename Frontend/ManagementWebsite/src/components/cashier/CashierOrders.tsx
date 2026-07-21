import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRealtime } from "../../hooks/useRealtime";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../api/auth";
import { ApiError } from "../../services/api";
import { ApiClientError } from "../../services/apiClient";
import {
  getMyShift,
  getOpenNormalShifts,
  mergeFloatingShift,
} from "../../services/shiftService";
import type { ShiftSummary, OpenShiftBrief } from "../../services/shiftService";
import { OpenShiftModal } from "./orders/OpenShiftModal";
import { CloseShiftModal } from "./orders/CloseShiftModal";
import { CashMovementModal } from "./orders/CashMovementModal";
import { listTables } from "../../services/tableService";
import {
  checkInReservation,
  markNoShowReservation,
  cancelStaffReservation,
} from "../../services/reservationApi";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import {
  applyInvoiceDiscount,
  generateInvoice,
  getInvoiceById,
  getInvoices,
  mergeInvoices,
  sendInvoice,
  splitInvoice,
} from "../../services/invoiceApi";
import type {
  InvoiceDetail,
  InvoiceSummary,
  MergeInvoiceRequest,
  SplitInvoiceRequest,
} from "../../services/invoiceApi";
import {
  processCashPayment,
  initiateQrPayment as initiateQrPaymentApi,
  simulateQrPaymentSuccess,
  cancelQrPayment as cancelQrPaymentApi,
} from "../../services/paymentApi";
import type { Payment } from "../../services/paymentApi";
import { listCategories, searchItems } from "../../services/menuService";
import type { MenuCategory } from "../../services/menuService";
import {
  addOrderItems,
  cancelOrder,
  createOrder,
  closeOrder,
  getOrder,
  listOrders,
  listPendingAssistance,
  acceptOrder,
  removeOrderItem,
  respondAssistance,
  updateOrderItemStatus,
  updateOrderItemNote,
  updateOrderCustomer,
} from "../../services/orderApi";
import type {
  AssistanceRequest,
  Order,
  OrderCustomerInput,
} from "../../services/orderApi";

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
import { ReservationPanel } from "./orders/ReservationPanel";
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
  CANNOT_CANCEL_INVOICED_ORDER: "Không thể hủy đơn vì đơn đã có hóa đơn.",
  CANNOT_CANCEL_PAID_ORDER: "Không thể hủy đơn vì hóa đơn đã được thanh toán.",
  CANNOT_CANCEL_ORDER_ITEMS_NOT_PENDING:
    "Không thể hủy đơn vì có món đã được bếp xử lý hoặc phục vụ.",
  ORDER_ITEM_STATUS_TRANSITION_NOT_ALLOWED:
    "Không thể hủy món ở trạng thái hiện tại.",
  ORDER_ITEM_REMOVE_NOT_ALLOWED: "Chỉ có thể xóa món khi món đang chờ duyệt.",
  TABLE_NOT_AVAILABLE:
    "Bàn đã có đơn đang hoạt động, đang được sử dụng hoặc có lịch đặt. Danh sách bàn đã được làm mới.",
  TABLE_NOT_FOUND: "Không tìm thấy bàn. Vui lòng làm mới danh sách bàn.",
  INVALID_STATUS_TRANSITION:
    "Thao tác đổi trạng thái không hợp lệ. Vui lòng dùng đúng luồng xử lý.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  TABLE_HAS_ACTIVE_ORDER: "Bàn này đã có đơn hàng đang xử lý.",
};

const ORDER_ACTION_FALLBACK_ERROR =
  "Thao tác thất bại. Vui lòng thử lại hoặc kiểm tra trạng thái đơn.";

const getOrderActionErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code) {
    return (
      ORDER_ACTION_ERROR_MESSAGES[error.code] ?? ORDER_ACTION_FALLBACK_ERROR
    );
  }

  return ORDER_ACTION_FALLBACK_ERROR;
};

const INVOICE_GENERATION_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_INVOICEABLE: "Đơn hàng chưa đủ điều kiện tạo hóa đơn.",
  ORDER_NOT_READY_FOR_INVOICE: "Đơn hàng chưa đủ điều kiện tạo hóa đơn.",
  INVALID_ORDER_ITEMS: "Đơn hàng không có món hợp lệ để tạo hóa đơn.",
  INVALID_INVOICE_ITEMS: "Đơn hàng không có món hợp lệ để tạo hóa đơn.",
  INVALID_INVOICE_TOTAL: "Hóa đơn có tổng tiền không hợp lệ.",
  INVOICE_ALREADY_EXISTS: "Đơn hàng này đã có hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  PROMOTION_NOT_FOUND: "Không tìm thấy mã khuyến mãi.",
  PROMOTION_INACTIVE: "Mã khuyến mãi không còn hoạt động.",
  PROMOTION_EXPIRED: "Mã khuyến mãi đã hết hạn.",
  PROMOTION_NOT_STARTED: "Mã khuyến mãi chưa đến thời gian áp dụng.",
  PROMOTION_USAGE_LIMIT_REACHED: "Mã khuyến mãi đã đạt giới hạn sử dụng.",
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
  "Promotion is inactive": INVOICE_GENERATION_ERROR_MESSAGES.PROMOTION_INACTIVE,
  "Promotion has expired": INVOICE_GENERATION_ERROR_MESSAGES.PROMOTION_EXPIRED,
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
  PROMOTION_USAGE_LIMIT_REACHED: "Mã khuyến mãi đã đạt giới hạn sử dụng.",
  INVALID_STATUS_TRANSITION: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  INVOICE_ALREADY_PAID: "Hóa đơn này đã được thanh toán.",
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
  "Promotion is inactive": PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_INACTIVE,
  "Promotion has expired": PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_EXPIRED,
  "Promotion has not started":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_NOT_STARTED,
  "Promotion usage limit has been reached":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.PROMOTION_USAGE_LIMIT_REACHED,
  "Promotion is not valid":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
  "Invoice not found": PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  "Order not found": PROMOTION_DISCOUNT_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Invoice already paid":
    PROMOTION_DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
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
  INVALID_INVOICE_TOTAL: "Hóa đơn có tổng tiền không hợp lệ.",
  INVOICE_ALREADY_PAID: "Hóa đơn này đã được thanh toán.",
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  PAYMENT_NO_OPEN_SHIFT: "Bạn cần mở ca thu ngân trước khi thanh toán.",
  PAYMENT_METHOD_NOT_SUPPORTED: "Phương thức thanh toán này không được hỗ trợ.",
  PAYMENT_RECEIVED_AMOUNT_INVALID:
    "Số tiền khách đưa phải lớn hơn hoặc bằng số tiền cần thanh toán.",
  PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch thanh toán.",
  PAYMENT_NOT_PENDING: "Giao dịch QR này không còn ở trạng thái chờ xử lý.",
  PAYMENT_METHOD_MISMATCH:
    "Thao tác không phù hợp với phương thức thanh toán này.",
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
  "Shift is not opening": PAYMENT_PROCESS_ERROR_MESSAGES.PAYMENT_NO_OPEN_SHIFT,
  "Payment not found": PAYMENT_PROCESS_ERROR_MESSAGES.PAYMENT_NOT_FOUND,
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
  ORDER_ALREADY_INVOICED: "Đơn hàng đã có hóa đơn nên không thể chỉnh sửa món.",
  INVOICE_ALREADY_PAID: "Hóa đơn này đã được thanh toán.",
  INVOICE_CUSTOMER_EMAIL_REQUIRED:
    "Vui lòng nhập email khách hàng trước khi gửi hóa đơn.",
  MAIL_CONFIGURATION_MISSING: "Chưa cấu hình email gửi hóa đơn.",
  MAIL_DELIVERY_FAILED:
    "Gửi hóa đơn thất bại. Vui lòng kiểm tra cấu hình email hoặc thử lại.",
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
  "Malformed or unreadable request body": INVOICE_UI_ERROR_MESSAGES.BAD_REQUEST,
};

const INVOICE_DETAIL_LOAD_FALLBACK_ERROR = "Không thể tải chi tiết hóa đơn.";
const SEND_INVOICE_FALLBACK_ERROR = "Không thể gửi hóa đơn. Vui lòng thử lại.";
const SAVE_CUSTOMER_FALLBACK_ERROR =
  "Không thể lưu thông tin khách hàng. Vui lòng thử lại.";

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

const SPLIT_INVOICE_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: "Hóa đơn không còn tồn tại. Danh sách đã được làm mới.",
  ORDER_NOT_FOUND: "Đơn hàng không còn tồn tại. Dữ liệu đã được làm mới.",
  INVOICE_NOT_PAYABLE:
    "Trạng thái hóa đơn đã thay đổi và không còn có thể chia.",
  INVOICE_ALREADY_PAID: "Hóa đơn đã được thanh toán bởi một thao tác khác.",
  INVOICE_NOT_SPLITTABLE: "Hóa đơn không đáp ứng điều kiện để chia.",
  INVALID_INVOICE_SPLIT:
    "Nhóm chia hóa đơn chưa hợp lệ. Vui lòng kiểm tra lại các món.",
  INVALID_INVOICE_TOTAL:
    "Trạng thái tài chính của hóa đơn không hợp lệ để chia.",
  INVOICE_ALLOCATION_DATA_INVALID:
    "Dữ liệu phân bổ món không nhất quán. Vui lòng tải lại hóa đơn.",
};

const STALE_INVOICE_ERROR_CODES = new Set([
  "INVOICE_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "INVOICE_NOT_PAYABLE",
  "INVOICE_ALREADY_PAID",
  "INVOICE_NOT_SPLITTABLE",
  "INVALID_INVOICE_TOTAL",
  "INVOICE_ALLOCATION_DATA_INVALID",
]);

const getSplitInvoiceErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return (
      SPLIT_INVOICE_ERROR_MESSAGES[error.code] ??
      "Không thể chia hóa đơn. Vui lòng thử lại."
    );
  }
  return "Không thể chia hóa đơn. Vui lòng thử lại.";
};

const MERGE_INVOICE_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Vui lòng chọn ít nhất hai hóa đơn hợp lệ để gộp.",
  INVALID_INVOICE_MERGE: "Danh sách hóa đơn cần gộp không hợp lệ.",
  INVOICE_NOT_FOUND:
    "Một hóa đơn không còn tồn tại. Danh sách đã được làm mới.",
  ORDER_NOT_FOUND: "Đơn hàng không còn tồn tại. Dữ liệu đã được làm mới.",
  INVOICE_MERGE_ORDER_MISMATCH: "Các hóa đơn không thuộc cùng một đơn hàng.",
  INVOICE_NOT_MERGEABLE:
    "Trạng thái hóa đơn đã thay đổi và không còn có thể gộp.",
  INVOICE_ALREADY_PAID: "Một hóa đơn đã được thanh toán bởi thao tác khác.",
  INVALID_INVOICE_TOTAL:
    "Tổng tiền hóa đơn đã thay đổi hoặc không hợp lệ để gộp.",
  INVOICE_ALLOCATION_DATA_INVALID:
    "Dữ liệu phân bổ món không nhất quán. Danh sách đã được làm mới.",
  INVOICE_NOT_PAYABLE:
    "Một hóa đơn không còn ở trạng thái có thể thanh toán hoặc gộp.",
};

const STALE_MERGE_ERROR_CODES = new Set([
  "INVOICE_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "INVOICE_MERGE_ORDER_MISMATCH",
  "INVOICE_NOT_MERGEABLE",
  "INVOICE_ALREADY_PAID",
  "INVALID_INVOICE_TOTAL",
  "INVOICE_ALLOCATION_DATA_INVALID",
  "INVOICE_NOT_PAYABLE",
]);

const getMergeInvoiceErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return (
      MERGE_INVOICE_ERROR_MESSAGES[error.code] ??
      "Không thể gộp hóa đơn. Vui lòng thử lại."
    );
  }
  return "Không thể gộp hóa đơn. Vui lòng thử lại.";
};

const chooseInvoiceId = (
  invoiceList: InvoiceSummary[],
  preferredInvoiceId: string | null,
) => {
  if (
    preferredInvoiceId &&
    invoiceList.some((candidate) => candidate.id === preferredInvoiceId)
  ) {
    return preferredInvoiceId;
  }
  return (
    invoiceList.find(
      (candidate) => candidate.status === "ACTIVE" && !candidate.paid,
    )?.id ??
    invoiceList.find((candidate) => candidate.status === "ACTIVE")?.id ??
    invoiceList[0]?.id ??
    null
  );
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
  const [tablesLoading, setTablesLoading] = useState(true);
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
  const [cancelConfirmModal, setCancelConfirmModal] = useState<{
    open: boolean;
    orderIds: string[];
  }>({ open: false, orderIds: [] });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [successTotal, setSuccessTotal] = useState<number | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [invoiceListOrderId, setInvoiceListOrderId] = useState<string | null>(
    null,
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] =
    useState<InvoiceDetail | null>(null);
  const [promotionCode, setPromotionCode] = useState("");
  const [invoiceListLoading, setInvoiceListLoading] = useState(false);
  const [invoiceListError, setInvoiceListError] = useState("");
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [invoiceDetailError, setInvoiceDetailError] = useState("");
  const [invoiceAction, setInvoiceAction] = useState<string | null>(null);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerError, setCustomerError] = useState("");
  // Draft contact for the order panel. Before an order exists this is the only copy and
  // is sent with createOrder; once the order exists it mirrors the saved Order record.
  const [customerDraft, setCustomerDraft] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
  });
  const [splitError, setSplitError] = useState("");
  const [mergeError, setMergeError] = useState("");
  const [invoiceMessage, setInvoiceMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [qrPayment, setQrPayment] = useState<Payment | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const invoiceListRequestRef = useRef(0);
  const invoiceDetailRequestRef = useRef(0);
  const splitSubmissionRef = useRef(false);
  const mergeSubmissionRef = useRef(false);
  const createOrderSubmissionRef = useRef(false);
  const selectedOrderIdRef = useRef("");
  const selectedTableIdRef = useRef("");
  const [createOrderSubmitting, setCreateOrderSubmitting] = useState(false);
  const [orderActionMessage, setOrderActionMessage] = useState<{
    type: "error";
    text: string;
  } | null>(null);

  // ── Reservation panel state ───────────────────────────────────────────────
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  // ── Cash shift state ──────────────────────────────────────────────────────
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // BR-CS-19: merge a floating shift into a main shift.
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<OpenShiftBrief[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [mergeCash, setMergeCash] = useState<string>("");
  const [mergeNote, setMergeNote] = useState<string>("");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [shiftMergeError, setShiftMergeError] = useState<string>("");

  // BR-AUTH-01/04: warn before logout while an OPEN shift is still owned.
  const [logoutWarn, setLogoutWarn] = useState(false);
  const [logoutAfterClose, setLogoutAfterClose] = useState(false);

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

  const doLogout = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    signOut();
    navigate("/login", { replace: true });
  };

  const loadCashierState = useCallback(async () => {
    const [tableRows, orderPage] = await Promise.all([
      listTables(),
      listOrders(0, 100),
    ]);
    const mappedTables = tableRows
      .filter((table) => table.active)
      .sort((a, b) => a.order - b.order)
      .map(toTableItem);
    const orderById = new Map(orderPage.data.map((order) => [order.id, order]));
    const missingActiveOrderIds = Array.from(
      new Set(
        mappedTables
          .map((table) => table.orderId)
          .filter(
            (orderId): orderId is string =>
              Boolean(orderId) && !orderById.has(orderId as string),
          ),
      ),
    );
    const missingOrders = await Promise.allSettled(
      missingActiveOrderIds.map((orderId) => getOrder(orderId)),
    );
    missingOrders.forEach((result) => {
      if (
        result.status === "fulfilled" &&
        ACTIVE_ORDER_STATUSES.includes(result.value.status)
      ) {
        orderById.set(result.value.id, result.value);
      }
    });

    setActiveOrders(Array.from(orderById.values()));
    setTables((currentTables) => {
      const selectedId = currentTables.find((table) => table.selected)?.id;
      return mappedTables.map((table) => ({
        ...table,
        selected: table.id === selectedId,
      }));
    });
    setActiveArea((currentArea) => {
      if (
        currentArea === "all" ||
        mappedTables.some((table) => table.area === currentArea)
      ) {
        return currentArea;
      }
      return mappedTables[0]?.area ?? "all";
    });
  }, []);

  // BR-CS-19: open the merge dialog and load candidate main shifts.
  const openMergeDialog = async () => {
    setShiftMergeError("");
    setMergeTargetId("");
    setMergeCash("");
    setMergeNote("");
    setMergeOpen(true);
    try {
      const targets = await getOpenNormalShifts();
      setMergeTargets(targets);
    } catch {
      setMergeTargets([]);
    }
  };

  const submitMerge = async () => {
    if (!shift) return;
    if (!mergeTargetId) {
      setShiftMergeError("Vui lòng chọn ca chính để gộp.");
      return;
    }
    const cash = parseInt(mergeCash.replace(/\D/g, "") || "0", 10);
    setMergeLoading(true);
    setShiftMergeError("");
    try {
      await mergeFloatingShift(
        shift.id,
        mergeTargetId,
        cash,
        mergeNote.trim() || undefined,
      );
      // The floating shift is now MERGED; the helper no longer owns an open shift.
      setMergeOpen(false);
      setShift(null);
      setShiftModalOpen(true);
    } catch (err) {
      setShiftMergeError(
        err instanceof Error ? err.message : "Không thể gộp ca tạm.",
      );
    } finally {
      setMergeLoading(false);
    }
  };

  // BR-AUTH-01/04: logout is never blocked, but if the cashier still owns an OPEN cash
  // shift we warn first and offer a "close shift, then log out" shortcut.
  const handleLogout = () => {
    if (shift && shift.status === "OPEN") {
      setLogoutWarn(true);
    } else {
      void doLogout();
    }
  };

  // Re-fetches table list from backend and merges selection state.
  // Called after reservation actions and order close/cancel so statuses
  // (RESERVED→OCCUPIED, OCCUPIED→AVAILABLE, etc.) reflect backend truth.
  const refreshTables = () => {
    listTables()
      .then((res) => {
        const updated = res
          .filter((t) => t.active)
          .sort((a, b) => a.order - b.order)
          .map(toTableItem);
        setTables((prev) =>
          updated.map((t) => ({
            ...t,
            selected: prev.find((p) => p.id === t.id)?.selected ?? false,
          })),
        );
      })
      .catch(() => {});
  };

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

  // Real-time push races the poll above — an assistance request created/resolved
  // anywhere shows up near-instantly; the poll stays as a backstop if the WS drops.
  useRealtime("/topic/assistance", () => {
    listPendingAssistance()
      .then(setAssistanceRequests)
      .catch(() => {});
  });

  // Live orders and authoritative table ownership are polled together, kept in sync
  // with the kitchen; real-time push (below) is the primary path and this poll is a backstop.
  useEffect(() => {
    const refresh = async () => {
      try {
        await loadCashierState();
      } catch (err) {
        console.error(err);
      } finally {
        setTablesLoading(false);
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 10000);
    return () => clearInterval(interval);
  }, [loadCashierState, refreshTrigger]);

  // Order/item status changes pushed over WS bump refreshTrigger, reusing the same
  // refetch path the mutation handlers below already use — one source of truth.
  useRealtime("/topic/orders", () => {
    setRefreshTrigger((t) => t + 1);
  });

  // Table status changes (from any terminal, including the BR-04 no-show cron) — refetch
  // the floor view immediately instead of waiting on refreshTables() to be called manually.
  useRealtime("/topic/tables", () => {
    refreshTables();
  });

  // Reservation edits (guest info, party size, time, table assignment/transfer, status
  // changes) from the waiter/manager reservation screen — the table grid's upcomingReservation
  // panel comes from listTables(), so any reservation change also needs a table refetch even
  // when it doesn't itself flip a table's status (e.g. editing guest name on an already-RESERVED table).
  useRealtime("/topic/reservations", () => {
    refreshTables();
  });

  // Overlay live order totals onto the table grid (amount/guests/item count, orderId link).
  // Status is NOT overridden here — backend-provided statuses (RESERVED, CLEANING, etc.)
  // are preserved. Only tables with active orders are marked OCCUPIED; refreshTables()
  // is responsible for resetting OCCUPIED→AVAILABLE after orders close.
  useEffect(() => {
    setTables((prevTables) =>
      prevTables.map((t) => {
        const tableOrders = activeOrders.filter(
          (order) =>
            order.tableId === t.id &&
            ACTIVE_ORDER_STATUSES.includes(order.status) &&
            (!t.orderId || order.id === t.orderId),
        );
        if (tableOrders.length === 0) {
          return {
            ...t,
            orderId: null,
            occupied: false,
            amount: 0,
            items: 0,
            // status intentionally not touched — keeps RESERVED/CLEANING/AVAILABLE from API
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
          // BE-MGMT-03 fix: this previously forced OCCUPIED unconditionally, clobbering a
          // cashier-set BILLING status back to OCCUPIED on the next poll/WS tick while the
          // order itself is still ACTIVE (e.g. SERVED) during payment. Preserve BILLING the
          // same way the empty-orders branch above already preserves RESERVED/CLEANING.
          status: t.status === "BILLING" ? "BILLING" : "OCCUPIED",
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
        (!selectedTable.orderId || o.id === selectedTable.orderId) &&
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
        isQrOrder: i.isQrOrder ?? i.qrOrder,
      })),
    );
    setOrderItems(combinedItems);
  }, [selectedTable?.id, selectedTable?.occupied, activeOrders]);

  const hasSelectedMenu = cart.length > 0;
  const selectedOrderId = selectedTable?.orderId ?? "";
  selectedTableIdRef.current = selectedTable?.id ?? "";
  selectedOrderIdRef.current = selectedOrderId;
  const selectedOrder = activeOrders.find(
    (order) => order.id === selectedOrderId,
  );
  const selectedOrderCustomerKey = selectedOrder
    ? `${selectedOrder.id}|${selectedOrder.customerName ?? ""}|${selectedOrder.customerPhone ?? ""}|${selectedOrder.customerEmail ?? ""}`
    : `none|${selectedTable?.id ?? ""}`;

  // Once an order exists its stored contact is the source of truth; with no order the
  // draft is kept as typed and only reset when the cashier moves to another table.
  useEffect(() => {
    if (selectedOrder) {
      setCustomerDraft({
        customerName: selectedOrder.customerName ?? "",
        customerPhone: selectedOrder.customerPhone ?? "",
        customerEmail: selectedOrder.customerEmail ?? "",
      });
    } else {
      setCustomerDraft({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
      });
    }
    setCustomerError("");
    // Keyed on the stored values so a save or a table switch re-seeds, but typing does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderCustomerKey]);

  // Receipt identity comes from the signed-in account: prefer the human full name and
  // only fall back to the login name when no display name is stored.
  const cashierDisplayName =
    user?.fullName?.trim() || user?.username?.trim() || "Thu ngân";
  // Real shift, never a fixed time range. An open shift only knows when it started.
  const shiftDisplayLabel = (() => {
    if (!shift) return "Chưa mở ca";
    const openedAt = new Date(shift.openedAt);
    const time = (value: Date) =>
      value.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    if (shift.closedAt) {
      return `${time(openedAt)} - ${time(new Date(shift.closedAt))}`;
    }
    return `Đang mở từ ${time(openedAt)}`;
  })();
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
  const invoiceListMatchesOrder =
    !!selectedOrderId && invoiceListOrderId === selectedOrderId;
  const currentOrderInvoices = invoiceListMatchesOrder ? invoices : [];
  const selectedInvoice =
    currentOrderInvoices.find(
      (candidate) => candidate.id === selectedInvoiceId,
    ) ?? null;

  console.log("ACTIVE ORDERS:", activeOrders);
  const pendingOrders = activeOrders.filter(
    (o) =>
      o.status === "PENDING" ||
      (o.status !== "CANCELLED" &&
        o.status !== "CLOSED" &&
        o.items.some(
          (i) => i.cookingStatus === "PENDING" && (i.isQrOrder || i.qrOrder),
        )),
  );
  const pendingOrdersCount = pendingOrders.length;
  const currentOrderInvoiceDetail =
    selectedInvoice &&
    selectedInvoiceDetail?.id === selectedInvoice.id &&
    selectedInvoiceDetail.orderId === selectedOrderId
      ? selectedInvoiceDetail
      : null;
  const activeOrderInvoices = currentOrderInvoices.filter(
    (candidate) => candidate.status === "ACTIVE",
  );
  const orderHasInvoice = currentOrderInvoices.length > 0;
  const invoiceChecked =
    invoiceListMatchesOrder && !invoiceListLoading && !invoiceListError;
  const orderIsFinal =
    selectedOrder?.status === "CLOSED" || selectedOrder?.status === "CANCELLED";
  const canCloseSelectedOrder =
    !!selectedOrder &&
    activeOrderInvoices.length > 0 &&
    activeOrderInvoices.every((candidate) => candidate.paid) &&
    !orderIsFinal;
  const emptyOrderWithoutInvoice =
    !!selectedOrder &&
    invoiceChecked &&
    !orderHasInvoice &&
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

  const resetInvoiceLink = useCallback(() => {
    invoiceListRequestRef.current += 1;
    invoiceDetailRequestRef.current += 1;
    setInvoices([]);
    setInvoiceListOrderId(null);
    setSelectedInvoiceId(null);
    setSelectedInvoiceDetail(null);
    setPromotionCode("");
    setInvoiceListLoading(false);
    setInvoiceListError("");
    setInvoiceDetailLoading(false);
    setInvoiceDetailError("");
    setInvoiceAction(null);
    setSplitError("");
    setMergeError("");
    splitSubmissionRef.current = false;
    mergeSubmissionRef.current = false;
    setInvoiceMessage(null);
    setPaymentOpen(false);
    setPaymentError("");
    setPaymentProcessing(false);
    setOrderActionMessage(null);
  }, []);

  const loadInvoiceDetail = useCallback(
    async (invoiceId: string, expectedOrderId: string) => {
      const requestId = ++invoiceDetailRequestRef.current;
      setSelectedInvoiceDetail(null);
      setInvoiceDetailLoading(true);
      setInvoiceDetailError("");
      try {
        const detailData = await getInvoiceById(invoiceId);
        if (requestId !== invoiceDetailRequestRef.current) return null;
        if (detailData.orderId !== expectedOrderId) {
          setInvoiceDetailError("Hóa đơn không thuộc đơn hàng đang chọn.");
          return null;
        }
        setSelectedInvoiceDetail(detailData);
        return detailData;
      } catch (loadError) {
        if (requestId !== invoiceDetailRequestRef.current) return null;
        setInvoiceDetailError(
          getInvoiceUiErrorMessage(
            loadError,
            INVOICE_DETAIL_LOAD_FALLBACK_ERROR,
          ),
        );
        return null;
      } finally {
        if (requestId === invoiceDetailRequestRef.current) {
          setInvoiceDetailLoading(false);
        }
      }
    },
    [],
  );

  const refreshInvoices = useCallback(
    async (orderId: string, preferredInvoiceId: string | null = null) => {
      const normalizedOrderId = orderId.trim();
      if (!normalizedOrderId) return null;

      const requestId = ++invoiceListRequestRef.current;
      setInvoiceListLoading(true);
      setInvoiceListError("");
      try {
        const foundInvoices = await getInvoices({ orderId: normalizedOrderId });
        if (requestId !== invoiceListRequestRef.current) return null;
        const nextSelectedId = chooseInvoiceId(
          foundInvoices,
          preferredInvoiceId,
        );
        setInvoices(foundInvoices);
        setInvoiceListOrderId(normalizedOrderId);
        setSelectedInvoiceId(nextSelectedId);
        setSelectedInvoiceDetail(null);
        setInvoiceDetailError("");
        if (nextSelectedId) {
          await loadInvoiceDetail(nextSelectedId, normalizedOrderId);
        } else {
          invoiceDetailRequestRef.current += 1;
          setInvoiceDetailLoading(false);
        }
        return nextSelectedId;
      } catch (loadError) {
        if (requestId !== invoiceListRequestRef.current) return null;
        setInvoices([]);
        setInvoiceListOrderId(normalizedOrderId);
        setSelectedInvoiceId(null);
        setSelectedInvoiceDetail(null);
        setInvoiceListError(
          getInvoiceUiErrorMessage(
            loadError,
            "Không thể tải danh sách hóa đơn.",
          ),
        );
        return null;
      } finally {
        if (requestId === invoiceListRequestRef.current) {
          setInvoiceListLoading(false);
        }
      }
    },
    [loadInvoiceDetail],
  );

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
      const createdInvoice = await generateInvoice({
        orderId: invoiceOrderId,
        promotionCode: null,
      });
      await refreshInvoices(invoiceOrderId, createdInvoice.id);
      setPaymentOpen(true);
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
    if (!selectedInvoice || !promotionCode.trim()) return;
    setInvoiceAction("discount");
    setInvoiceMessage(null);
    try {
      await applyInvoiceDiscount(selectedInvoice.id, promotionCode.trim());
      await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
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
      if (
        discountError instanceof ApiClientError &&
        discountError.code &&
        STALE_INVOICE_ERROR_CODES.has(discountError.code)
      ) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      }
    } finally {
      setInvoiceAction(null);
    }
  };

  const handleSendInvoice = async () => {
    if (!selectedInvoice) return;
    setInvoiceAction("send");
    setInvoiceMessage(null);
    try {
      const result = await sendInvoice(selectedInvoice.id);
      setInvoiceMessage({ type: "success", text: result.message });
    } catch (sendError) {
      setInvoiceMessage({
        type: "error",
        text: getInvoiceUiErrorMessage(sendError, SEND_INVOICE_FALLBACK_ERROR),
      });
    } finally {
      setInvoiceAction(null);
    }
  };

  // Customer contact lives on the order, so the receipt and the invoice email both read
  // the same record. Saving is independent of payment and never blocks it.
  const handleSaveCustomer = async (customer: OrderCustomerInput) => {
    if (!selectedOrderId) return false;
    setCustomerSaving(true);
    setCustomerError("");
    try {
      const updated = await updateOrderCustomer(selectedOrderId, customer);
      setActiveOrders((orders) =>
        orders.map((order) => (order.id === updated.id ? updated : order)),
      );
      return true;
    } catch (saveError) {
      setCustomerError(
        getInvoiceUiErrorMessage(saveError, SAVE_CUSTOMER_FALLBACK_ERROR),
      );
      return false;
    } finally {
      setCustomerSaving(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!currentOrderInvoiceDetail) return;
    if (
      !printCashierInvoice(
        currentOrderInvoiceDetail,
        selectedTable?.name || "-",
        cashierDisplayName,
        shiftDisplayLabel,
        {
          name: selectedOrder?.customerName ?? null,
          phone: selectedOrder?.customerPhone ?? null,
          email: selectedOrder?.customerEmail ?? null,
        },
      )
    ) {
      setInvoiceMessage({
        type: "error",
        text: "Trình duyệt đã chặn cửa sổ in hóa đơn",
      });
    }
  };

  const handleConfirmCash = async (receivedAmount: number) => {
    if (!selectedInvoice) {
      setPaymentError("Không xác định được hóa đơn cần thanh toán");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");
    try {
      const createdPayment = await processCashPayment(
        selectedInvoice.id,
        receivedAmount,
      );
      setPaymentOpen(false);
      setSuccessTotal(createdPayment.amount);
      await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      setInvoiceMessage({ type: "success", text: "Thanh toán thành công" });
    } catch (processError) {
      setPaymentError(getPaymentProcessErrorMessage(processError));
      if (
        processError instanceof ApiClientError &&
        processError.code &&
        STALE_INVOICE_ERROR_CODES.has(processError.code)
      ) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      }
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleResetQrState = () => {
    setQrPayment(null);
    setQrError("");
  };

  const handleInitiateQr = async () => {
    if (!selectedInvoice) {
      setQrError("Không xác định được hóa đơn cần thanh toán");
      return;
    }
    setQrLoading(true);
    setQrError("");
    try {
      const payment = await initiateQrPaymentApi(selectedInvoice.id);
      setQrPayment(payment);
    } catch (initiateError) {
      setQrError(getPaymentProcessErrorMessage(initiateError));
    } finally {
      setQrLoading(false);
    }
  };

  const handleSimulateQrSuccess = async () => {
    if (!qrPayment || !selectedInvoice) return;
    setPaymentProcessing(true);
    setQrError("");
    try {
      const confirmedPayment = await simulateQrPaymentSuccess(qrPayment.id);
      setQrPayment(confirmedPayment);
      setPaymentOpen(false);
      setSuccessTotal(confirmedPayment.amount);
      await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      setInvoiceMessage({ type: "success", text: "Thanh toán thành công" });
    } catch (confirmError) {
      setQrError(getPaymentProcessErrorMessage(confirmError));
      if (
        confirmError instanceof ApiClientError &&
        confirmError.code &&
        STALE_INVOICE_ERROR_CODES.has(confirmError.code)
      ) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      }
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleCancelQr = async () => {
    if (!qrPayment) return;
    setPaymentProcessing(true);
    setQrError("");
    try {
      await cancelQrPaymentApi(qrPayment.id);
      setQrPayment(null);
    } catch (cancelError) {
      setQrError(getPaymentProcessErrorMessage(cancelError));
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    if (!selectedOrderId || invoiceId === selectedInvoiceId) return;
    setSelectedInvoiceId(invoiceId);
    setSelectedInvoiceDetail(null);
    setInvoiceDetailError("");
    setInvoiceMessage(null);
    setPaymentError("");
    setSplitError("");
    setPromotionCode("");
    handleResetQrState();
    void loadInvoiceDetail(invoiceId, selectedOrderId);
  };

  const handleSplitInvoice = async (
    request: SplitInvoiceRequest,
  ): Promise<boolean> => {
    if (
      splitSubmissionRef.current ||
      !selectedInvoice ||
      !currentOrderInvoiceDetail
    ) {
      return false;
    }
    splitSubmissionRef.current = true;
    setInvoiceAction("split");
    setSplitError("");
    setInvoiceMessage(null);
    try {
      const result = await splitInvoice(selectedInvoice.id, request);
      const firstChildId = result.children[0]?.invoiceId;
      if (!firstChildId) {
        setSplitError(
          "Máy chủ không trả về hóa đơn con. Danh sách hóa đơn đã được làm mới.",
        );
        await refreshInvoices(selectedInvoice.orderId, null);
        return false;
      }
      await refreshInvoices(selectedInvoice.orderId, firstChildId);
      setInvoiceMessage({
        type: "success",
        text: "Chia hóa đơn thành công. Hóa đơn con đầu tiên đã được chọn.",
      });
      setPaymentOpen(true);
      return true;
    } catch (splitFailure) {
      setSplitError(getSplitInvoiceErrorMessage(splitFailure));
      if (
        splitFailure instanceof ApiClientError &&
        splitFailure.code &&
        STALE_INVOICE_ERROR_CODES.has(splitFailure.code)
      ) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
        if (splitFailure.code === "ORDER_NOT_FOUND") {
          setRefreshTrigger((value) => value + 1);
        }
      }
      return false;
    } finally {
      splitSubmissionRef.current = false;
      setInvoiceAction(null);
    }
  };

  const handleMergeInvoices = async (
    request: MergeInvoiceRequest,
  ): Promise<boolean> => {
    const expectedOrderId = selectedOrderId.trim();
    const uniqueInvoiceIds = [...new Set(request.invoiceIds)];
    if (
      mergeSubmissionRef.current ||
      !expectedOrderId ||
      uniqueInvoiceIds.length < 2
    ) {
      return false;
    }

    mergeSubmissionRef.current = true;
    setInvoiceAction("merge");
    setMergeError("");
    setInvoiceMessage(null);
    try {
      const result = await mergeInvoices({ invoiceIds: uniqueInvoiceIds });
      if (selectedOrderIdRef.current !== expectedOrderId) return true;

      const targetInvoiceId = result.targetInvoice?.id?.trim();
      if (result.orderId !== expectedOrderId || !targetInvoiceId) {
        setMergeError(
          "Máy chủ trả về hóa đơn đích không hợp lệ. Danh sách đã được làm mới.",
        );
        await refreshInvoices(expectedOrderId, selectedInvoiceId);
        return false;
      }

      await refreshInvoices(expectedOrderId, targetInvoiceId);
      if (selectedOrderIdRef.current !== expectedOrderId) return true;
      setInvoiceMessage({
        type: "success",
        text: "Gộp hóa đơn thành công. Hóa đơn đích đã được chọn.",
      });
      setPaymentOpen(true);
      return true;
    } catch (mergeFailure) {
      if (selectedOrderIdRef.current !== expectedOrderId) return false;
      setMergeError(getMergeInvoiceErrorMessage(mergeFailure));
      if (
        mergeFailure instanceof ApiClientError &&
        mergeFailure.code &&
        STALE_MERGE_ERROR_CODES.has(mergeFailure.code)
      ) {
        await refreshInvoices(expectedOrderId, selectedInvoiceId);
        if (mergeFailure.code === "ORDER_NOT_FOUND") {
          setRefreshTrigger((value) => value + 1);
        }
      }
      return false;
    } finally {
      mergeSubmissionRef.current = false;
      setInvoiceAction(null);
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
    const previousTableId = tables.find((table) => table.selected)?.id;
    if (previousTableId && previousTableId !== id) {
      setCart([]);
      setMenuItems((items) => items.map((item) => ({ ...item, qty: 0 })));
    }
    setTables((ts) => ts.map((t) => ({ ...t, selected: t.id === id })));
    setOrderActionMessage(null);
    resetInvoiceLink();
    if (id) {
      const selected = tables.find((t) => t.id === id);
      if (selected) {
        setActiveArea(selected.area);
      }
    }
  };

  // ── Reservation action handlers ───────────────────────────────────────────

  const handleReservationCheckIn = async () => {
    const res = selectedTable?.upcomingReservation;
    if (!res) return;
    setReservationLoading(true);
    setReservationError(null);
    try {
      await checkInReservation(res.id);
      // Backend set table→OCCUPIED; refresh so the panel switches to OrderPanel
      refreshTables();
    } catch (e) {
      setReservationError(
        e instanceof Error ? e.message : "Check-in thất bại, vui lòng thử lại",
      );
    } finally {
      setReservationLoading(false);
    }
  };

  const handleReservationNoShow = async () => {
    const res = selectedTable?.upcomingReservation;
    if (!res) return;
    if (!window.confirm(`Xác nhận khách "${res.guestName}" không đến?`)) return;
    setReservationLoading(true);
    setReservationError(null);
    try {
      await markNoShowReservation(res.id);
      // Deselect table, then refresh to pick up AVAILABLE status
      setTables((ts) => ts.map((t) => ({ ...t, selected: false })));
      refreshTables();
    } catch (e) {
      setReservationError(
        e instanceof Error ? e.message : "Thao tác thất bại, vui lòng thử lại",
      );
    } finally {
      setReservationLoading(false);
    }
  };

  const handleReservationCancel = async () => {
    const res = selectedTable?.upcomingReservation;
    if (!res) return;
    if (!window.confirm(`Xác nhận hủy đặt bàn của khách "${res.guestName}"?`))
      return;
    setReservationLoading(true);
    setReservationError(null);
    try {
      await cancelStaffReservation(res.id);
      // Deselect table, then refresh to pick up AVAILABLE status
      setTables((ts) => ts.map((t) => ({ ...t, selected: false })));
      refreshTables();
    } catch (e) {
      setReservationError(
        e instanceof Error
          ? e.message
          : "Hủy đặt bàn thất bại, vui lòng thử lại",
      );
    } finally {
      setReservationLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    resetInvoiceLink();
    if (selectedOrderId && selectedOrder?.id === selectedOrderId) {
      void refreshInvoices(selectedOrderId, null);
    }
  }, [selectedOrderId, selectedOrder?.id, refreshInvoices, resetInvoiceLink]);

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
    setCancelConfirmModal({ open: true, orderIds });
  };

  const executeCancelOrder = async () => {
    const { orderIds } = cancelConfirmModal;
    setCancelConfirmModal({ open: false, orderIds: [] });
    if (orderIds.length === 0) return;

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
    if (createOrderSubmissionRef.current) return;
    if (cart.length === 0) {
      setTab("menu");
      return;
    }
    if (!selectedTable) return;

    const expectedTableId = selectedTable.id;
    createOrderSubmissionRef.current = true;
    setCreateOrderSubmitting(true);
    setOrderActionMessage(null);
    try {
      const createdOrder = await createOrder(
        expectedTableId,
        cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.qty,
          note: item.note,
        })),
        undefined,
        customerDraft,
      );
      setActiveOrders((orders) => [
        ...orders.filter((order) => order.id !== createdOrder.id),
        createdOrder,
      ]);
      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === expectedTableId
            ? {
                ...table,
                occupied: true,
                status: "OCCUPIED",
                orderId: createdOrder.id,
                amount: createdOrder.totalAmount,
                items: createdOrder.items.reduce(
                  (total, item) => total + item.quantity,
                  0,
                ),
              }
            : table,
        ),
      );
      if (selectedTableIdRef.current === expectedTableId) {
        setCart([]);
        setMenuItems((items) => items.map((item) => ({ ...item, qty: 0 })));
        setTab("table");
      }
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
      setRefreshTrigger((trigger) => trigger + 1);
    } finally {
      createOrderSubmissionRef.current = false;
      setCreateOrderSubmitting(false);
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
      setRefreshTrigger((t) => t + 1);
      setShowQRModal(false);
      handleTableSelect(order.tableId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPendingOrder = async (order: Order) => {
    try {
      await cancelOrder(order.id, "Thu ngân hủy (QR)");
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveItemFromPending = (
    orderId: string,
    orderItemId: string,
  ) => {
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
  const BUSY_TABLE_STATUSES = ["OCCUPIED", "BILLING", "RESERVED"];
  const tableCounts: Record<string, number> = {
    all: tablesInArea.length,
    used: tablesInArea.filter((t) => BUSY_TABLE_STATUSES.includes(t.status))
      .length,
    empty: tablesInArea.filter((t) => !BUSY_TABLE_STATUSES.includes(t.status))
      .length,
  };
  const checkoutDisabled =
    invoiceAction !== null ||
    invoiceListLoading ||
    !selectedOrderId ||
    emptyOrderWithoutInvoice ||
    (orderHasInvoice ? !selectedInvoiceId : !invoiceChecked);
  const checkoutLabel = orderHasInvoice
    ? activeOrderInvoices.some((candidate) => !candidate.paid)
      ? "Mở thanh toán"
      : "Mở hóa đơn"
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
          employeeName={user?.fullName ?? user?.username ?? "Nhân viên"}
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
        onCashMovement={() => setShowCashMovement(true)}
        onCloseShift={() => setShowCloseShift(true)}
      />

      {shift?.shiftType === "FLOATING" && shift.status === "OPEN" && (
        <div className="mx-3 lg:mx-4 mt-3 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[#025cca] text-[14px]">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Đây là ca tạm (hỗ trợ). Tiền thu được giữ riêng; khi xong hãy gộp
            vào ca chính.
          </div>
          <button
            className="kv-btn kv-btn-primary h-9 shrink-0"
            onClick={() => void openMergeDialog()}
          >
            Gộp vào ca chính
          </button>
        </div>
      )}

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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 shrink-0 text-[#202325]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
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

        {selectedTable &&
        selectedTable.status === "RESERVED" &&
        !selectedTable.occupied ? (
          <ReservationPanel
            table={selectedTable}
            onCheckIn={handleReservationCheckIn}
            onNoShow={handleReservationNoShow}
            onCancel={handleReservationCancel}
            loading={reservationLoading}
            error={reservationError}
          />
        ) : (
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
              setSplitError("");
              if (orderHasInvoice) {
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
            customer={customerDraft}
            onCustomerChange={setCustomerDraft}
            onSaveCustomer={() => void handleSaveCustomer(customerDraft)}
            customerSaving={customerSaving}
            customerError={customerError}
            orderExists={Boolean(selectedOrderId)}
            checkoutDisabled={checkoutDisabled}
            checkoutLabel={checkoutLabel}
            shiftOpen={!!shift}
            invoicePaid={canCloseSelectedOrder}
            itemMutationDisabled={disableItemMutation}
            itemMutationDisabledMessage={itemMutationDisabledMessage}
            orderActionMessage={orderActionMessage}
            createOrderSubmitting={createOrderSubmitting}
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
        )}
      </div>

      {showQRModal && (
        <QROrderConfirmationModal
          orders={activeOrders}
          tables={tables}
          onClose={() => setShowQRModal(false)}
          onAccept={handleAcceptPendingOrder}
          onReject={handleRejectPendingOrder}
        />
      )}

      {removeConfirmModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Xác nhận xóa
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa món này khỏi đơn hàng?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() =>
                  setRemoveConfirmModal({
                    open: false,
                    orderId: null,
                    orderItemId: null,
                  })
                }
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

      {cancelConfirmModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#dc2f02] flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Hủy đơn hàng
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn hủy đơn hàng này?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() =>
                  setCancelConfirmModal({ open: false, orderIds: [] })
                }
                className="flex-1 border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => void executeCancelOrder()}
                className="flex-1 bg-[#dc2f02] text-white font-bold py-2.5 rounded-xl hover:bg-[#9d0208] transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {orderActionMessage && orderActionMessage.type === "error" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Thông báo</h3>
            <p className="text-sm text-gray-600 mb-6">
              {orderActionMessage.text}
            </p>
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

      {paymentOpen && selectedOrderId && (
        <PaymentModal
          invoices={currentOrderInvoices}
          selectedInvoiceId={selectedInvoiceId}
          invoice={currentOrderInvoiceDetail}
          table={selectedTable}
          invoiceListLoading={invoiceListLoading}
          invoiceListError={invoiceListError}
          detailLoading={invoiceDetailLoading}
          detailError={invoiceDetailError}
          processing={paymentProcessing}
          error={paymentError}
          promotionCode={promotionCode}
          action={invoiceAction}
          splitError={splitError}
          mergeError={mergeError}
          role={user?.role}
          invoiceMessage={invoiceMessage}
          nonPayableItems={nonPayableRejectedItems}
          qrPayment={qrPayment}
          qrLoading={qrLoading}
          qrError={qrError}
          cashierName={cashierDisplayName}
          shiftLabel={shiftDisplayLabel}
          customer={{
            name: selectedOrder?.customerName ?? null,
            phone: selectedOrder?.customerPhone ?? null,
            email: selectedOrder?.customerEmail ?? null,
          }}
          customerSaving={customerSaving}
          customerError={customerError}
          onSaveCustomer={handleSaveCustomer}
          onClose={() => setPaymentOpen(false)}
          onSelectInvoice={handleSelectInvoice}
          onRefreshInvoices={() => {
            void refreshInvoices(selectedOrderId, selectedInvoiceId);
          }}
          onConfirmCash={(receivedAmount) =>
            void handleConfirmCash(receivedAmount)
          }
          onInitiateQr={() => void handleInitiateQr()}
          onSimulateQrSuccess={() => void handleSimulateQrSuccess()}
          onCancelQr={() => void handleCancelQr()}
          onResetQrState={handleResetQrState}
          onPromotionCodeChange={setPromotionCode}
          onApplyDiscount={() => void handleApplyDiscount()}
          onPrint={handlePrintInvoice}
          onSend={() => void handleSendInvoice()}
          onSplit={handleSplitInvoice}
          onMerge={handleMergeInvoices}
          onResetMergeError={() => setMergeError("")}
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
          cashierName={user?.username ?? user?.fullName ?? "—"}
          onClosed={() => {
            setShift(null);
            setShowCloseShift(false);
            if (logoutAfterClose) {
              setLogoutAfterClose(false);
              void doLogout(); // BR-AUTH-04: "close shift, then log out" shortcut
            }
          }}
          onCancel={() => {
            setShowCloseShift(false);
            setLogoutAfterClose(false);
          }}
        />
      )}
      {mergeOpen && shift && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMergeOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#eceef0]">
              <h2 className="text-[18px] font-bold text-[#202325]">
                Gộp ca tạm vào ca chính
              </h2>
              <p className="text-[13px] text-[#636566] mt-1">
                Đếm tiền mặt đã thu trong ca tạm và chọn ca chính để gộp. Giao
                dịch sẽ được chuyển vào ca chính (giữ nguyên người thu).
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-[#202325]">
                  Ca chính
                </label>
                {mergeTargets.length === 0 ? (
                  <p className="text-[13px] text-[#636566]">
                    Không có ca chính nào đang mở để gộp.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {mergeTargets.map((t) => (
                      <label
                        key={t.shiftId}
                        className="flex items-center gap-2 text-[14px] text-[#202325] cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="merge-target"
                          checked={mergeTargetId === t.shiftId}
                          onChange={() => setMergeTargetId(t.shiftId)}
                        />
                        {t.cashierName}
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
                  value={mergeCash}
                  onChange={(e) =>
                    setMergeCash(
                      parseInt(
                        e.target.value.replace(/\D/g, "") || "0",
                        10,
                      ).toLocaleString("vi-VN"),
                    )
                  }
                  className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[15px] text-[#202325] outline-none focus:border-[#025cca]"
                />
              </div>
              <input
                type="text"
                value={mergeNote}
                onChange={(e) => setMergeNote(e.target.value)}
                placeholder="Ghi chú (nếu lệch tiền)"
                className="h-11 px-4 border border-[#d1d5db] rounded-lg text-[14px] text-[#202325] outline-none focus:border-[#025cca]"
              />
              {shiftMergeError && (
                <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
                  {shiftMergeError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#eceef0] flex justify-end gap-2">
              <button
                className="kv-btn kv-btn-outline-neutral h-10"
                onClick={() => setMergeOpen(false)}
              >
                Hủy
              </button>
              <button
                className="kv-btn kv-btn-primary h-10"
                disabled={mergeLoading || mergeTargets.length === 0}
                onClick={() => void submitMerge()}
              >
                {mergeLoading ? "Đang gộp..." : "Gộp ca"}
              </button>
            </div>
          </div>
        </div>
      )}
      {logoutWarn && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLogoutWarn(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#eceef0]">
              <h2 className="text-[18px] font-bold text-[#202325]">
                Đăng xuất
              </h2>
              <p className="text-[13px] text-[#636566] mt-1">
                Đăng xuất sẽ không đóng ca thu ngân của bạn. Ca vẫn mở trên hệ
                thống và sẽ được khôi phục khi bạn đăng nhập lại.
              </p>
            </div>
            <div className="p-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setLogoutWarn(false);
                  setLogoutAfterClose(true);
                  setShowCloseShift(true);
                }}
                className="h-11 rounded-lg bg-[#025cca] text-white font-semibold text-[15px] hover:bg-[#0251b3] transition-colors"
              >
                Đóng ca rồi đăng xuất
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutWarn(false);
                  void doLogout();
                }}
                className="h-11 rounded-lg border border-[#d1d5db] text-[14px] text-[#636566] hover:bg-[#f5f5f5] transition-colors"
              >
                Chỉ đăng xuất
              </button>
              <button
                type="button"
                onClick={() => setLogoutWarn(false)}
                className="h-10 text-[13px] text-[#636566] hover:text-[#202325] transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
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
