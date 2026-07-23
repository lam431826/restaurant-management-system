package com.rms.restaurant.module.shift.dto;

import jakarta.validation.constraints.NotBlank;

// Manager rejects a shift sitting in PENDING_MANAGER_CONFIRM: the shift reopens (back to
// OPEN) so the cashier can fix and resubmit. The reason is stored on closingNote.
public record RejectCloseRequest(
        @NotBlank String reason
) {}
