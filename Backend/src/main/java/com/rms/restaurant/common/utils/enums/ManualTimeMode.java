package com.rms.restaurant.common.utils.enums;

/**
 * Default prefill mode for manual attendance times (BR-AT-05):
 * SHIFT_TIME = shift start/end times, ACTUAL_TIME = the moment the manager marks attendance.
 * The manager can always override the prefilled values.
 */
public enum ManualTimeMode {
    SHIFT_TIME,
    ACTUAL_TIME
}
