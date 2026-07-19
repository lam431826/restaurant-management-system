package com.rms.restaurant.common.utils.enums;

public enum AttendanceStatus {
    SCHEDULED,
    CHECKED_IN,
    CHECKED_OUT,
    NO_SHOW,
    LEAVE,
    EARLY_LEAVE,       // BR-WS-11: clocked out before scheduled end (reason captured)
    MISSING_CLOCKOUT   // BR-WS-14: checked in but never clocked out past end + grace
}
