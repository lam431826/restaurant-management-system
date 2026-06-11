package com.rms.restaurant.module.user.dto;

import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.enums.UserStatus;

import java.time.LocalDateTime;

public record UserResponse(
        String id,
        String username,
        String fullName,
        String email,
        String phone,
        UserRole role,
        UserStatus status,
        LocalDateTime createdAt
) {}
