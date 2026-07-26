package com.rms.restaurant.module.attendance.model;

import com.rms.restaurant.common.utils.enums.ManualTimeMode;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Attendance configuration singleton (SRS_AT UC-AT-05) — exactly one row, seeded by V30
 * with FIXED_ID. All durations are minutes. BR-AT-15 (half-day: keep OT, drop late/early)
 * is hardcoded in the calculator, not configurable.
 */
@Entity
@Table(name = "attendance_settings")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceSetting {

    public static final String FIXED_ID = "a0000000-0000-0000-0000-000000000001";

    @Id
    private String id;

    @Builder.Default
    @Column(name = "half_day_enabled", nullable = false)
    private boolean halfDayEnabled = false;

    @Builder.Default
    @Column(name = "half_day_min_minutes", nullable = false)
    private int halfDayMinMinutes = 0;

    @Builder.Default
    @Column(name = "half_day_max_minutes", nullable = false)
    private int halfDayMaxMinutes = 270;

    @Builder.Default
    @Column(name = "late_enabled", nullable = false)
    private boolean lateEnabled = true;

    @Builder.Default
    @Column(name = "late_grace_minutes", nullable = false)
    private int lateGraceMinutes = 0;

    @Builder.Default
    @Column(name = "early_leave_enabled", nullable = false)
    private boolean earlyLeaveEnabled = true;

    @Builder.Default
    @Column(name = "early_leave_grace_minutes", nullable = false)
    private int earlyLeaveGraceMinutes = 0;

    /** When true, SHIFT-type salary automatically deducts wages for late arrival / early leave
     * (SalaryCalculator), rounding UP to the nearest multiple of latePenaltyRoundingMinutes --
     * always at least one block, even on an exact multiple. E.g. rounding=15: 1 actual late
     * minute -> 0.25h deducted; 16 minutes -> 0.5h deducted. */
    @Builder.Default
    @Column(name = "late_penalty_enabled", nullable = false)
    private boolean latePenaltyEnabled = false;

    @Builder.Default
    @Column(name = "late_penalty_rounding_minutes", nullable = false)
    private int latePenaltyRoundingMinutes = 15;

    /** When true, all time outside the shift window (before start or after end) counts as OT,
     * expressed in decimal hours (otMinutes / 60.0) by SalaryCalculator -- no minimum threshold. */
    @Builder.Default
    @Column(name = "overtime_enabled", nullable = false)
    private boolean overtimeEnabled = true;

    /** OT pay rounds actual otMinutes DOWN to the nearest multiple of this before converting
     * to decimal hours (SalaryCalculator). E.g. 15: 29 actual min -> 15min -> 0.25h paid; 30
     * actual min -> 30min -> 0.5h paid. 1 = no rounding (every minute pays proportionally). */
    @Builder.Default
    @Column(name = "ot_rounding_minutes", nullable = false)
    private int otRoundingMinutes = 1;

    @Builder.Default
    @Column(name = "merged_shift_enabled", nullable = false)
    private boolean mergedShiftEnabled = false;

    @Builder.Default
    @Column(name = "merged_shift_max_count", nullable = false)
    private int mergedShiftMaxCount = 2;

    @Builder.Default
    @Column(name = "merged_shift_max_break_minutes", nullable = false)
    private int mergedShiftMaxBreakMinutes = 60;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "manual_default_time_mode", nullable = false, length = 20)
    private ManualTimeMode manualDefaultTimeMode = ManualTimeMode.SHIFT_TIME;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
