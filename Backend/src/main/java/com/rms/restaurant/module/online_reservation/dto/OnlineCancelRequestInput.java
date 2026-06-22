package com.rms.restaurant.module.online_reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OnlineCancelRequestInput(
        @NotBlank @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại không hợp lệ") String phone
) {}
