package com.rms.restaurant.module.payment.model;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "invoice_id", nullable = false)
    private String invoiceId;

    // BR-CS-08: the cash shift this payment is attributed to, and the cashier who
    // processed it (kept even after a floating shift is merged — BR-CS-19).
    @Column(name = "shift_id")
    private String shiftId;

    @Column(name = "cashier_id")
    private String cashierId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod method;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;

    @Column(name = "gateway_ref", length = 200)
    private String gatewayRef;

    @Column(length = 20)
    private String status;

    // CASH only: what the customer handed over and the change given back.
    @Column(name = "received_amount", precision = 12, scale = 0)
    private BigDecimal receivedAmount;

    @Column(name = "change_amount", precision = 12, scale = 0)
    private BigDecimal changeAmount;

    // QR only: when the simulated external payment window expires (informational).
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // When the payment actually reached PAID (immediate for CASH, on simulated
    // gateway confirmation for QR) — distinct from createdAt for QR, where the
    // PENDING row is created before the payment is settled.
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
