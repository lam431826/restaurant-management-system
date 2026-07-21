package com.rms.restaurant.module.cashbook.model;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.common.utils.enums.CashbookSourceType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A phiếu thu/chi. {@code partnerId} is a soft reference to employees(id) — never hard-FK'd,
 * same reasoning as {@code Payslip} snapshotting employee fields — since CUSTOMER/OTHER
 * vouchers never populate it and an employee may later be removed. No hard delete: vouchers
 * are voided (BR-style status flag), matching the rest of this codebase's convention.
 */
@Entity
@Table(name = "cashbook_vouchers")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashbookVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashFlowType type;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "category_id", nullable = false, length = 36)
    private String categoryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashFlowMethod method;

    @Enumerated(EnumType.STRING)
    @Column(name = "partner_group", nullable = false, length = 20)
    private CashbookPartnerGroup partnerGroup;

    @Column(name = "partner_id", length = 36)
    private String partnerId;

    @Column(name = "partner_name", nullable = false, length = 200)
    private String partnerName;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;

    @Column(length = 500)
    private String note;

    @Column(name = "accounting_to_income", nullable = false)
    private boolean accountingToIncome;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private CashbookSourceType sourceType;

    @Column(name = "source_reference_id", length = 36)
    private String sourceReferenceId;

    @Column(name = "created_by", length = 150)
    private String createdBy;

    @Column(nullable = false)
    private boolean voided;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
