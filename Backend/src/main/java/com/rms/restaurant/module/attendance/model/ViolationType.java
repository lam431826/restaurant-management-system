package com.rms.restaurant.module.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Violation category with its default penalty amount (SRS_AT UC-AT-06).
 * Soft-deleted once referenced by violations so historical records stay valid;
 * recorded violations snapshot appliedPenalty anyway.
 */
@Entity
@Table(name = "violation_types")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ViolationType {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Builder.Default
    @Column(name = "penalty_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal penaltyAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private boolean deleted = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
