package com.rms.restaurant.module.shift.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

// BR-CS-19: merge a floating shift into a main shift. The helper counts the cash
// collected in the floating shift; its transactions are re-tagged to the main shift
// (keeping each payment's original cashier_id). A note is required when the counted
// total disagrees with the floating shift's recorded cash beyond tolerance (reuses BR-CS-05).
public record MergeFloatingRequest(
        @NotBlank String mainShiftId,
        @NotNull @PositiveOrZero BigDecimal countedCash,
        String note
) {}
