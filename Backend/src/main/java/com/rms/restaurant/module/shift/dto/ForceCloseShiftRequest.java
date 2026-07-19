package com.rms.restaurant.module.shift.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

// BR-CS-15: a manager force-closes a STALE (or still-OPEN) shift the cashier never
// closed. The manager counts the till, enters the actual cash and a mandatory reason;
// the discrepancy is computed as in a normal close. The original cashier stays
// accountable (cashier_id is unchanged); closed_by records the manager.
public record ForceCloseShiftRequest(
        @NotNull @PositiveOrZero BigDecimal cashActual,
        @NotBlank String reason
) {}
