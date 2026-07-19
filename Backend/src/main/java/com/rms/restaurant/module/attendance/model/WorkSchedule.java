package com.rms.restaurant.module.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One materialized Employee x Shift x Date occurrence (SRS_AT UC-AT-02).
 * ruleId == null means a one-off schedule. substituteEmployeeId covers this
 * occurrence when the scheduled employee is on leave (BR-AT-07).
 */
@Entity
@Table(name = "work_schedules", uniqueConstraints =
        @UniqueConstraint(name = "uq_work_schedules_emp_shift_date",
                columnNames = {"employee_id", "shift_id", "work_date"}))
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "employee_id", nullable = false, length = 36)
    private String employeeId;

    @Column(name = "shift_id", nullable = false, length = 36)
    private String shiftId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "rule_id", length = 36)
    private String ruleId;

    @Column(name = "substitute_employee_id", length = 36)
    private String substituteEmployeeId;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
