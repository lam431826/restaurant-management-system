package com.rms.restaurant.module.payroll.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rms.restaurant.common.utils.enums.AttendanceType;
import com.rms.restaurant.common.utils.enums.SalaryType;
import com.rms.restaurant.module.attendance.dto.AttendanceForPayroll;
import com.rms.restaurant.module.employee.model.SalarySetting;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class SalaryCalculatorTest {

    private final SalaryCalculator calculator =
            new SalaryCalculator(new ObjectMapper().registerModule(new JavaTimeModule()));

    // Mon 2026-07-13 … Sun 2026-07-19
    private static final LocalDate MONDAY = LocalDate.of(2026, 7, 13);
    private static final LocalDate SATURDAY = LocalDate.of(2026, 7, 18);

    private static final LocalTime SHIFT_START = LocalTime.of(8, 0);
    private static final LocalTime SHIFT_END = LocalTime.of(12, 0); // 240 scheduled minutes

    private static SalarySetting setting(SalaryType type, long wage) {
        return SalarySetting.builder().mainSalaryType(type).mainBaseWage(BigDecimal.valueOf(wage)).build();
    }

    /** PRESENT attendance row. otMinutes/earlyLeaveMinutes are pre-thresholded (BR-AT-09/10), as AT provides them. */
    private static AttendanceForPayroll present(LocalDate date, LocalTime in, LocalTime out,
                                                Integer workedMinutes, int otMinutes, int earlyLeaveMinutes) {
        return new AttendanceForPayroll(date, "sh1", "Ca sáng", SHIFT_START, SHIFT_END,
                AttendanceType.PRESENT,
                in == null ? null : LocalDateTime.of(date, in),
                out == null ? null : LocalDateTime.of(date, out),
                workedMinutes == null ? 0 : workedMinutes, otMinutes, 0, earlyLeaveMinutes, BigDecimal.ZERO);
    }

    private static AttendanceForPayroll leave(LocalDate date, AttendanceType type) {
        return new AttendanceForPayroll(date, "sh1", "Ca sáng", SHIFT_START, SHIFT_END,
                type, null, null, 0, 0, 0, 0, BigDecimal.ZERO);
    }

    @Test
    void shiftType_paysFullWagePerCompletedShift() {
        ComputedPayslip result = calculator.compute(setting(SalaryType.SHIFT, 200_000),
                List.of(present(MONDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 240, 0, 0),
                        present(MONDAY.plusDays(1), LocalTime.of(8, 0), LocalTime.of(12, 0), 240, 0, 0)),
                Set.of());

        assertThat(result.mainSalary()).isEqualByComparingTo("400000");
        assertThat(result.overtimeSalary()).isEqualByComparingTo("0");
        assertThat(result.shiftCount()).isEqualTo(2);
        assertThat(result.workedMinutes()).isEqualTo(480);
    }

    @Test
    void shiftType_appliesSaturdayPercentUplift() {
        SalarySetting s = setting(SalaryType.SHIFT, 200_000);
        s.setMainAdvancedRates("{\"sat\":{\"amount\":\"150\",\"unit\":\"percent\"},\"sun\":null}");

        ComputedPayslip result = calculator.compute(s,
                List.of(present(SATURDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 240, 0, 0)),
                Set.of());

        assertThat(result.mainSalary()).isEqualByComparingTo("300000");
    }

    @Test
    void shiftType_appliesSaturdayVndAbsoluteRate() {
        SalarySetting s = setting(SalaryType.SHIFT, 200_000);
        s.setMainAdvancedRates("{\"sat\":{\"amount\":\"250000\",\"unit\":\"vnd\"}}");

        ComputedPayslip result = calculator.compute(s,
                List.of(present(SATURDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 240, 0, 0)),
                Set.of());

        assertThat(result.mainSalary()).isEqualByComparingTo("250000");
    }

    @Test
    void shiftType_paysFullWageEvenOnEarlyLeave() {
        ComputedPayslip result = calculator.compute(setting(SalaryType.SHIFT, 200_000),
                List.of(present(MONDAY, LocalTime.of(8, 0), LocalTime.of(10, 0), 120, 0, 30)),
                Set.of());

        // Early leave (30 min beyond grace) is handled manually via violation penalties,
        // not by prorating the shift wage — full wage regardless.
        assertThat(result.mainSalary()).isEqualByComparingTo("200000");
    }

    @Test
    void shiftType_usesOvertimeMinutesAsProvidedByAttendanceModule() {
        SalarySetting s = setting(SalaryType.SHIFT, 200_000);
        s.setOvertimeEnabled(true);
        s.setOvertimeRates("{\"normal\":{\"amount\":\"150\",\"unit\":\"percent\"}}");

        // AT already applied BR-AT-10: 60 OT minutes past the scheduled end; hourly base 200000/4h = 50000
        ComputedPayslip result = calculator.compute(s,
                List.of(present(MONDAY, LocalTime.of(8, 0), LocalTime.of(13, 0), 240, 60, 0)),
                Set.of());

        assertThat(result.otMinutes()).isEqualTo(60);
        assertThat(result.overtimeSalary()).isEqualByComparingTo("75000"); // 50000 × 150%
        assertThat(result.mainSalary()).isEqualByComparingTo("200000");
    }

    @Test
    void shiftType_leaveEarnsNothing() {
        ComputedPayslip result = calculator.compute(setting(SalaryType.SHIFT, 200_000),
                List.of(leave(MONDAY, AttendanceType.LEAVE_UNAPPROVED),
                        leave(MONDAY.plusDays(1), AttendanceType.LEAVE_APPROVED)),
                Set.of());

        assertThat(result.mainSalary()).isEqualByComparingTo("0");
        assertThat(result.shiftCount()).isZero();
    }

    @Test
    void shiftType_classifiesConfiguredDateAsHoliday() {
        SalarySetting s = setting(SalaryType.SHIFT, 200_000);
        s.setMainAdvancedRates("{\"holiday\":{\"amount\":\"200\",\"unit\":\"percent\"}}");

        // MONDAY is an ordinary weekday (would resolve to "normal", 100%) unless it's in the
        // configured holiday set — BR-PAY-04: the holiday calendar wins over the weekday.
        ComputedPayslip result = calculator.compute(s,
                List.of(present(MONDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 240, 0, 0)),
                Set.of(MONDAY));

        assertThat(result.mainSalary()).isEqualByComparingTo("400000");
    }

    @Test
    void hourlyType_paysByWorkedMinutes_noOvertime() {
        SalarySetting s = setting(SalaryType.HOURLY, 30_000);
        s.setOvertimeEnabled(true); // BR-PAY-05: must be ignored for HOURLY
        s.setOvertimeRates("{\"normal\":{\"amount\":\"150\",\"unit\":\"percent\"}}");

        ComputedPayslip result = calculator.compute(s,
                List.of(present(MONDAY, LocalTime.of(8, 0), LocalTime.of(11, 30), 210, 0, 0)),
                Set.of());

        assertThat(result.mainSalary()).isEqualByComparingTo("105000"); // 3.5h × 30000
        assertThat(result.overtimeSalary()).isEqualByComparingTo("0");
    }

    @Test
    void fixedType_ignoresAttendance() {
        ComputedPayslip result = calculator.compute(setting(SalaryType.FIXED, 8_000_000),
                List.of(leave(MONDAY, AttendanceType.LEAVE_UNAPPROVED)),
                Set.of());

        assertThat(result.mainSalary()).isEqualByComparingTo("8000000");
        assertThat(result.overtimeSalary()).isEqualByComparingTo("0");
    }

    @Test
    void noSalarySetting_yieldsZerosWithNullType() {
        ComputedPayslip result = calculator.compute(null,
                List.of(present(MONDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 240, 0, 0)),
                Set.of());

        assertThat(result.salaryType()).isNull();
        assertThat(result.mainSalary()).isEqualByComparingTo("0");
        assertThat(result.snapshotJson()).contains("PRESENT"); // attendance still visible
    }

    @Test
    void malformedRatesJson_fallsBackToBaseWage() {
        SalarySetting s = setting(SalaryType.SHIFT, 200_000);
        s.setMainAdvancedRates("{not valid json");

        ComputedPayslip result = calculator.compute(s,
                List.of(present(SATURDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 240, 0, 0)),
                Set.of());

        assertThat(result.mainSalary()).isEqualByComparingTo("200000");
    }
}
