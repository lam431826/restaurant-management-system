package com.rms.restaurant.module.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One violation entry on an attendance record (SRS_AT UC-AT-06). Penalty for the entry
 * = count x appliedPenalty; appliedPenalty is a snapshot of (or an override of) the
 * type's unit amount, so later type edits never change history (BR-AT-12).
 */
@Entity
@Table(name = "violations")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Violation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "attendance_record_id", nullable = false, length = 36)
    private String attendanceRecordId;

    @Column(name = "violation_type_id", nullable = false, length = 36)
    private String violationTypeId;

    @Builder.Default
    @Column(nullable = false)
    private int count = 1;

    @Column(name = "applied_penalty", nullable = false, precision = 12, scale = 0)
    private BigDecimal appliedPenalty;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
