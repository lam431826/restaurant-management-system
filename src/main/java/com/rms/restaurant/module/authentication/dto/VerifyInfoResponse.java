package com.rms.restaurant.module.authentication.dto;

import java.time.LocalDateTime;

public record VerifyInfoResponse(String maskedEmail, LocalDateTime expiresAt) {}
