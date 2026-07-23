package com.rms.restaurant.module.shift.dto;

public record ShiftSettingRequest(
        boolean shiftClosingRequired,
        boolean managerConfirmClosing
) {}
