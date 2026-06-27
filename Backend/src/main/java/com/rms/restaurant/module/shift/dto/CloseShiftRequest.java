package com.rms.restaurant.module.shift.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

// CS-04: the cashier counts and enters ONLY the physical cash (BR-CS-04, BR-CS-13).
// The three online channels (QR banking, card, e-wallet) are auto-recorded by the
// system at close (actual = recorded) and reconciled later by the manager (BR-CS-06).
public record CloseShiftRequest(

        // BR-CS-04: counted physical cash — the only channel the cashier reconciles
        @NotNull @PositiveOrZero BigDecimal cashActual,

        // BR-CS-09: handover amount passed to next cashier as opening float suggestion
        @NotNull @PositiveOrZero BigDecimal handoverAmount,

        // BR-CS-12: optional card POS batch total — informational cross-check only;
        // never produces a discrepancy and never blocks closing
        @PositiveOrZero BigDecimal cardBatchTotal,

        // BR-CS-05: required when the cash variance is non-zero
        String closingNote

) {}
