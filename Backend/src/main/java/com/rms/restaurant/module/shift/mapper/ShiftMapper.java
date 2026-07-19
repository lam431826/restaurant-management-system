package com.rms.restaurant.module.shift.mapper;

import com.rms.restaurant.module.shift.dto.*;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.model.ShiftCashMovement;
import com.rms.restaurant.module.shift.model.ShiftPaymentReconciliation;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class ShiftMapper {

    public ShiftSummaryResponse toSummary(
            Shift shift,
            List<ShiftPaymentReconciliation> reconciliations,
            List<ShiftCashMovement> movements,
            BigDecimal totalCashIn,
            BigDecimal totalCashOut) {

        List<PaymentMethodBreakdown> breakdown = reconciliations.stream()
                .map(r -> new PaymentMethodBreakdown(
                        r.getPaymentMethod(),
                        r.getExpectedAmount(),
                        r.getActualAmount(),
                        r.getVariance()))
                .toList();

        List<CashMovementDetail> cashMovements = movements.stream()
                .map(m -> new CashMovementDetail(
                        m.getId(),
                        m.getType(),
                        m.getAmount(),
                        m.getReason(),
                        m.getOperatorId(),
                        m.getCreatedAt()))
                .toList();

        BigDecimal totalRevenue = shift.getTotalRevenue() != null
                ? shift.getTotalRevenue()
                : reconciliations.stream()
                        .filter(r -> r.getPaymentMethod() != null)
                        .map(ShiftPaymentReconciliation::getExpectedAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalVariance = reconciliations.stream()
                .map(r -> r.getVariance().abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ShiftSummaryResponse(
                shift.getId(),
                shift.getCashierId(),
                shift.getClosedBy(),
                shift.getStatus(),
                shift.getShiftType(),
                shift.getOpenedAt(),
                shift.getClosedAt(),
                shift.getOpeningCash(),
                shift.getHandoverAmount(),
                totalCashIn,
                totalCashOut,
                totalRevenue,
                totalVariance,
                shift.getCardBatchTotal(),
                breakdown,
                cashMovements,
                shift.getClosingNote());
    }
}
