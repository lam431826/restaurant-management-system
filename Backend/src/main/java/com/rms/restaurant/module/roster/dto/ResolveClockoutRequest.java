package com.rms.restaurant.module.roster.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

// BR-WS-14 (TS-02): a manager resolves a MISSING_CLOCKOUT record by entering the
// actual clock-out time and a reason; worked minutes are then computed.
public record ResolveClockoutRequest(
        @NotNull LocalDateTime checkOutAt,
        @NotBlank String reason
) {}
