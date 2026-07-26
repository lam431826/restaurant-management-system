import { ApiError } from "../../../services/api";

export const ORDER_ALREADY_INVOICED_MESSAGE =
  "Đơn hàng đã có hóa đơn nên không thể chỉnh sửa món.";
export const ORDER_FINAL_ITEM_LOCK_MESSAGE =
  "Đơn hàng đã đóng hoặc đã hủy nên không thể chỉnh sửa món.";
export const EMPTY_ORDER_MESSAGE =
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

export const getOrderActionErrorMessage = (error: unknown): string => {
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

export const getInvoiceGenerationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code) {
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

export const getPromotionDiscountErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code) {
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
  PAYMENT_NOT_PENDING: "Giao dịch này không còn ở trạng thái chờ xử lý.",
  PAYMENT_ATTEMPT_PENDING:
    "Đã có giao dịch đang chờ xử lý cho hóa đơn này. Vui lòng chờ hoặc thử lại sau.",
  PAYMENT_GATEWAY_NOT_CONFIGURED:
    "Cổng thanh toán VNPAY chưa được cấu hình trên máy chủ.",
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

// Shown after a QueryDR reconciliation that did not end in PAID, so the cashier knows
// whether they may now take cash / start a new attempt.
export const VNPAY_STATUS_MESSAGES: Record<string, string> = {
  PENDING: "Giao dịch vẫn đang chờ xác nhận từ VNPAY. Vui lòng thử lại sau ít phút.",
  FAILED: "Giao dịch VNPAY thất bại. Bạn có thể thu tiền mặt hoặc tạo giao dịch mới.",
  CANCELLED: "Khách đã hủy giao dịch VNPAY. Bạn có thể thu tiền mặt hoặc tạo giao dịch mới.",
  EXPIRED: "Giao dịch VNPAY đã hết hạn. Bạn có thể thu tiền mặt hoặc tạo giao dịch mới.",
};

export const getPaymentProcessErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code) {
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

export const INVOICE_DETAIL_LOAD_FALLBACK_ERROR = "Không thể tải chi tiết hóa đơn.";
export const SEND_INVOICE_FALLBACK_ERROR = "Không thể gửi hóa đơn. Vui lòng thử lại.";
export const SAVE_CUSTOMER_FALLBACK_ERROR =
  "Không thể lưu thông tin khách hàng. Vui lòng thử lại.";

export const getInvoiceUiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (error instanceof ApiError && error.code) {
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

export const STALE_INVOICE_ERROR_CODES = new Set([
  "INVOICE_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "INVOICE_NOT_PAYABLE",
  "INVOICE_ALREADY_PAID",
  "INVOICE_NOT_SPLITTABLE",
  "INVALID_INVOICE_TOTAL",
  "INVOICE_ALLOCATION_DATA_INVALID",
]);

export const getSplitInvoiceErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code) {
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

export const STALE_MERGE_ERROR_CODES = new Set([
  "INVOICE_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "INVOICE_MERGE_ORDER_MISMATCH",
  "INVOICE_NOT_MERGEABLE",
  "INVOICE_ALREADY_PAID",
  "INVALID_INVOICE_TOTAL",
  "INVOICE_ALLOCATION_DATA_INVALID",
  "INVOICE_NOT_PAYABLE",
]);

export const getMergeInvoiceErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code) {
    return (
      MERGE_INVOICE_ERROR_MESSAGES[error.code] ??
      "Không thể gộp hóa đơn. Vui lòng thử lại."
    );
  }
  return "Không thể gộp hóa đơn. Vui lòng thử lại.";
};
