package com.rms.restaurant.module.authentication.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rms.restaurant.common.utils.enums.UserRole;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
        String accessToken,
        String refreshToken,
        Long expiresIn,
        UserInfo user,
        Boolean requiresVerification,
        String verifyToken
) {
    public record UserInfo(String id, String username, String fullName, UserRole role) {}
}
