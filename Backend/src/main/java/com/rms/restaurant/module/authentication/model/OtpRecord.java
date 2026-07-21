package com.rms.restaurant.module.authentication.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
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

    // Profile the user submitted at verify/info (first-login flow only) — committed onto
    // User once verify/otp confirms the OTP, so an unverified email is never live on the account.
    @Column(name = "pending_full_name", length = 150)
    private String pendingFullName;

    @Column(name = "pending_email", length = 150)
    private String pendingEmail;

    @Column(name = "pending_phone", length = 20)
    private String pendingPhone;

    // Full employee-profile fields collected alongside name/email/phone at verify/info —
    // committed onto a linked Employee row (via EmployeeService.saveMyProfile) once verify/otp
    // confirms the OTP. See EmployeeServiceImpl for the target field shapes.
    @Column(name = "pending_start_date")
    private LocalDate pendingStartDate;

    @Column(name = "pending_note", length = 1000)
    private String pendingNote;

    @Column(name = "pending_id_number", length = 30)
    private String pendingIdNumber;

    @Column(name = "pending_birthday")
    private LocalDate pendingBirthday;

    @Column(name = "pending_gender", length = 10)
    private String pendingGender;

    @Column(name = "pending_address", length = 300)
    private String pendingAddress;
}
