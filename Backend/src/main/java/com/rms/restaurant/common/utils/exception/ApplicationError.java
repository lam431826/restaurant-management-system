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

    // Menu Management
    DUPLICATE_CATEGORY_NAME("A category with this name already exists", HttpStatus.CONFLICT),
    CATEGORY_HAS_ITEMS("Category still has items; reassign or remove them first", HttpStatus.CONFLICT),
    MENU_ITEM_HAS_ORDERS("Item has existing orders and cannot be deleted; deactivate it instead", HttpStatus.CONFLICT),
    MENU_IMPORT_INVALID("The import file is missing or has an invalid format", HttpStatus.BAD_REQUEST),

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
    INVALID_TABLE_TOKEN("Table token is invalid or expired", HttpStatus.UNAUTHORIZED),
    SHIFT_ALREADY_OPEN("A shift is already open", HttpStatus.CONFLICT),
    SHIFT_NOT_OPEN("No open shift found", HttpStatus.NOT_FOUND),
    SHIFT_CLOSED("Shift is already closed", HttpStatus.UNPROCESSABLE_ENTITY),
    SHIFT_VARIANCE_NOTE_REQUIRED("A closing note is required when variance exceeds tolerance", HttpStatus.UNPROCESSABLE_ENTITY),
    SHIFT_HANDOVER_EXCEEDS_CASH("Handover amount cannot exceed actual cash counted", HttpStatus.UNPROCESSABLE_ENTITY),
    CASHIER_NOT_CHECKED_IN("You must be clocked in on a work shift before opening a cash shift", HttpStatus.CONFLICT),
    CLOCK_OUT_OPEN_SHIFT("Bạn còn ca thu ngân đang mở. Vui lòng đóng ca thu ngân trước khi chấm công ra.", HttpStatus.CONFLICT),
    CASH_OUT_EXCEEDS_BALANCE("Cash-out amount exceeds current drawer balance", HttpStatus.UNPROCESSABLE_ENTITY),
    CASH_MOVEMENT_REASON_REQUIRED("A reason is required for cash-out transactions", HttpStatus.BAD_REQUEST),
    INVALID_CASH_MOVEMENT_TYPE("Transaction type must be CASH_IN or CASH_OUT", HttpStatus.BAD_REQUEST),
    RESERVATION_NO_EMAIL("No email on file — contact the restaurant to cancel", HttpStatus.UNPROCESSABLE_ENTITY),
    RESERVATION_PHONE_MISMATCH("Phone number does not match this reservation", HttpStatus.UNAUTHORIZED),
    CANCEL_TOKEN_INVALID("Cancellation token is invalid or has expired", HttpStatus.UNAUTHORIZED),
    CANNOT_CANCEL_PAID_ORDER("Cannot cancel an order that has been paid", HttpStatus.UNPROCESSABLE_ENTITY),
    CANNOT_CANCEL_INVOICED_ORDER("Cannot cancel an order after invoice has been created", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_ALREADY_INVOICED("Order already has an invoice and cannot be modified", HttpStatus.UNPROCESSABLE_ENTITY),
    CANNOT_CANCEL_ORDER_ITEMS_NOT_PENDING("Cannot cancel order because some items are already being prepared or served", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_ITEM_REMOVE_NOT_ALLOWED("Only pending order items can be removed", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_ITEM_STATUS_TRANSITION_NOT_ALLOWED("Order item status transition is not allowed", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ALREADY_EXISTS("Invoice already exists for this order", HttpStatus.CONFLICT),
    INVOICE_ALREADY_PAID("Cannot apply a promotion to a paid invoice", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_NOT_PAYABLE("Invoice is not active and cannot accept payment or discount changes", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ALREADY_DISCOUNTED("Invoice already has a promotion discount", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_PROMOTION_ALREADY_APPLIED("This promotion has already been applied to this invoice", HttpStatus.UNPROCESSABLE_ENTITY),
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
    INVALID_INVOICE_MERGE("Invoice merge sources are invalid", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_MERGE_ORDER_MISMATCH("Invoice merge sources must belong to the same order", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_NOT_MERGEABLE("Invoice cannot be merged in its current state", HttpStatus.UNPROCESSABLE_ENTITY),
    FORBIDDEN("You do not have permission to perform this action", HttpStatus.FORBIDDEN),

    // Roster (Work Shift) — WS-01..09, BR-WS-*
    TEMPLATE_NOT_FOUND("Shift template not found", HttpStatus.NOT_FOUND),
    DUPLICATE_TEMPLATE_NAME("A shift template with this name already exists", HttpStatus.CONFLICT),
    TEMPLATE_INVALID_TIME_RANGE("End time must be after start time", HttpStatus.BAD_REQUEST),
    TEMPLATE_BREAK_TOO_LONG("Break time must be shorter than the total shift duration", HttpStatus.BAD_REQUEST),
    TEMPLATE_IN_USE("Cannot delete: this shift template is used in the roster", HttpStatus.CONFLICT),
    ASSIGNMENT_NOT_FOUND("Shift assignment not found", HttpStatus.NOT_FOUND),
    SHIFT_OVERLAP("Shift times overlap", HttpStatus.CONFLICT),
    MIN_REST_VIOLATION("Minimum rest period between shifts is violated", HttpStatus.CONFLICT),
    CLOCK_ACTION_OUT_OF_WINDOW("Clock-in/out is only allowed within the configured time window", HttpStatus.UNPROCESSABLE_ENTITY),
    ATTENDANCE_NOT_CHECKED_IN("Not clocked in for this shift", HttpStatus.CONFLICT),
    ROSTER_REQUEST_FREEZE_WINDOW("Cannot submit a request this close to shift start", HttpStatus.UNPROCESSABLE_ENTITY),
    ROSTER_REQUEST_DUPLICATE_PENDING("A pending request already exists for this shift", HttpStatus.CONFLICT),
    ROSTER_REQUEST_NOT_FOUND("Shift request not found", HttpStatus.NOT_FOUND),
    ROSTER_REQUEST_NOT_PENDING("This request has already been decided", HttpStatus.CONFLICT),

    // System
    INTERNAL_ERROR("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String defaultMessage;
    private final HttpStatus httpStatus;

    ApplicationError(String defaultMessage, HttpStatus httpStatus) {
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
    }
}
