package com.rms.restaurant.module.shift.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

public record CloseShiftRequest(

<<<<<<< HEAD
        // BR-CLOSE-02: actual counted amount for each payment method
        @NotEmpty @Valid List<PaymentActualAmount> actualAmounts,

        // BR-CLOSE-05: required when any variance exceeds tolerance
=======
        @NotEmpty @Valid List<PaymentActualAmount> actualAmounts,

>>>>>>> origin/develop
        String closingNote

) {
    public record PaymentActualAmount(
            @NotNull PaymentMethod method,
            @NotNull @PositiveOrZero BigDecimal amount
    ) {}
}
