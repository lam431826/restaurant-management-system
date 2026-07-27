package com.rms.restaurant.module.reporting.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Reports configuration singleton (Thiết lập báo cáo) — exactly one row, seeded by V59
 * with FIXED_ID.
 */
@Entity
@Table(name = "report_settings")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReportSetting {

    public static final String FIXED_ID = "d0000000-0000-0000-0000-000000000001";

    @Id
    private String id;

    @Builder.Default
    @Column(name = "custom_revenue_window_enabled", nullable = false)
    private boolean customRevenueWindowEnabled = true;

    @Builder.Default
    @Column(name = "revenue_cutoff_time", nullable = false)
    private LocalTime revenueCutoffTime = LocalTime.MIDNIGHT;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
