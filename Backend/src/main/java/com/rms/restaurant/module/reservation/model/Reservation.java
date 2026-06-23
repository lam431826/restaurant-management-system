package com.rms.restaurant.module.reservation.model;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "table_id")
    private String tableId;

    @Column(name = "guest_name", nullable = false, length = 150)
    private String guestName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "party_size", nullable = false)
    private int partySize;

    @Column(nullable = false)
    private LocalDateTime datetime;

    @Column(length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status;

    @Column(name = "guest_email", length = 150)
    private String guestEmail;

    @Builder.Default
    @Column(name = "reminder_sent")
    private boolean reminderSent = false;

    @Column(name = "created_by")
    private String createdBy;

    // ── Cancel OTP (luồng huỷ đặt bàn online 2-bước) ─────────────────────────
    @Column(name = "cancel_token", length = 64)
    private String cancelToken;

    @Column(name = "cancel_otp", length = 6)
    private String cancelOtp;

    @Column(name = "cancel_otp_expires")
    private LocalDateTime cancelOtpExpires;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
