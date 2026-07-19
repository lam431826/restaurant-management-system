package com.rms.restaurant.module.attendance.dto;

/** Derived display status of one timesheet cell (UC-AT-07); presentation-only, not persisted. */
public enum TimesheetStatus {
    /** Future schedule without a record yet. */
    SCHEDULED,
    /** Past/today schedule the manager has not marked. */
    UNMARKED,
    /** Leave (either kind). */
    OFF,
    /** PRESENT but missing check-in or check-out. */
    MISSING,
    /** PRESENT with counted late/early minutes. */
    LATE_EARLY,
    /** PRESENT, fully within the shift window. */
    ON_TIME
}
