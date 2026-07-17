package com.rms.restaurant.module.employee.model;

import com.rms.restaurant.common.utils.enums.SalaryType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * UC-EMP-07 / BR-SAL-01: declares the 2 salary components (main + overtime) for one employee.
 * The detailed computation model is owned by SRS_PAY (not yet written) — the rate breakdowns
 * are stored as raw JSON here rather than fully normalized, per the SRS's own §9 gap #4.
 */
@Entity
@Table(name = "salary_settings")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SalarySetting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "employee_id", nullable = false, unique = true, length = 36)
    private String employeeId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "main_salary_type", nullable = false, length = 20)
    private SalaryType mainSalaryType = SalaryType.SHIFT;

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

    @Column(name = "salary_template", length = 100)
    private String salaryTemplate;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
