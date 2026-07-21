package com.rms.restaurant.module.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Payroll configuration singleton — exactly one row, seeded by V48 with FIXED_ID.
 * Persistence only: autoCreateEnabled/autoUpdateEnabled/personalIncomeTaxEnabled are
 * stored config flags with no scheduler or tax calculation consuming them yet.
 */
@Entity
@Table(name = "payroll_settings")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayrollSetting {

    public static final String FIXED_ID = "c0000000-0000-0000-0000-000000000001";

    @Id
    private String id;

    @Builder.Default
    @Column(name = "payroll_cutoff_day", nullable = false)
    private int payrollCutoffDay = 1;

    @Builder.Default
    @Column(name = "auto_create_enabled", nullable = false)
    private boolean autoCreateEnabled = true;

    @Builder.Default
    @Column(name = "auto_update_enabled", nullable = false)
    private boolean autoUpdateEnabled = true;

    @Builder.Default
    @Column(name = "personal_income_tax_enabled", nullable = false)
    private boolean personalIncomeTaxEnabled = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
