package com.rms.restaurant.module.payroll.dto;

import jakarta.validation.constraints.NotNull;

/** BR-PAY-12: Tải lại toàn bộ / Chỉ cập nhật theo ngày làm việc. */
public record ReloadRequest(@NotNull ReloadMode mode) {

    public enum ReloadMode {
        /** Recompute everything and clear all manual overrides. */
        FULL,
        /** Recompute attendance-derived values (main, OT, snapshot); keep the manually-edited deduction. */
        BY_WORKDAY
    }
}
