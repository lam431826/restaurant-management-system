package com.rms.restaurant.module.cashbook.model;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** One manager-editable opening balance row per fund (CASH/BANK/EWALLET), replacing the
 * FE's previous hardcoded OPENING_BALANCE constant. */
@Entity
@Table(name = "cashbook_opening_balances")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashbookOpeningBalance {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CashFlowMethod method;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;

    @Column(name = "updated_by", length = 150)
    private String updatedBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
