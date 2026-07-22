package com.rms.restaurant.module.payment.model;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 20, updatable = false)
    private String code;

    @Column(name = "order_id", nullable = false)
    private String orderId;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 0)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", precision = 12, scale = 0)
    private BigDecimal discountAmount;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal totalAmount;

    @Column(name = "promotion_id")
    private String promotionId;

    @Column(name = "is_paid", nullable = false)
    private boolean paid;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InvoiceStatus status = InvoiceStatus.ACTIVE;

    @Column(name = "merged_into_invoice_id", length = 36)
    private String mergedIntoInvoiceId;

    @Column(name = "split_from_invoice_id", length = 36)
    private String splitFromInvoiceId;

    @Column(name = "created_by", length = 150)
    private String createdBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Invoice(
            String id,
            String orderId,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            String promotionId,
            boolean paid,
            LocalDateTime createdAt
    ) {
        this.id = id;
        this.orderId = orderId;
        this.subtotal = subtotal;
        this.discountAmount = discountAmount;
        this.totalAmount = totalAmount;
        this.promotionId = promotionId;
        this.paid = paid;
        this.status = InvoiceStatus.ACTIVE;
        this.createdAt = createdAt;
    }
}
