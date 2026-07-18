package com.rms.restaurant.module.attendance.model;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Shift template (SRS_AT UC-AT-01). endTime <= startTime means an overnight shift ending
 * the next day. The check-in window (BR-AT-14) only decides which shift a punch belongs
 * to — it is independent of the late/early grace thresholds in AttendanceSetting.
 */
@Entity
@Table(name = "work_shifts")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkShift {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "check_in_window_start")
    private LocalTime checkInWindowStart;

    @Column(name = "check_in_window_end")
    private LocalTime checkInWindowEnd;

    @Column(name = "apply_scope", length = 255)
    private String applyScope;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private WorkShiftStatus status = WorkShiftStatus.ACTIVE;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
