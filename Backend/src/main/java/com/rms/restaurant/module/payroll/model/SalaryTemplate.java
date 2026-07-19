package com.rms.restaurant.module.payroll.model;

import com.rms.restaurant.common.utils.enums.SalaryType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BR-PAY-01: a named, reusable main/overtime rate config that can be applied to many
 * employees' SalarySetting. Applying is copy-on-apply from the frontend — editing or
 * deleting a template never retroactively affects employees who already applied it.
 */
@Entity
@Table(name = "salary_templates")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SalaryTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "main_salary_type", nullable = false, length = 20)
    private SalaryType mainSalaryType;

    @Builder.Default
    @Column(name = "main_base_wage", nullable = false, precision = 12, scale = 0)
    private BigDecimal mainBaseWage = BigDecimal.ZERO;

    @Column(name = "main_advanced_rates", columnDefinition = "NVARCHAR(MAX)")
    private String mainAdvancedRates;

    @Builder.Default
    @Column(name = "overtime_enabled", nullable = false)
    private boolean overtimeEnabled = false;

    @Column(name = "overtime_rates", columnDefinition = "NVARCHAR(MAX)")
    private String overtimeRates;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
