package com.rms.restaurant.module.employee.dto;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmployeeResponse(
        String id,
        String code,
        String name,
        String phone,
        EmployeeStatus status,
        String avatarUrl,
        LocalDate startDate,
        String timekeepCode,
        String note,
        String idNumber,
        LocalDate birthday,
        String gender,
        String address,
        String email,
        String userId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
