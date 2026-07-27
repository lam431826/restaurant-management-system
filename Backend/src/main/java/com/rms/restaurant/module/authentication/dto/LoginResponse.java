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
        String verifyToken,
        // Already-known values to prefill the first-login profile form with — fullName is set at
        // account creation, phone comes from a linked Employee (or User.phone) if one already
        // exists. Only populated on the requiresVerification branch.
        String pendingFullName,
        String pendingPhone
) {
    public record UserInfo(String id, String username, String fullName, UserRole role) {}
}
