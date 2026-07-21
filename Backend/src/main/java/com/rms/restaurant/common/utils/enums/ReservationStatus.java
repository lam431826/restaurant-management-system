package com.rms.restaurant.common.utils.enums;

public enum ReservationStatus {
    PENDING,
    CONFIRMED,
    CHECKED_IN,
    NO_SHOW,
    CANCELLED,
    /** The guest's stay is done — their order was closed/paid. Set by
     * ReservationService.completeStayForTable(), never via the generic update() endpoint. */
    COMPLETED
}
