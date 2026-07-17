package com.rms.restaurant.module.employee.dto;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record UpdateEmployeeRequest(
        String name,
        @Pattern(regexp = "^0\\d{9,10}$") String phone,
        EmployeeStatus status,
        LocalDate startDate,
        String timekeepCode,
        String note,
        String idNumber,
        LocalDate birthday,
        String gender,
        String address,
        @Email String email,
        String avatarUrl,
        String userId
) {}
