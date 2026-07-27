package com.rms.restaurant.module.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record SelfEmployeeProfileRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "^0\\d{9,10}$") String phone,
        String note,
        @Pattern(regexp = "^\\d*$") String idNumber,
        LocalDate birthday,
        String gender,
        String address,
        @Email String email
) {}
