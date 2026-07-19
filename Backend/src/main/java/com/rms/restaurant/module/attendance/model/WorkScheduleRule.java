package com.rms.restaurant.module.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Weekly repeat rule (SRS_AT UC-AT-02). endDate == null means endless: occurrences are
 * materialized into work_schedules over a rolling 93-day window and extended nightly
 * (BR-AT-04); generatedUntil is the materialization high-water mark.
 * workOnHolidays is stored per SRS but inert — no holiday calendar exists yet.
 */
@Entity
@Table(name = "work_schedule_rules")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkScheduleRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "employee_id", nullable = false, length = 36)
    private String employeeId;

    @Column(name = "shift_id", nullable = false, length = 36)
    private String shiftId;

    /** CSV of ISO weekdays, e.g. "1,3,5" (1=Mon .. 7=Sun). */
    @Column(name = "days_of_week", nullable = false, length = 20)
    private String daysOfWeek;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "work_on_holidays", nullable = false)
    private boolean workOnHolidays = false;

    @Column(name = "generated_until", nullable = false)
    private LocalDate generatedUntil;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
