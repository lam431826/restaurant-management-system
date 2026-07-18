package com.rms.restaurant.common.utils.enums;

/**
 * Work-shift template status (SRS_AT UC-AT-01). INACTIVE shifts cannot be selected
 * when creating or editing schedules (BR-AT-01); existing schedules keep referencing them.
 * Named WorkShiftStatus to avoid ambiguity with the cashier module's cash-drawer shifts.
 */
public enum WorkShiftStatus {
    ACTIVE,
    INACTIVE
}
