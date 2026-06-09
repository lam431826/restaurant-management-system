package com.rms.restaurant.module.shift.service;

import com.rms.restaurant.module.shift.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ShiftService {
<<<<<<< HEAD

    // SM-01: BR-OPEN-01..04
    ShiftSummaryResponse open(OpenShiftRequest request, String cashierUsername);

    // SM-02: BR-CASH-01..06
    void addCashMovement(String shiftId, CashMovementRequest request, String operatorUsername);

    // SM-03: BR-CLOSE-01..08
    ShiftSummaryResponse close(String shiftId, CloseShiftRequest request, String closingUsername);

    // SM-04: BR-SUM-01..04
    ShiftSummaryResponse getSummary(String shiftId, String requestingUsername);

    // BR-SUM-02: real-time view of currently open shift
    ShiftSummaryResponse getOpenShiftSummary();

    // BR-SUM-03: managers can list all shifts
=======
    ShiftSummaryResponse open(OpenShiftRequest request, String cashierUsername);
    void addCashMovement(String shiftId, CashMovementRequest request, String operatorUsername);
    ShiftSummaryResponse close(String shiftId, CloseShiftRequest request, String closingUsername);
    ShiftSummaryResponse getSummary(String shiftId, String requestingUsername);
    ShiftSummaryResponse getOpenShiftSummary();
>>>>>>> origin/develop
    Page<ShiftSummaryResponse> listAll(Pageable pageable, String requestingUsername);
}
