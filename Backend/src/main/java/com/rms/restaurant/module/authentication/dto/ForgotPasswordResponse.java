package com.rms.restaurant.module.authentication.dto;

import java.time.LocalDateTime;

public record ForgotPasswordResponse(
        String resetToken,
        String maskedEmail,
        LocalDateTime expiresAt
) {}
