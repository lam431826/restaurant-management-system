package com.rms.restaurant.module.payroll.model;

import com.rms.restaurant.common.utils.enums.PayrollScope;
import com.rms.restaurant.common.utils.enums.PayrollSheetStatus;
import com.rms.restaurant.common.utils.enums.PayrollTerm;
import com.rms.restaurant.common.utils.enums.SalaryPaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * UC-PAY-03..07. Money totals (total/paid/remaining) are derived from payslips at read
 * time — only the payment status is denormalized here for list filtering (BR-PAY-06).
 */
@Entity
@Table(name = "payroll_sheets")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayrollSheet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "pay_term", nullable = false, length = 20)
    private PayrollTerm payTerm;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayrollScope scope;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private PayrollSheetStatus status = PayrollSheetStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "payment_status", nullable = false, length = 20)
    private SalaryPaymentStatus paymentStatus = SalaryPaymentStatus.UNPAID;

    @Column(length = 1000)
    private String note;

    @Column(name = "created_by", length = 150)
    private String createdBy;

    @Column(name = "finalized_by", length = 150)
    private String finalizedBy;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "data_refreshed_at")
    private LocalDateTime dataRefreshedAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
