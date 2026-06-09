package com.rms.restaurant.module.authentication.dto;

import jakarta.validation.constraints.NotBlank;

public record ResendOtpRequest(@NotBlank String verifyToken) {}
