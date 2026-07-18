package com.rms.restaurant.module.payroll.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rms.restaurant.module.payroll.dto.*;
import com.rms.restaurant.module.payroll.model.PayrollSheet;
import com.rms.restaurant.module.payroll.model.Payslip;
import com.rms.restaurant.module.payroll.model.PayslipPayment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
public class PayrollMapper {

    private static final TypeReference<List<AttendanceDetailRow>> SNAPSHOT_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public PayrollSheetResponse toResponse(PayrollSheet sheet, List<Payslip> payslips) {
        BigDecimal total = sumActive(payslips, Payslip::getTotal);
        BigDecimal paid = sumActive(payslips, Payslip::getPaidAmount);
        return new PayrollSheetResponse(
                sheet.getId(), sheet.getCode(), sheet.getName(), sheet.getPayTerm(),
                sheet.getPeriodStart(), sheet.getPeriodEnd(), sheet.getScope(),
                sheet.getStatus(), sheet.getPaymentStatus(),
                (int) payslips.stream().filter(this::isActive).count(),
                total, paid, total.subtract(paid),
                sheet.getNote(), sheet.getCreatedBy(), sheet.getFinalizedBy(), sheet.getFinalizedAt(),
                sheet.getDataRefreshedAt(), sheet.getCreatedAt(), sheet.getUpdatedAt());
    }

    public PayslipRowResponse toRowResponse(Payslip p) {
        return new PayslipRowResponse(
                p.getId(), p.getCode(), p.getEmployeeId(), p.getEmployeeCode(), p.getEmployeeName(),
                p.getSalaryType(), p.getMainSalary(), p.getOvertimeSalary(), p.getDeduction(),
                p.getTotal(), p.getPaidAmount(), p.getRemaining(), p.getPaymentStatus(), p.getStatus(),
                p.getShiftCount(), p.getWorkedMinutes(), p.getOtMinutes(),
                p.isMainOverridden(), p.isOvertimeOverridden(), p.isDeductionOverridden());
    }

    public PaymentResponse toPaymentResponse(PayslipPayment payment, Payslip payslip) {
        return new PaymentResponse(
                payment.getId(), payment.getVoucherCode(), payment.getPayslipId(),
                payslip != null ? payslip.getCode() : null,
                payslip != null ? payslip.getEmployeeName() : null,
                payment.getAmount(), payment.getMethod(), payment.getPaidAt(),
                payment.getNote(), payment.getCreatedBy());
    }

    public PayslipDetailResponse toDetailResponse(Payslip p, PayrollSheet sheet,
                                                  List<PaymentResponse> payments) {
        return new PayslipDetailResponse(
                p.getId(), p.getCode(), p.getEmployeeId(), p.getEmployeeCode(), p.getEmployeeName(),
                p.getSalaryType(), p.getMainSalary(), p.getOvertimeSalary(), p.getDeduction(),
                p.getTotal(), p.getPaidAmount(), p.getRemaining(), p.getPaymentStatus(), p.getStatus(),
                p.getShiftCount(), p.getWorkedMinutes(), p.getOtMinutes(),
                sheet.getId(), sheet.getCode(), sheet.getName(),
                sheet.getPeriodStart(), sheet.getPeriodEnd(), sheet.getStatus(),
                parseSnapshot(p.getAttendanceSnapshot()), payments);
    }

    public List<AttendanceDetailRow> parseSnapshot(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, SNAPSHOT_TYPE);
        } catch (Exception e) {
            return List.of();
        }
    }

    private boolean isActive(Payslip p) {
        return p.getStatus() == com.rms.restaurant.common.utils.enums.PayslipStatus.ACTIVE;
    }

    private BigDecimal sumActive(List<Payslip> payslips, java.util.function.Function<Payslip, BigDecimal> f) {
        return payslips.stream().filter(this::isActive).map(f)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
