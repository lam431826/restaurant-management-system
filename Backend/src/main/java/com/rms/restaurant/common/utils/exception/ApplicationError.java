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
    SHIFT_NOT_FOUND("Shift not found", HttpStatus.NOT_FOUND),
    PROMOTION_NOT_FOUND("Promotion not found", HttpStatus.NOT_FOUND),

    // User Management
    DUPLICATE_USERNAME("Username already in use", HttpStatus.CONFLICT),
    DUPLICATE_EMAIL("Email already in use", HttpStatus.CONFLICT),
    DUPLICATE_PHONE("Phone number already in use", HttpStatus.CONFLICT),
    USER_NOT_UNLOCKABLE("Only locked accounts can be unlocked", HttpStatus.UNPROCESSABLE_ENTITY),

    // Business Rules
    TABLE_NOT_AVAILABLE("Table is not available for this time slot", HttpStatus.CONFLICT),
    INVALID_TABLE_TOKEN("Table token is invalid or expired", HttpStatus.UNAUTHORIZED),
    SHIFT_ALREADY_OPEN("A shift is already open", HttpStatus.CONFLICT),
    SHIFT_NOT_OPEN("No open shift found", HttpStatus.CONFLICT),
    SHIFT_CLOSED("Shift is already closed", HttpStatus.UNPROCESSABLE_ENTITY),
    SHIFT_VARIANCE_NOTE_REQUIRED("A closing note is required when variance exceeds tolerance", HttpStatus.UNPROCESSABLE_ENTITY),
    CASH_OUT_EXCEEDS_BALANCE("Cash-out amount exceeds current drawer balance", HttpStatus.UNPROCESSABLE_ENTITY),
    CASH_MOVEMENT_REASON_REQUIRED("A reason is required for cash-out transactions", HttpStatus.BAD_REQUEST),
    INVALID_CASH_MOVEMENT_TYPE("Transaction type must be CASH_IN or CASH_OUT", HttpStatus.BAD_REQUEST),
    CANNOT_CANCEL_PAID_ORDER("Cannot cancel an order that has been paid", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ALREADY_EXISTS("Invoice already exists for this order", HttpStatus.CONFLICT),
    INVOICE_ALREADY_PAID("Cannot apply a promotion to a paid invoice", HttpStatus.UNPROCESSABLE_ENTITY),
    PROMOTION_USAGE_LIMIT_REACHED("Promotion usage limit has been reached", HttpStatus.CONFLICT),
    PROMOTION_CHANGE_NOT_ALLOWED("Changing the promotion on an invoice is not allowed", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_PROMOTION_USAGE_LIMIT("Promotion usage limit is invalid", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_STATUS_TRANSITION("Invalid status transition", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_NOT_CLOSEABLE("Order cannot be closed in its current state", HttpStatus.UNPROCESSABLE_ENTITY),
    FORBIDDEN("You do not have permission to perform this action", HttpStatus.FORBIDDEN),

    // System
    INTERNAL_ERROR("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String defaultMessage;
    private final HttpStatus httpStatus;

    ApplicationError(String defaultMessage, HttpStatus httpStatus) {
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
    }
}
