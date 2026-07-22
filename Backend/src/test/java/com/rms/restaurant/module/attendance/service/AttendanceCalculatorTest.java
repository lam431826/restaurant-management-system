package com.rms.restaurant.module.attendance.service;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.CalcInput;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.CalcResult;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.MergedShiftInput;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.MergedSlot;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pure unit tests for BR-AT-08/09/10/11/15 — no Spring context, mirroring SalaryCalculatorTest.
 * Base fixture: 08:00–16:00 shift on 2026-07-15, standard workday 480m, all thresholds 0.
 */
class AttendanceCalculatorTest {

    private final AttendanceCalculator calculator = new AttendanceCalculator();

    private static final LocalDate DAY = LocalDate.of(2026, 7, 15);
    private static final LocalTime START = LocalTime.of(8, 0);
    private static final LocalTime END = LocalTime.of(16, 0);

    private AttendanceSetting.AttendanceSettingBuilder settings() {
        return AttendanceSetting.builder()
                .halfDayEnabled(false)
                .lateEnabled(true).lateGraceMinutes(0)
                .earlyLeaveEnabled(true).earlyLeaveGraceMinutes(0)
                .otBeforeEnabled(true).otBeforeMinMinutes(0)
                .otAfterEnabled(true).otAfterMinMinutes(0)
                .mergedShiftEnabled(true).mergedShiftMaxCount(2).mergedShiftMaxBreakMinutes(60);
    }

    private CalcResult compute(LocalDateTime in, LocalDateTime out, AttendanceSetting s) {
        return calculator.compute(new CalcInput(DAY, START, END, in, out, s));
    }

    private LocalDateTime at(int hour, int minute) {
        return DAY.atTime(hour, minute);
    }

    // ---- BR-AT-09: late / early leave grace ----

    @Test
    void lateWithinGraceIsNotCounted() {
        AttendanceSetting s = settings().lateGraceMinutes(15).build();
        CalcResult r = compute(at(8, 15), at(16, 0), s);
        assertThat(r.lateMinutes()).isZero();
    }

    @Test
    void lateBeyondGraceCountsOnlyTheExcess() {
        AttendanceSetting s = settings().lateGraceMinutes(15).build();
        CalcResult r = compute(at(8, 16), at(16, 0), s);
        assertThat(r.lateMinutes()).isEqualTo(1);
    }

    @Test
    void earlyLeaveBeyondGraceCountsOnlyTheExcess() {
        AttendanceSetting s = settings().earlyLeaveGraceMinutes(10).build();
        CalcResult r = compute(at(8, 0), at(15, 30), s);
        assertThat(r.earlyLeaveMinutes()).isEqualTo(20);
    }

    @Test
    void lateDisabledYieldsZeroEvenWhenVeryLate() {
        AttendanceSetting s = settings().lateEnabled(false).build();
        CalcResult r = compute(at(10, 0), at(16, 0), s);
        assertThat(r.lateMinutes()).isZero();
    }

    // ---- BR-AT-10: overtime minimum ----

    @Test
    void otAtMinimumIsIgnored() {
        AttendanceSetting s = settings().otAfterMinMinutes(30).build();
        CalcResult r = compute(at(8, 0), at(16, 30), s);
        assertThat(r.otMinutes()).isZero();
    }

    @Test
    void otBeyondMinimumCountsTheWholeInterval() {
        AttendanceSetting s = settings().otAfterMinMinutes(30).build();
        CalcResult r = compute(at(8, 0), at(16, 31), s);
        assertThat(r.otMinutes()).isEqualTo(31);
    }

    @Test
    void otBeforeAndAfterAreSummed() {
        AttendanceSetting s = settings().otBeforeMinMinutes(15).otAfterMinMinutes(15).build();
        CalcResult r = compute(at(7, 30), at(17, 0), s);
        assertThat(r.otMinutes()).isEqualTo(30 + 60);
    }

    @Test
    void otBeforeDisabledIgnoresEarlyArrival() {
        AttendanceSetting s = settings().otBeforeEnabled(false).build();
        CalcResult r = compute(at(7, 0), at(16, 0), s);
        assertThat(r.otMinutes()).isZero();
    }

    // ---- BR-AT-08: work credit ----

    @Test
    void fullDayEarnsOneCredit() {
        CalcResult r = compute(at(8, 0), at(16, 0), settings().build());
        assertThat(r.workedMinutes()).isEqualTo(480);
        assertThat(r.workCredit()).isEqualByComparingTo("1.00");
    }

    @Test
    void creditIsProportionalAndCappedAtOne() {
        CalcResult r = compute(at(8, 0), at(12, 0), settings().build());
        assertThat(r.workCredit()).isEqualByComparingTo("0.50");

        CalcResult overworked = compute(at(7, 0), at(18, 0), settings().build());
        assertThat(overworked.workCredit()).isEqualByComparingTo("1.00");
    }

    @Test
    void halfDayRangeEarnsHalfCredit() {
        AttendanceSetting s = settings().halfDayEnabled(true)
                .halfDayMinMinutes(60).halfDayMaxMinutes(270).build();
        CalcResult r = compute(at(8, 0), at(12, 0), s); // 240m in [60, 270)
        assertThat(r.halfDay()).isTrue();
        assertThat(r.workCredit()).isEqualByComparingTo("0.50");
    }

    @Test
    void workedBelowHalfDayMinFallsBackToProportional() {
        AttendanceSetting s = settings().halfDayEnabled(true)
                .halfDayMinMinutes(120).halfDayMaxMinutes(270).build();
        CalcResult r = compute(at(8, 0), at(9, 0), s); // 60m < min
        assertThat(r.halfDay()).isFalse();
        assertThat(r.workCredit()).isEqualByComparingTo("0.13"); // 60/480 rounded
    }

    // ---- BR-AT-15: half-day keeps OT, drops late/early ----

    @Test
    void halfDayKeepsOvertimeButDropsLateAndEarly() {
        AttendanceSetting s = settings().halfDayEnabled(true)
                .halfDayMinMinutes(60).halfDayMaxMinutes(270)
                .otBeforeMinMinutes(15).build();
        // Arrives 1h early (OT before), leaves 12:00 => worked 05:00→12:00... use late arrival:
        // in 09:00 (late 60), out 12:30 (early 210), worked 210m => half-day window
        CalcResult late = compute(at(9, 0), at(12, 30), s);
        assertThat(late.halfDay()).isTrue();
        assertThat(late.lateMinutes()).isZero();
        assertThat(late.earlyLeaveMinutes()).isZero();
        assertThat(late.workCredit()).isEqualByComparingTo("0.50");

        // in 07:00 (OT before 60 > 15), out 10:30 => worked 210m half-day, OT preserved
        CalcResult ot = compute(at(7, 0), at(10, 30), s);
        assertThat(ot.halfDay()).isTrue();
        assertThat(ot.otMinutes()).isEqualTo(60);
        assertThat(ot.earlyLeaveMinutes()).isZero();
    }

    // ---- Overnight shift ----

    @Test
    void overnightShiftComputesAcrossMidnight() {
        LocalTime nightStart = LocalTime.of(21, 0);
        LocalTime nightEnd = LocalTime.of(1, 0);
        AttendanceSetting s = settings().build();
        CalcResult r = calculator.compute(new CalcInput(DAY, nightStart, nightEnd,
                DAY.atTime(21, 30), DAY.plusDays(1).atTime(1, 30), s));
        assertThat(r.workedMinutes()).isEqualTo(240);
        assertThat(r.lateMinutes()).isEqualTo(30);
        assertThat(r.otMinutes()).isEqualTo(30);
        assertThat(r.earlyLeaveMinutes()).isZero();
    }

    // ---- Missing punches ----

    @Test
    void missingCheckOutYieldsAllZeroMetrics() {
        CalcResult r = compute(at(8, 0), null, settings().build());
        assertThat(r).isEqualTo(new CalcResult(0, 0, 0, 0, java.math.BigDecimal.ZERO, false));
    }

    // ---- BR-AT-11: merged consecutive shifts ----

    private MergedShiftInput shift(String id, int startHour, int endHour) {
        return new MergedShiftInput(id, DAY, LocalTime.of(startHour, 0), LocalTime.of(endHour, 0));
    }

    @Test
    void mergedPunchSplitsFirstAndLastShift() {
        List<MergedSlot> slots = calculator.splitMergedPunch(
                List.of(shift("s1", 8, 12), shift("s2", 12, 16)),
                at(8, 5), at(16, 10), settings().build());
        assertThat(slots).hasSize(2);
        assertThat(slots.get(0).in()).isEqualTo(at(8, 5));
        assertThat(slots.get(0).out()).isEqualTo(at(12, 0));
        assertThat(slots.get(0).autoFilled()).isFalse();
        assertThat(slots.get(1).in()).isEqualTo(at(12, 0));
        assertThat(slots.get(1).out()).isEqualTo(at(16, 10));
        assertThat(slots.get(1).autoFilled()).isFalse();
    }

    @Test
    void mergedPunchAutoFillsMiddleShift() {
        AttendanceSetting s = settings().mergedShiftMaxCount(3).build();
        List<MergedSlot> slots = calculator.splitMergedPunch(
                List.of(shift("s1", 8, 11), shift("s2", 11, 14), shift("s3", 14, 17)),
                at(8, 0), at(17, 0), s);
        assertThat(slots).hasSize(3);
        assertThat(slots.get(1).autoFilled()).isTrue();
        assertThat(slots.get(1).in()).isEqualTo(at(11, 0));
        assertThat(slots.get(1).out()).isEqualTo(at(14, 0));
    }

    @Test
    void mergedPunchGapAtMaxBreakIsAllowed() {
        AttendanceSetting s = settings().mergedShiftMaxBreakMinutes(60).build();
        List<MergedSlot> slots = calculator.splitMergedPunch(
                List.of(shift("s1", 8, 12), shift("s2", 13, 17)),
                at(8, 0), at(17, 0), s);
        assertThat(slots).hasSize(2);
    }

    @Test
    void mergedPunchGapBeyondMaxBreakIsRejected() {
        AttendanceSetting s = settings().mergedShiftMaxBreakMinutes(59).build();
        assertThatThrownBy(() -> calculator.splitMergedPunch(
                List.of(shift("s1", 8, 12), shift("s2", 13, 17)),
                at(8, 0), at(17, 0), s))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_MERGE_LIMIT_EXCEEDED);
    }

    @Test
    void mergedPunchCountBeyondMaxIsRejected() {
        AttendanceSetting s = settings().mergedShiftMaxCount(2).build();
        assertThatThrownBy(() -> calculator.splitMergedPunch(
                List.of(shift("s1", 8, 11), shift("s2", 11, 14), shift("s3", 14, 17)),
                at(8, 0), at(17, 0), s))
                .isInstanceOf(ApplicationException.class);
    }
}
