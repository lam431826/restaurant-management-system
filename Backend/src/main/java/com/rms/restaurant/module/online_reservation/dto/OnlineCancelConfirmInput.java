package com.rms.restaurant.module.online_reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OnlineCancelConfirmInput(
        @NotBlank String cancelToken,
        @NotBlank @Size(min = 6, max = 6, message = "OTP phải đúng 6 chữ số") String otp
) {}
