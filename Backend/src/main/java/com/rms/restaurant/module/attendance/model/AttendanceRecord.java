package com.rms.restaurant.module.attendance.model;

import com.rms.restaurant.common.utils.enums.AttendanceType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Actual attendance for one schedule occurrence (SRS_AT UC-AT-03/04), 0..1 per schedule.
 * Derived metrics (late/early/OT beyond thresholds, work credit) are persisted at marking
 * time: settings changes apply to future computations only (UC-AT-05 step 6), so history
 * is never retro-recomputed. Leave types carry zero metrics.
 */
@Entity
@Table(name = "attendance_records")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "schedule_id", nullable = false, unique = true, length = 36)
    private String scheduleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceType type;

    @Column(name = "actual_check_in")
    private LocalDateTime actualCheckIn;

    @Column(name = "actual_check_out")
    private LocalDateTime actualCheckOut;

    @Builder.Default
    @Column(name = "worked_minutes", nullable = false)
    private int workedMinutes = 0;

    @Builder.Default
    @Column(name = "late_minutes", nullable = false)
    private int lateMinutes = 0;

    @Builder.Default
    @Column(name = "early_leave_minutes", nullable = false)
    private int earlyLeaveMinutes = 0;

    @Builder.Default
    @Column(name = "ot_minutes", nullable = false)
    private int otMinutes = 0;

    @Builder.Default
    @Column(name = "work_credit", nullable = false, precision = 4, scale = 2)
    private BigDecimal workCredit = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "auto_filled", nullable = false)
    private boolean autoFilled = false;

    @Column(length = 500)
    private String note;

    @Column(name = "created_by", length = 150)
    private String createdBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
