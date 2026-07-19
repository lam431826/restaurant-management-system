package com.rms.restaurant.module.employee.dto;

// BR-IMP-03: the user must choose a strategy before importing.
public enum ImportStrategy {
    STOP_ON_ERROR,
    SKIP_AND_CONTINUE
}
