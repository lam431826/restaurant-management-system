package com.rms.restaurant.module.payment.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_webhook_logs")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentWebhookLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "raw_payload", columnDefinition = "NVARCHAR(MAX)", nullable = false)
    private String rawPayload;

    @Column(nullable = false, length = 20)
    private String status;

    @CreatedDate
    @Column(name = "received_at", updatable = false)
    private LocalDateTime receivedAt;
}
