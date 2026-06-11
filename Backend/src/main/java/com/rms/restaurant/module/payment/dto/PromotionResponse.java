package com.rms.restaurant.module.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PromotionResponse(
        String id,
        String code,
        String description,
        BigDecimal discountPercent,
        BigDecimal discountAmount,
        LocalDate validFrom,
        LocalDate validTo,
        boolean active
) {}
