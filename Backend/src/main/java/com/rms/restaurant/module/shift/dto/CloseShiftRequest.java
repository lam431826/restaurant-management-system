package com.rms.restaurant.module.shift.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

public record CloseShiftRequest(

        @NotEmpty @Valid List<PaymentActualAmount> actualAmounts,

        // BR-CS-09: handover amount passed to next cashier as opening float suggestion
        @NotNull @PositiveOrZero BigDecimal handoverAmount,

        // BR-CS-05: required when any variance exceeds tolerance
        String closingNote

) {
    public record PaymentActualAmount(
            @NotNull PaymentMethod method,
            @NotNull @PositiveOrZero BigDecimal amount
    ) {}
}
