package com.rms.restaurant.module.shift.service;

import com.rms.restaurant.module.shift.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ShiftService {
    ShiftSummaryResponse open(OpenShiftRequest request, String cashierUsername);
    void addCashMovement(String shiftId, CashMovementRequest request, String operatorUsername);
    ShiftSummaryResponse close(String shiftId, CloseShiftRequest request, String closingUsername);
    ShiftSummaryResponse getSummary(String shiftId, String requestingUsername);
    ShiftSummaryResponse getOpenShiftSummary();
    Page<ShiftSummaryResponse> listAll(Pageable pageable, String requestingUsername);
}
