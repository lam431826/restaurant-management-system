package com.rms.restaurant.common.utils.enums;

/** BR-PAY-09/13/14: Đang tạo → Tạm tính → Đã chốt lương; Tạm tính → Đã hủy. */
public enum PayrollSheetStatus {
    GENERATING,
    DRAFT,
    FINALIZED,
    CANCELLED
}
