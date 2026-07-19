package com.rms.restaurant.module.attendance.service;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Pure attendance math over one scheduled shift (BR-AT-08/09/10/11/15). No repository
 * access — unit-testable without Spring, mirroring the payroll SalaryCalculator.
 *
 * BR-AT-14: the shift's check-in window (which shift a punch belongs to) is deliberately
 * NOT an input here; it is resolved in the service layer. This calculator only compares
 * actual times against the scheduled shift window plus the configured grace/minimum
 * thresholds, which are independent parameters.
 *
 * Overnight shifts: shiftEnd <= shiftStart means the shift ends the next day; the
 * scheduled window is normalized to [workDate+start, workDate+1+end).
 */
@Component
public class AttendanceCalculator {

    private static final BigDecimal HALF = new BigDecimal("0.50");
    private static final BigDecimal FULL = new BigDecimal("1.00");

    public record CalcInput(LocalDate workDate, LocalTime shiftStart, LocalTime shiftEnd,
                            LocalDateTime actualIn, LocalDateTime actualOut,
                            AttendanceSetting settings) {}

    public record CalcResult(int workedMinutes, int lateMinutes, int earlyLeaveMinutes,
                             int otMinutes, BigDecimal workCredit, boolean halfDay) {}

    /** One scheduled shift participating in a merged punch (BR-AT-11). */
    public record MergedShiftInput(String scheduleId, LocalDate workDate,
                                   LocalTime shiftStart, LocalTime shiftEnd) {}

    /** Resolved in/out for one shift of a merged punch; middle shifts are autoFilled. */
    public record MergedSlot(String scheduleId, LocalDateTime in, LocalDateTime out, boolean autoFilled) {}

    public CalcResult compute(CalcInput in) {
        AttendanceSetting s = in.settings();
        if (in.actualIn() == null || in.actualOut() == null) {
            return new CalcResult(0, 0, 0, 0, BigDecimal.ZERO, false);
        }
        LocalDateTime scheduledStart = in.workDate().atTime(in.shiftStart());
        LocalDateTime scheduledEnd = scheduledEnd(in.workDate(), in.shiftStart(), in.shiftEnd());

        int worked = (int) Math.max(0, Duration.between(in.actualIn(), in.actualOut()).toMinutes());

        boolean halfDay = s.isHalfDayEnabled()
                && worked >= s.getHalfDayMinMinutes() && worked < s.getHalfDayMaxMinutes();
        BigDecimal credit = halfDay ? HALF : proportionalCredit(worked, s.getStandardWorkdayMinutes());

        // BR-AT-15: on a half-day, OT still counts but late/early do not.
        int late = halfDay ? 0 : beyondGrace(minutesAfter(scheduledStart, in.actualIn()),
                s.isLateEnabled(), s.getLateGraceMinutes());
        int early = halfDay ? 0 : beyondGrace(minutesAfter(in.actualOut(), scheduledEnd),
                s.isEarlyLeaveEnabled(), s.getEarlyLeaveGraceMinutes());

        int otBefore = beyondMinimum(minutesAfter(in.actualIn(), scheduledStart),
                s.isOtBeforeEnabled(), s.getOtBeforeMinMinutes());
        int otAfter = beyondMinimum(minutesAfter(scheduledEnd, in.actualOut()),
                s.isOtAfterEnabled(), s.getOtAfterMinMinutes());

        return new CalcResult(worked, late, early, otBefore + otAfter, credit, halfDay);
    }

    /**
     * BR-AT-11: one Vào–Ra punch spanning consecutive shifts of the same employee/day.
     * Rejects when the shift count exceeds the configured maximum or any gap between two
     * consecutive shifts exceeds the maximum break; otherwise resolves per-shift in/out
     * pairs (middle shifts fully auto-filled) for the caller to run through compute().
     */
    public List<MergedSlot> splitMergedPunch(List<MergedShiftInput> shifts,
                                             LocalDateTime firstIn, LocalDateTime lastOut,
                                             AttendanceSetting settings) {
        if (shifts.size() > settings.getMergedShiftMaxCount()) {
            throw new ApplicationException(ApplicationError.AT_MERGE_LIMIT_EXCEEDED);
        }
        List<MergedShiftInput> ordered = shifts.stream()
                .sorted(Comparator.comparing(sh -> sh.workDate().atTime(sh.shiftStart())))
                .toList();
        for (int i = 1; i < ordered.size(); i++) {
            LocalDateTime prevEnd = scheduledEnd(ordered.get(i - 1).workDate(),
                    ordered.get(i - 1).shiftStart(), ordered.get(i - 1).shiftEnd());
            LocalDateTime nextStart = ordered.get(i).workDate().atTime(ordered.get(i).shiftStart());
            long gap = Duration.between(prevEnd, nextStart).toMinutes();
            if (gap > settings.getMergedShiftMaxBreakMinutes()) {
                throw new ApplicationException(ApplicationError.AT_MERGE_LIMIT_EXCEEDED);
            }
        }
        List<MergedSlot> slots = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) {
            MergedShiftInput sh = ordered.get(i);
            boolean first = i == 0;
            boolean last = i == ordered.size() - 1;
            LocalDateTime in = first ? firstIn : sh.workDate().atTime(sh.shiftStart());
            LocalDateTime out = last ? lastOut : scheduledEnd(sh.workDate(), sh.shiftStart(), sh.shiftEnd());
            slots.add(new MergedSlot(sh.scheduleId(), in, out, !first && !last));
        }
        return slots;
    }

    private LocalDateTime scheduledEnd(LocalDate workDate, LocalTime start, LocalTime end) {
        return end.isAfter(start) ? workDate.atTime(end) : workDate.plusDays(1).atTime(end);
    }

    /** Whole minutes by which `later` falls after `base`, floored at 0. */
    private int minutesAfter(LocalDateTime base, LocalDateTime later) {
        return (int) Math.max(0, Duration.between(base, later).toMinutes());
    }

    /** BR-AT-09: only the minutes beyond the grace count; within grace = no penalty. */
    private int beyondGrace(int raw, boolean enabled, int graceMinutes) {
        if (!enabled || raw <= graceMinutes) return 0;
        return raw - graceMinutes;
    }

    /** BR-AT-10: the whole interval counts once it exceeds the minimum; below it, nothing. */
    private int beyondMinimum(int raw, boolean enabled, int minimumMinutes) {
        if (!enabled || raw <= minimumMinutes) return 0;
        return raw;
    }

    /** BR-AT-08: credit = worked / standard workday, capped at 1.00 công. */
    private BigDecimal proportionalCredit(int workedMinutes, int standardMinutes) {
        if (standardMinutes <= 0 || workedMinutes <= 0) return BigDecimal.ZERO;
        BigDecimal ratio = BigDecimal.valueOf(workedMinutes)
                .divide(BigDecimal.valueOf(standardMinutes), 2, RoundingMode.HALF_UP);
        return ratio.min(FULL);
    }
}
