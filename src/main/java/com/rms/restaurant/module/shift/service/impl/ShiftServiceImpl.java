package com.rms.restaurant.module.shift.service.impl;

import com.rms.restaurant.module.shift.dto.*;
import com.rms.restaurant.module.shift.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ShiftServiceImpl implements ShiftService {

    @Override public ShiftSummaryResponse open(OpenShiftRequest request, String cashierId) { return null; }
    @Override public ShiftSummaryResponse close(CloseShiftRequest request, String cashierId) { return null; }
    @Override public ShiftSummaryResponse getCurrent(String cashierId) { return null; }
    @Override public void addCashMovement(String shiftId, CashMovementRequest request) {}
}
