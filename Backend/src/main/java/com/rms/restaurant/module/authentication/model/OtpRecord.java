package com.rms.restaurant.module.authentication.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "otp_records")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OtpRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String otpCode;

    @Column(name = "verify_token", nullable = false, unique = true, length = 200)
    private String verifyToken;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    // How many times POST /verify/info has regenerated an OTP for this record — shares
    // resendOtp()'s MAX_RESEND_RECORDS cap so verify/info can't be used to bypass it (BE-AUTH-03).
    @Builder.Default
    @Column(name = "info_request_count", nullable = false)
    private int infoRequestCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private boolean used = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
