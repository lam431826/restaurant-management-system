package com.rms.restaurant.module.payroll.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rms.restaurant.common.utils.enums.AttendanceType;
import com.rms.restaurant.common.utils.enums.SalaryType;
import com.rms.restaurant.module.attendance.dto.AttendanceForPayroll;
import com.rms.restaurant.module.employee.model.SalarySetting;
import com.rms.restaurant.module.payroll.dto.AttendanceDetailRow;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure salary computation over one work period (BR-PAY-02..05, BR-PAY-10).
 * Wage source is SalarySetting.mainBaseWage — NOT the shift's own wage field, which belongs
 * to headcount planning and is intentionally ignored here.
 *
 * Attendance input comes from the AT module (BR-AT-13): otMinutes/lateMinutes/earlyLeaveMinutes
 * already have the BR-AT-09/10 thresholds applied upstream — this calculator must not
 * recompute them, only turn minutes into money.
 *
 * Rate JSON shape mirrors the salary-setting UI exactly:
 *   mainAdvancedRates: {"sat":{"amount":"150","unit":"percent"}|null,"sun":…,"off":…,"holiday":…}
 *   overtimeRates:     same plus "normal". Percent applies on the base wage; vnd is absolute.
 * "off"/"holiday" are stored but inert until a holiday calendar exists (BR-PAY-04 partial).
 * Unparseable JSON degrades to the plain base wage.
 */
@Component
@RequiredArgsConstructor
public class SalaryCalculator {

    private static final TypeReference<Map<String, RateSpec>> RATES_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    record RateSpec(String amount, String unit) {}

    public ComputedPayslip compute(SalarySetting setting, List<AttendanceForPayroll> attendance) {
        if (setting == null) {
            return new ComputedPayslip(null, BigDecimal.ZERO, BigDecimal.ZERO,
                    0, 0, 0, toJson(snapshotRows(attendance, "Chưa có thiết lập lương")));
        }
        return switch (setting.getMainSalaryType()) {
            case FIXED -> computeFixed(setting, attendance);
            case SHIFT -> computeShift(setting, attendance);
            case HOURLY -> computeHourly(setting, attendance);
        };
    }

    /** BR-PAY-03: fixed salary ignores attendance; records stay visible in the snapshot. */
    private ComputedPayslip computeFixed(SalarySetting setting, List<AttendanceForPayroll> attendance) {
        List<AttendanceDetailRow> rows = snapshotRows(attendance, "Lương cố định — không tính theo công");
        return new ComputedPayslip(SalaryType.FIXED, scale(setting.getMainBaseWage()), BigDecimal.ZERO,
                countPaidShifts(attendance), sumWorkedMinutes(attendance), 0, toJson(rows));
    }

    private ComputedPayslip computeShift(SalarySetting setting, List<AttendanceForPayroll> attendance) {
        Map<String, RateSpec> dayRates = parseRates(setting.getMainAdvancedRates());
        Map<String, RateSpec> otRates = parseRates(setting.getOvertimeRates());
        BigDecimal main = BigDecimal.ZERO;
        BigDecimal overtime = BigDecimal.ZERO;
        int otMinutesTotal = 0;
        List<AttendanceDetailRow> rows = new ArrayList<>();

        for (AttendanceForPayroll a : attendance) {
            String dayType = dayType(a.workDate().getDayOfWeek());
            BigDecimal shiftWage = resolveRate(setting.getMainBaseWage(), dayRates.get(dayType));
            BigDecimal amount = shiftAmount(a, shiftWage);
            int otMin = setting.isOvertimeEnabled() ? a.otMinutes() : 0;
            BigDecimal otAmount = otMin > 0
                    ? otAmount(setting.getMainBaseWage(), a, otMin, otRate(otRates, dayType)) : BigDecimal.ZERO;
            main = main.add(amount);
            overtime = overtime.add(otAmount);
            otMinutesTotal += otMin;
            rows.add(row(a, dayType, rateLabel(dayRates.get(dayType)), amount.add(otAmount), otMin, null));
        }
        return new ComputedPayslip(SalaryType.SHIFT, scale(main), scale(overtime),
                countPaidShifts(attendance), sumWorkedMinutes(attendance), otMinutesTotal, toJson(rows));
    }

    private ComputedPayslip computeHourly(SalarySetting setting, List<AttendanceForPayroll> attendance) {
        Map<String, RateSpec> dayRates = parseRates(setting.getMainAdvancedRates());
        BigDecimal main = BigDecimal.ZERO;
        List<AttendanceDetailRow> rows = new ArrayList<>();

        for (AttendanceForPayroll a : attendance) {
            String dayType = dayType(a.workDate().getDayOfWeek());
            BigDecimal hourlyRate = resolveRate(setting.getMainBaseWage(), dayRates.get(dayType));
            BigDecimal amount = BigDecimal.ZERO;
            if (isPaid(a) && a.workedMinutes() > 0) {
                amount = scale(hourlyRate.multiply(BigDecimal.valueOf(a.workedMinutes()))
                        .divide(BigDecimal.valueOf(60), 0, RoundingMode.HALF_UP));
            }
            main = main.add(amount);
            rows.add(row(a, dayType, rateLabel(dayRates.get(dayType)), amount, 0, null));
        }
        // BR-PAY-05: overtime applies to SHIFT-type main salary only.
        return new ComputedPayslip(SalaryType.HOURLY, scale(main), BigDecimal.ZERO,
                countPaidShifts(attendance), sumWorkedMinutes(attendance), 0, toJson(rows));
    }

    /** Full wage when the full shift's worked minutes are credited; prorated on early leave. */
    private BigDecimal shiftAmount(AttendanceForPayroll a, BigDecimal shiftWage) {
        if (!isPaid(a)) return BigDecimal.ZERO;
        if (a.earlyLeaveMinutes() > 0 && a.workedMinutes() > 0) {
            int scheduled = scheduledPaidMinutes(a);
            if (scheduled <= 0) return BigDecimal.ZERO;
            BigDecimal ratio = BigDecimal.valueOf(Math.min(a.workedMinutes(), scheduled))
                    .divide(BigDecimal.valueOf(scheduled), 6, RoundingMode.HALF_UP);
            return scale(shiftWage.multiply(ratio));
        }
        return scale(shiftWage);
    }

    /** BR-AT-10 already applied upstream — otMinutes is used as-is, never recomputed here. */
    private BigDecimal otAmount(BigDecimal baseWage, AttendanceForPayroll a, int otMin, RateSpec coefficient) {
        if (coefficient == null) return BigDecimal.ZERO;
        int scheduled = scheduledPaidMinutes(a);
        if (scheduled <= 0) return BigDecimal.ZERO;
        BigDecimal hourlyBase = baseWage.multiply(BigDecimal.valueOf(60))
                .divide(BigDecimal.valueOf(scheduled), 6, RoundingMode.HALF_UP);
        BigDecimal perHour = applyRate(hourlyBase, coefficient);
        return scale(perHour.multiply(BigDecimal.valueOf(otMin)).divide(BigDecimal.valueOf(60), 0, RoundingMode.HALF_UP));
    }

    /** Coefficient for the day type, falling back to the weekday ("normal") coefficient. */
    private RateSpec otRate(Map<String, RateSpec> otRates, String dayType) {
        RateSpec spec = otRates.get(dayType);
        return spec != null ? spec : otRates.get("normal");
    }

    private int scheduledPaidMinutes(AttendanceForPayroll a) {
        if (a.shiftStartTime() == null || a.shiftEndTime() == null) return 0;
        long span = Duration.between(a.shiftStartTime(), a.shiftEndTime()).toMinutes();
        if (span <= 0) span += 24 * 60; // overnight shift
        return (int) Math.max(0, span);
    }

    private String dayType(DayOfWeek day) {
        if (day == DayOfWeek.SATURDAY) return "sat";
        if (day == DayOfWeek.SUNDAY) return "sun";
        return "normal";
    }

    private boolean isPaid(AttendanceForPayroll a) {
        return a.type() == AttendanceType.PRESENT && a.actualCheckOut() != null;
    }

    private int countPaidShifts(List<AttendanceForPayroll> attendance) {
        return (int) attendance.stream().filter(this::isPaid).count();
    }

    private int sumWorkedMinutes(List<AttendanceForPayroll> attendance) {
        return attendance.stream().mapToInt(AttendanceForPayroll::workedMinutes).sum();
    }

    /** Percent applies on the base wage; vnd replaces it. Null/invalid → plain base wage. */
    private BigDecimal resolveRate(BigDecimal baseWage, RateSpec spec) {
        return spec == null ? baseWage : applyRate(baseWage, spec);
    }

    private BigDecimal applyRate(BigDecimal base, RateSpec spec) {
        BigDecimal amount = parseAmount(spec.amount());
        if (amount == null) return base;
        if ("percent".equalsIgnoreCase(spec.unit())) {
            return base.multiply(amount).divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        }
        return amount;
    }

    private BigDecimal parseAmount(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return new BigDecimal(raw.replaceAll("[^0-9.]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String rateLabel(RateSpec spec) {
        if (spec == null) return null;
        return "percent".equalsIgnoreCase(spec.unit()) ? spec.amount() + "%" : spec.amount() + " VND";
    }

    private Map<String, RateSpec> parseRates(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            Map<String, RateSpec> parsed = objectMapper.readValue(json, RATES_TYPE);
            Map<String, RateSpec> nonNull = new HashMap<>();
            parsed.forEach((k, v) -> { if (v != null) nonNull.put(k, v); });
            return nonNull;
        } catch (Exception e) {
            return Map.of(); // defensive: legacy/hand-written JSON falls back to base wage
        }
    }

    private List<AttendanceDetailRow> snapshotRows(List<AttendanceForPayroll> attendance, String note) {
        return attendance.stream()
                .map(a -> row(a, dayType(a.workDate().getDayOfWeek()), null, BigDecimal.ZERO, 0, note))
                .toList();
    }

    private AttendanceDetailRow row(AttendanceForPayroll a, String dayType,
                                    String rateApplied, BigDecimal amount, int otMin, String note) {
        return new AttendanceDetailRow(a.workDate(), a.shiftName(), a.type().name(),
                a.actualCheckIn(), a.actualCheckOut(), a.workedMinutes(), otMin, dayType, rateApplied,
                scale(amount), note);
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP);
    }

    private String toJson(List<AttendanceDetailRow> rows) {
        try {
            return objectMapper.writeValueAsString(rows);
        } catch (Exception e) {
            return "[]";
        }
    }
}
