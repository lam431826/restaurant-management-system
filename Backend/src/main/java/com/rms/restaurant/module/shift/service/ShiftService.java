package com.rms.restaurant.module.shift.service;

import com.rms.restaurant.module.shift.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ShiftService {

    // SM-01: BR-CS-01 (per-cashier)
    ShiftSummaryResponse open(OpenShiftRequest request, String cashierUsername);

    // BR-CS-09/11: suggested opening float = the cashier's last handover amount
    BigDecimal getSuggestedOpeningFloat(String username);

    // SM-03: BR-CLOSE-01..08
    ShiftSummaryResponse close(String shiftId, CloseShiftRequest request, String closingUsername);

    // BR-CS-15: manager force-closes a stale/open shift the cashier never closed
    ShiftSummaryResponse forceClose(String shiftId, ForceCloseShiftRequest request, String managerUsername);

    // Manager approves a shift awaiting manager confirmation (PENDING_MANAGER_CONFIRM)
    ShiftSummaryResponse approveClose(String shiftId, String managerUsername);

    // Manager rejects a shift awaiting manager confirmation; reopens it for the cashier to fix and resubmit
    ShiftSummaryResponse rejectClose(String shiftId, RejectCloseRequest request, String managerUsername);

    // SM-04: get a specific shift (owner or manager)
    ShiftSummaryResponse getSummary(String shiftId, String requestingUsername);

    // SM-04: get calling cashier's own open shift (404 when none)
    ShiftSummaryResponse getMyOpenShift(String username);

    // manager list
    Page<ShiftSummaryResponse> listAll(Pageable pageable, String requestingUsername);

    // CS-05: manager daily summary aggregating all cashiers' shifts for a date
    DailySummaryResponse dailySummary(LocalDate date, String requestingUsername);
}
