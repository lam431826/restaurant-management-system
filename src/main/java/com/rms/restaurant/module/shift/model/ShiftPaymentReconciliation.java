package com.rms.restaurant.module.shift.model;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "shift_payment_reconciliations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftPaymentReconciliation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "shift_id", nullable = false)
    private String shiftId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Column(name = "expected_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal expectedAmount;

    @Column(name = "actual_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal actualAmount;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal variance;
}
