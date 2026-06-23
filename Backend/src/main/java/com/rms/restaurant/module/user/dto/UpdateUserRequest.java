package com.rms.restaurant.module.user.dto;

import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;

public record UpdateUserRequest(
        String fullName,
        @Email String email,
        @Pattern(regexp = "^0\\d{9,10}$") String phone,
        UserRole role,
        UserStatus status
) {}
