package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdatePromotionRequest(
        @NotBlank
        @Size(max = 50)
        String code,

        @Size(max = 200)
        String description,

        BigDecimal discountPercent,
        BigDecimal discountAmount,
        LocalDate validFrom,
        LocalDate validTo,
        Integer usageLimit,
        Boolean active
) {}
