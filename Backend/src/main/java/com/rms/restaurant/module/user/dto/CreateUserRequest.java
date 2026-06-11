package com.rms.restaurant.module.user.dto;

import com.rms.restaurant.common.utils.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateUserRequest(
        @NotBlank String username,
        @NotBlank String fullName,
        @Email String email,
        @Pattern(regexp = "^0\\d{9,10}$") String phone,
        @NotNull UserRole role
) {}
