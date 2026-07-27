package com.rms.restaurant.module.shift.dto;

import java.time.LocalDateTime;

public record ShiftSettingResponse(
        boolean shiftClosingRequired,
        boolean managerConfirmClosing,
        LocalDateTime updatedAt
) {}
