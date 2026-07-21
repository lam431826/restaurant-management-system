package com.rms.restaurant.common.utils.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ApplicationError {

    // Authentication
    INVALID_CREDENTIALS("Invalid username or password", HttpStatus.UNAUTHORIZED),
    ACCOUNT_UNVERIFIED("Account not yet activated", HttpStatus.FORBIDDEN),
    ACCOUNT_LOCKED("Account has been locked", HttpStatus.LOCKED),
    ACCOUNT_INACTIVE("Account is inactive", HttpStatus.FORBIDDEN),
    INVALID_OTP("OTP code is incorrect", HttpStatus.BAD_REQUEST),
    OTP_EXPIRED("OTP has expired", HttpStatus.BAD_REQUEST),
    OTP_MAX_ATTEMPTS("Exceeded maximum OTP attempts", HttpStatus.TOO_MANY_REQUESTS),
    RESEND_LIMIT_EXCEEDED("Exceeded OTP resend limit", HttpStatus.TOO_MANY_REQUESTS),
    VERIFY_TOKEN_EXPIRED("Verification token has expired", HttpStatus.GONE),
    INVALID_VERIFY_TOKEN("Verification token is invalid", HttpStatus.UNAUTHORIZED),
    INVALID_RESET_TOKEN("Password reset token is invalid or expired", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED("Authentication required", HttpStatus.UNAUTHORIZED),

    // Resources
    USER_NOT_FOUND("User not found", HttpStatus.NOT_FOUND),
    TABLE_NOT_FOUND("Table not found", HttpStatus.NOT_FOUND),
    ORDER_NOT_FOUND("Order not found", HttpStatus.NOT_FOUND),
    RESERVATION_NOT_FOUND("Reservation not found", HttpStatus.NOT_FOUND),
    INVOICE_NOT_FOUND("Invoice not found", HttpStatus.NOT_FOUND),
    MENU_ITEM_NOT_FOUND("Menu item not found", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_FOUND("Menu category not found", HttpStatus.NOT_FOUND),
    SHIFT_NOT_FOUND("Shift not found", HttpStatus.NOT_FOUND),
    PROMOTION_NOT_FOUND("Promotion not found", HttpStatus.NOT_FOUND),

    // User Management
    DUPLICATE_USERNAME("Username already in use", HttpStatus.CONFLICT),
    DUPLICATE_EMAIL("Email already in use", HttpStatus.CONFLICT),
    DUPLICATE_PHONE("Phone number already in use", HttpStatus.CONFLICT),
    USER_NOT_UNLOCKABLE("Only locked accounts can be unlocked", HttpStatus.UNPROCESSABLE_ENTITY),
    MANAGER_CANNOT_ASSIGN_ADMIN_ROLE("Only an administrator can create an ADMIN account", HttpStatus.FORBIDDEN),

    // Menu Management
    DUPLICATE_CATEGORY_NAME("A category with this name already exists", HttpStatus.CONFLICT),
    CATEGORY_HAS_ITEMS("Category still has items; reassign or remove them first", HttpStatus.CONFLICT),
    MENU_ITEM_HAS_ORDERS("Item has existing orders and cannot be deleted; deactivate it instead", HttpStatus.CONFLICT),
    MENU_IMPORT_INVALID("The import file is missing or has an invalid format", HttpStatus.BAD_REQUEST),

    // Employee Management
    EMPLOYEE_NOT_FOUND("Employee not found", HttpStatus.NOT_FOUND),
    DUPLICATE_EMPLOYEE_CODE("Employee code already in use", HttpStatus.CONFLICT),
    DUPLICATE_EMPLOYEE_PHONE("Phone number already in use", HttpStatus.CONFLICT),
    EMPLOYEE_USER_ALREADY_LINKED("This user account is already linked to another employee", HttpStatus.CONFLICT),
    EMPLOYEE_IMPORT_INVALID("The import file is missing or has an invalid format", HttpStatus.BAD_REQUEST),
    EMPLOYEE_IMPORT_TOO_MANY_ROWS("Import file exceeds the 500-row limit", HttpStatus.BAD_REQUEST),

    // Table Management
    DUPLICATE_TABLE_NAME("A table with this name already exists", HttpStatus.CONFLICT),
    AREA_NOT_FOUND("Area not found", HttpStatus.NOT_FOUND),
    DUPLICATE_AREA_NAME("An area with this name already exists", HttpStatus.CONFLICT),
    AREA_HAS_TABLES("Area still has tables; reassign or remove them first", HttpStatus.CONFLICT),
    TABLE_IMPORT_INVALID("The import file is missing or has an invalid format", HttpStatus.BAD_REQUEST),

    // Business Rules
    TABLE_NOT_AVAILABLE("Table is not available for this time slot", HttpStatus.CONFLICT),
    TABLE_FULLY_BOOKED("No available tables for the requested time slot", HttpStatus.CONFLICT),
    TABLE_CAPACITY_EXCEEDED("Party size exceeds table capacity", HttpStatus.UNPROCESSABLE_ENTITY),
    TABLE_IN_USE("Table is currently occupied and cannot be deleted", HttpStatus.CONFLICT),
    TABLE_TRANSFER_NOT_ALLOWED("Table transfer cannot be completed in the current state", HttpStatus.UNPROCESSABLE_ENTITY),
    TABLE_HAS_PENDING_ORDER("Table already has a pending order", HttpStatus.CONFLICT),
    TABLE_RECENTLY_WALK_IN_OCCUPIED("Table was recently seated with a walk-in guest; wait for the dining and cleanup window to elapse before assigning a reservation", HttpStatus.CONFLICT),
    TABLE_HAS_ACTIVE_ORDER("Table already has an active order", HttpStatus.CONFLICT),
    INVALID_TABLE_TOKEN("Table token is invalid or expired", HttpStatus.UNAUTHORIZED),
    SHIFT_ALREADY_OPEN("A shift is already open", HttpStatus.CONFLICT),
    SHIFT_NOT_OPEN("No open shift found", HttpStatus.NOT_FOUND),
    SHIFT_CLOSED("Shift is already closed", HttpStatus.UNPROCESSABLE_ENTITY),
    SHIFT_VARIANCE_NOTE_REQUIRED("A closing note is required when variance exceeds tolerance", HttpStatus.UNPROCESSABLE_ENTITY),
    SHIFT_HANDOVER_EXCEEDS_CASH("Handover amount cannot exceed actual cash counted", HttpStatus.UNPROCESSABLE_ENTITY),
    FLOATING_REQUIRES_MAIN_SHIFT("Không có ca chính nào đang mở để mở ca tạm.", HttpStatus.CONFLICT),
    SHIFT_NOT_FLOATING("Ca này không phải ca tạm.", HttpStatus.UNPROCESSABLE_ENTITY),
    MERGE_TARGET_INVALID("Ca chính để gộp không hợp lệ hoặc đã đóng.", HttpStatus.UNPROCESSABLE_ENTITY),
    CASH_OUT_EXCEEDS_BALANCE("Cash-out amount exceeds current drawer balance", HttpStatus.UNPROCESSABLE_ENTITY),
    CASH_MOVEMENT_REASON_REQUIRED("A reason is required for cash-out transactions", HttpStatus.BAD_REQUEST),
    INVALID_CASH_MOVEMENT_TYPE("Transaction type must be CASH_IN or CASH_OUT", HttpStatus.BAD_REQUEST),
    RESERVATION_NO_EMAIL("No email on file — contact the restaurant to cancel", HttpStatus.UNPROCESSABLE_ENTITY),
    RESERVATION_PHONE_MISMATCH("Phone number does not match this reservation", HttpStatus.UNAUTHORIZED),
    RESERVATION_OUTSIDE_HOURS("Reservation time must be within opening hours (16:00 - 21:00; the restaurant closes at 22:30)", HttpStatus.UNPROCESSABLE_ENTITY),
    CANCEL_TOKEN_INVALID("Cancellation token is invalid or has expired", HttpStatus.UNAUTHORIZED),
    CANNOT_CANCEL_PAID_ORDER("Cannot cancel an order that has been paid", HttpStatus.UNPROCESSABLE_ENTITY),
    CANNOT_CANCEL_INVOICED_ORDER("Cannot cancel an order after invoice has been created", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_ALREADY_INVOICED("Order already has an invoice and cannot be modified", HttpStatus.UNPROCESSABLE_ENTITY),
    CANNOT_CANCEL_ORDER_ITEMS_NOT_PENDING("Cannot cancel order because some items are already being prepared or served", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_ITEM_REMOVE_NOT_ALLOWED("Only pending order items can be removed", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_ITEM_NOTE_NOT_ALLOWED("Only pending order items can have their notes updated", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_ITEM_STATUS_TRANSITION_NOT_ALLOWED("Order item status transition is not allowed", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ALREADY_EXISTS("Invoice already exists for this order", HttpStatus.CONFLICT),
    INVOICE_ALREADY_PAID("Cannot apply a promotion to a paid invoice", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_NOT_PAYABLE("Invoice is not active and cannot accept payment or discount changes", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ALREADY_DISCOUNTED("Invoice already has a promotion discount", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_PROMOTION_ALREADY_APPLIED("This promotion has already been applied to this invoice", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_CUSTOMER_EMAIL_REQUIRED("Customer email is required before the invoice can be sent", HttpStatus.UNPROCESSABLE_ENTITY),
    MAIL_CONFIGURATION_MISSING("Outgoing mail is not configured on this server", HttpStatus.SERVICE_UNAVAILABLE),
    MAIL_DELIVERY_FAILED("The mail server rejected or could not deliver the message", HttpStatus.BAD_GATEWAY),
    PROMOTION_USAGE_LIMIT_REACHED("Promotion usage limit has been reached", HttpStatus.CONFLICT),
    PROMOTION_CHANGE_NOT_ALLOWED("Changing the promotion on an invoice is not allowed", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_PROMOTION_USAGE_LIMIT("Promotion usage limit is invalid", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_STATUS_TRANSITION("Invalid status transition", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_NOT_CLOSEABLE("Order cannot be closed in its current state", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_NOT_DISCOUNTABLE("Order cannot apply discount in its current status", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_NOT_INVOICEABLE("Order cannot be invoiced in its current status", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_NOT_PAYABLE("Order cannot be paid in its current status", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_NOT_READY_FOR_INVOICE("Order is not ready for invoice because some items are still pending or cooking", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_INVOICE_ITEMS("Order contains invalid invoice items", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_INVOICE_TOTAL("Invoice subtotal must be greater than zero and total amount cannot be negative", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ALLOCATION_DATA_INVALID("Invoice allocation data is inconsistent", HttpStatus.INTERNAL_SERVER_ERROR),
    INVOICE_NOT_SPLITTABLE("Invoice cannot be split in its current state", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_INVOICE_SPLIT("Invoice split groups are invalid", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_INVOICE_STATUS_FILTER("Invoice status filter is invalid", HttpStatus.BAD_REQUEST),
    INVALID_INVOICE_MERGE("Invoice merge sources are invalid", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_MERGE_ORDER_MISMATCH("Invoice merge sources must belong to the same order", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_NOT_MERGEABLE("Invoice cannot be merged in its current state", HttpStatus.UNPROCESSABLE_ENTITY),
    FORBIDDEN("You do not have permission to perform this action", HttpStatus.FORBIDDEN),
    PAYMENT_NO_OPEN_SHIFT("Shift is not opening", HttpStatus.FORBIDDEN),
    PAYMENT_METHOD_NOT_SUPPORTED("This payment method is not supported", HttpStatus.UNPROCESSABLE_ENTITY),
    PAYMENT_RECEIVED_AMOUNT_INVALID("Received amount must be provided and cannot be less than the payable amount", HttpStatus.UNPROCESSABLE_ENTITY),
    PAYMENT_NOT_FOUND("Payment not found", HttpStatus.NOT_FOUND),
    PAYMENT_NOT_PENDING("Payment is not pending and cannot be confirmed or cancelled", HttpStatus.CONFLICT),
    PAYMENT_METHOD_MISMATCH("Payment method does not match the requested operation", HttpStatus.UNPROCESSABLE_ENTITY),

    // Payroll (SRS_PAY) — UC-PAY-03..08, BR-PAY-11..18
    PAYROLL_SHEET_NOT_FOUND("Payroll sheet not found", HttpStatus.NOT_FOUND),
    PAYSLIP_NOT_FOUND("Payslip not found", HttpStatus.NOT_FOUND),
    PAYROLL_SHEET_NOT_DRAFT("Chỉ bảng lương ở trạng thái Tạm tính mới được thực hiện thao tác này", HttpStatus.UNPROCESSABLE_ENTITY),
    PAYROLL_SHEET_NOT_FINALIZED("Chỉ bảng lương Đã chốt lương mới được thanh toán", HttpStatus.UNPROCESSABLE_ENTITY),
    PAYROLL_PERIOD_INVALID("Kỳ làm việc không hợp lệ", HttpStatus.BAD_REQUEST),
    PAYROLL_SCOPE_EMPLOYEES_REQUIRED("Phạm vi Tùy chọn cần ít nhất một nhân viên", HttpStatus.BAD_REQUEST),
    SALARY_PAYMENT_AMOUNT_INVALID("Tiền trả nhân viên phải lớn hơn 0", HttpStatus.UNPROCESSABLE_ENTITY),
    SALARY_PAYMENT_EXCEEDS_REMAINING("Tiền trả nhân viên vượt quá số còn cần trả", HttpStatus.UNPROCESSABLE_ENTITY),
    PAYSLIP_ALREADY_PAID("Phiếu lương đã có thanh toán, không thể hủy", HttpStatus.UNPROCESSABLE_ENTITY),
    PAYSLIP_CANCELLED("Phiếu lương đã bị hủy", HttpStatus.UNPROCESSABLE_ENTITY),
    SALARY_TEMPLATE_NOT_FOUND("Không tìm thấy mẫu lương", HttpStatus.NOT_FOUND),
    SALARY_TEMPLATE_NAME_DUPLICATE("Tên mẫu lương đã tồn tại", HttpStatus.CONFLICT),

    // Attendance & Shift (SRS_AT) — UC-AT-01..07, BR-AT-*
    AT_SHIFT_NOT_FOUND("Không tìm thấy ca làm việc", HttpStatus.NOT_FOUND),
    AT_SHIFT_NAME_DUPLICATE("Tên ca làm việc đã tồn tại", HttpStatus.CONFLICT),
    AT_SHIFT_TIME_INVALID("Giờ làm việc của ca không hợp lệ", HttpStatus.BAD_REQUEST),
    AT_SHIFT_INACTIVE("Ca làm việc đã ngừng hoạt động, không thể chọn khi xếp lịch", HttpStatus.UNPROCESSABLE_ENTITY),
    AT_SHIFT_HAS_ATTENDANCE("Ca đã có dữ liệu chấm công, chỉ có thể ngừng hoạt động", HttpStatus.CONFLICT),
    AT_SCHEDULE_NOT_FOUND("Không tìm thấy lịch làm việc", HttpStatus.NOT_FOUND),
    AT_SCHEDULE_DUPLICATE("Nhân viên đã được xếp ca này trong ngày", HttpStatus.CONFLICT),
    AT_SCHEDULE_OVERLAP_LIMIT("Tổng thời gian trùng giữa các ca trong ngày vượt quá 12 giờ", HttpStatus.UNPROCESSABLE_ENTITY),
    AT_SCHEDULE_HAS_ATTENDANCE("Lịch đã có dữ liệu chấm công, không thể xóa", HttpStatus.CONFLICT),
    AT_SCHEDULE_RULE_NOT_FOUND("Không tìm thấy quy tắc lặp lịch", HttpStatus.NOT_FOUND),
    AT_EMPLOYEE_INACTIVE("Nhân viên đã ngừng làm việc, không thể xếp lịch mới", HttpStatus.UNPROCESSABLE_ENTITY),
    AT_RECORD_NOT_FOUND("Không tìm thấy bản ghi chấm công", HttpStatus.NOT_FOUND),
    AT_RECORD_TIME_INVALID("Giờ ra phải sau giờ vào", HttpStatus.UNPROCESSABLE_ENTITY),
    AT_SUBSTITUTE_SINGLE_ONLY("Chỉ có thể chỉ định người làm thay khi chọn đúng một lịch làm việc", HttpStatus.BAD_REQUEST),
    AT_SUBSTITUTE_SELF("Người làm thay phải khác nhân viên được xếp ca", HttpStatus.BAD_REQUEST),
    AT_MERGE_LIMIT_EXCEEDED("Vượt giới hạn gộp ca liên tục", HttpStatus.UNPROCESSABLE_ENTITY),
    AT_MERGE_DISABLED("Chế độ chấm 1 lượt Vào–Ra cho nhiều ca liên tục chưa được bật", HttpStatus.UNPROCESSABLE_ENTITY),
    AT_VIOLATION_TYPE_NOT_FOUND("Không tìm thấy loại vi phạm", HttpStatus.NOT_FOUND),
    AT_SETTING_INVALID("Thiết lập chấm công không hợp lệ", HttpStatus.BAD_REQUEST),

    // System
    INTERNAL_ERROR("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String defaultMessage;
    private final HttpStatus httpStatus;

    ApplicationError(String defaultMessage, HttpStatus httpStatus) {
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
    }
}
