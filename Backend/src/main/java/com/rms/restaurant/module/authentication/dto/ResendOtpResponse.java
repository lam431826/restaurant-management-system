package com.rms.restaurant.module.authentication.dto;

public record ResendOtpResponse(String verifyToken, long expiresIn) {}
