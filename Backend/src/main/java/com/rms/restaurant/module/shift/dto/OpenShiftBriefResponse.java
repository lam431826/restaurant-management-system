package com.rms.restaurant.module.shift.dto;

import java.time.LocalDateTime;

// CS-07: a minimal view of an OPEN normal shift, used to pick a merge target for a
// floating shift.
public record OpenShiftBriefResponse(
        String shiftId,
        String cashierId,
        String cashierName,
        LocalDateTime openedAt
) {}
