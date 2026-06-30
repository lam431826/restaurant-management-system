package com.rms.restaurant.module.roster.dto;

import com.rms.restaurant.common.utils.enums.ShiftRequestStatus;
import com.rms.restaurant.common.utils.enums.ShiftRequestType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record RequestResponse(
        String id,
        ShiftRequestType type,
        String requesterId,
        LocalDate date,
        String shiftTemplateId,
        String targetEmployeeId,
        String reason,
        ShiftRequestStatus status,
        String managerNote,
        LocalDateTime createdAt
) {}
