package com.rms.restaurant.module.shift.service;

import com.rms.restaurant.module.shift.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ShiftService {

    // SM-01: BR-CS-01 (per-cashier)
    ShiftSummaryResponse open(OpenShiftRequest request, String cashierUsername);

    // SM-02: BR-CASH-01..06
    void addCashMovement(String shiftId, CashMovementRequest request, String operatorUsername);

    // SM-03: BR-CLOSE-01..08
    ShiftSummaryResponse close(String shiftId, CloseShiftRequest request, String closingUsername);

    // SM-04: get a specific shift (owner or manager)
    ShiftSummaryResponse getSummary(String shiftId, String requestingUsername);

    // SM-04: get calling cashier's own open shift (404 when none)
    ShiftSummaryResponse getMyOpenShift(String username);

    // manager list
    Page<ShiftSummaryResponse> listAll(Pageable pageable, String requestingUsername);
}
