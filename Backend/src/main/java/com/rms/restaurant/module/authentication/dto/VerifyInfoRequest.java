package com.rms.restaurant.module.authentication.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

// phone is required (not just format-checked) because verify/otp now also creates the linked
// Employee row from these fields, and Employee.phone is NOT NULL at the DB level.
public record VerifyInfoRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "^0\\d{9,10}$") String phone,
        LocalDate startDate,
        String note,
        String idNumber,
        LocalDate birthday,
        String gender,
        String address
) {}
