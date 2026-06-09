package com.rms.restaurant.module.shift.service;

import com.rms.restaurant.module.shift.dto.*;

public interface ShiftService {
    ShiftSummaryResponse open(OpenShiftRequest request, String cashierId);
    ShiftSummaryResponse close(CloseShiftRequest request, String cashierId);
    ShiftSummaryResponse getCurrent(String cashierId);
    void addCashMovement(String shiftId, CashMovementRequest request);
}
