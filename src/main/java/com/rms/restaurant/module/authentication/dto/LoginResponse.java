package com.rms.restaurant.module.authentication.dto;

import com.rms.restaurant.common.utils.enums.UserRole;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserInfo user
) {
    public record UserInfo(String id, String username, String fullName, UserRole role) {}
}
