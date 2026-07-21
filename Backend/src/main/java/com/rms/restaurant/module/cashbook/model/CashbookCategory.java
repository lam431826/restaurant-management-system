package com.rms.restaurant.module.cashbook.model;

import com.rms.restaurant.common.utils.enums.CashFlowType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * A "loại thu/chi" (receipt/payment category). {@code code} is set only on the handful of
 * system-reserved categories (e.g. SALARY_PAYMENT, SALES_RECEIPT) that {@code createSystemVoucher}
 * integration hooks look up by; manager-created categories leave it null.
 */
@Entity
@Table(name = "cashbook_categories")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashbookCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Uniqueness enforced by a filtered index (uq_cashbook_categories_code, V42) rather than
    // a plain column constraint, since SQL Server allows only one NULL per UNIQUE column.
    @Column(length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashFlowType type;

    @Column(length = 500)
    private String description;

    @Column(name = "accounting_to_income", nullable = false)
    private boolean accountingToIncome;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
