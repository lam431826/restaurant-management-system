package com.rms.restaurant.module.authentication.service.impl;

import com.rms.restaurant.common.security.JwtService;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ForbiddenException;
import com.rms.restaurant.common.utils.exception.RateLimitException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.exception.UnauthorizedException;
import com.rms.restaurant.common.utils.mail.GmailService;
import com.rms.restaurant.module.authentication.dto.*;
import com.rms.restaurant.module.authentication.model.OtpRecord;
import com.rms.restaurant.module.authentication.model.RefreshToken;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.OtpRecordRepository;
import com.rms.restaurant.module.authentication.repository.RefreshTokenRepository;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.authentication.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_RESEND_RECORDS = 4; // 1 initial + 3 resends
    private static final int OTP_TTL_MINUTES = 5;
    private static final int VERIFY_TOKEN_TTL_MINUTES = 30;
    private static final int RESEND_WINDOW_MINUTES = 10;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpRecordRepository otpRecordRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final GmailService gmailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.jwt.access-token-expiration}")
    private long accessTokenExpirationMs;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new UnauthorizedException(ApplicationError.INVALID_CREDENTIALS));

        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ForbiddenException(ApplicationError.ACCOUNT_LOCKED);
        }
        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new ForbiddenException(ApplicationError.ACCOUNT_INACTIVE);
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setStatus(UserStatus.LOCKED);
                user.setLockedAt(LocalDateTime.now());
            }
            userRepository.save(user);
            throw new UnauthorizedException(ApplicationError.INVALID_CREDENTIALS);
        }

        if (user.getStatus() == UserStatus.UN_ACTIVE) {
            return createVerificationResponse(user);
        }

        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUserId(user.getId());
        return issueTokenPair(user);
    }

    @Override
    public VerifyInfoResponse verifyInfo(String verifyToken) {
        OtpRecord record = otpRecordRepository.findByVerifyTokenAndUsedFalse(verifyToken)
                .orElseThrow(() -> new UnauthorizedException(ApplicationError.INVALID_VERIFY_TOKEN));

        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES);
        record.setOtpCode(otp);
        record.setExpiresAt(expiresAt);
        record.setAttemptCount(0);
        otpRecordRepository.save(record);

        User user = record.getUser();
        try {
            gmailService.sendOtpEmail(user.getEmail(), user.getFullName(), otp);
        } catch (Exception e) {
            log.warn("OTP email failed for user '{}': {}", user.getUsername(), e.getMessage());
        }

        return new VerifyInfoResponse(maskEmail(user.getEmail()), expiresAt);
    }

    @Override
    public LoginResponse verifyOtp(String verifyToken, VerifyOtpRequest request) {
        OtpRecord record = otpRecordRepository.findByVerifyTokenAndUsedFalse(verifyToken)
                .orElseThrow(() -> new UnauthorizedException(ApplicationError.INVALID_VERIFY_TOKEN));

        if (record.getOtpCode() == null || record.getExpiresAt() == null
                || record.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException(ApplicationError.OTP_EXPIRED);
        }

        if (record.getAttemptCount() >= MAX_OTP_ATTEMPTS) {
            throw new RateLimitException(ApplicationError.OTP_MAX_ATTEMPTS);
        }

        if (!record.getOtpCode().equals(request.otp())) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            otpRecordRepository.save(record);
            throw new UnauthorizedException(ApplicationError.INVALID_OTP);
        }

        record.setUsed(true);
        otpRecordRepository.save(record);

        User user = record.getUser();
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUserId(user.getId());
        return issueTokenPair(user);
    }

    @Override
    public ResendOtpResponse resendOtp(ResendOtpRequest request) {
        OtpRecord oldRecord = otpRecordRepository.findByVerifyTokenAndUsedFalse(request.verifyToken())
                .orElseThrow(() -> new UnauthorizedException(ApplicationError.INVALID_VERIFY_TOKEN));

        User user = oldRecord.getUser();
        long recentCount = otpRecordRepository.countByUserIdAndCreatedAtAfter(
                user.getId(), LocalDateTime.now().minusMinutes(RESEND_WINDOW_MINUTES));
        if (recentCount >= MAX_RESEND_RECORDS) {
            throw new RateLimitException(ApplicationError.RESEND_LIMIT_EXCEEDED);
        }

        oldRecord.setUsed(true);
        otpRecordRepository.save(oldRecord);

        String newVerifyToken = UUID.randomUUID().toString();
        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES);

        OtpRecord newRecord = OtpRecord.builder()
                .user(user)
                .verifyToken(newVerifyToken)
                .otpCode(otp)
                .expiresAt(expiresAt)
                .createdAt(LocalDateTime.now())
                .build();
        otpRecordRepository.save(newRecord);

        try {
            gmailService.sendOtpEmail(user.getEmail(), user.getFullName(), otp);
        } catch (Exception e) {
            log.warn("Resend OTP email failed for user '{}': {}", user.getUsername(), e.getMessage());
        }

        return new ResendOtpResponse(newVerifyToken, (long) OTP_TTL_MINUTES * 60);
    }

    @Override
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new UnauthorizedException(ApplicationError.UNAUTHORIZED));

        if (stored.isRevoked() || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException(ApplicationError.UNAUTHORIZED);
        }

        User user = stored.getUser();

        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ForbiddenException(ApplicationError.ACCOUNT_LOCKED);
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ForbiddenException(ApplicationError.ACCOUNT_INACTIVE);
        }

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokenPair(user);
    }

    @Override
    public void logout(String username) {
        userRepository.findByUsername(username)
                .ifPresent(user -> refreshTokenRepository.revokeAllByUserId(user.getId()));
    }

    @Override
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException(ApplicationError.INVALID_CREDENTIALS);
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Override
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new ForbiddenException(ApplicationError.ACCOUNT_INACTIVE);
        }

        String resetToken = UUID.randomUUID().toString();
        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES);

        OtpRecord record = OtpRecord.builder()
                .user(user)
                .verifyToken(resetToken)
                .otpCode(otp)
                .expiresAt(expiresAt)
                .createdAt(LocalDateTime.now())
                .build();
        otpRecordRepository.save(record);

        try {
            gmailService.sendOtpEmail(user.getEmail(), user.getFullName(), otp);
        } catch (Exception e) {
            log.warn("Forgot-password OTP email failed for user '{}': {}", user.getUsername(), e.getMessage());
        }

        return new ForgotPasswordResponse(resetToken, maskEmail(user.getEmail()), expiresAt);
    }

    @Override
    public void resetPassword(String resetToken, ResetPasswordRequest request) {
        OtpRecord record = otpRecordRepository.findByVerifyTokenAndUsedFalse(resetToken)
                .orElseThrow(() -> new UnauthorizedException(ApplicationError.INVALID_RESET_TOKEN));

        if (record.getOtpCode() == null || record.getExpiresAt() == null
                || record.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException(ApplicationError.OTP_EXPIRED);
        }

        if (record.getAttemptCount() >= MAX_OTP_ATTEMPTS) {
            throw new RateLimitException(ApplicationError.OTP_MAX_ATTEMPTS);
        }

        if (!record.getOtpCode().equals(request.otp())) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            otpRecordRepository.save(record);
            throw new UnauthorizedException(ApplicationError.INVALID_OTP);
        }

        record.setUsed(true);
        otpRecordRepository.save(record);

        User user = record.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setFailedLoginAttempts(0);
        if (user.getStatus() == UserStatus.LOCKED) {
            user.setStatus(UserStatus.ACTIVE);
            user.setLockedAt(null);
        }
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUserId(user.getId());
    }

    private LoginResponse createVerificationResponse(User user) {
        String verifyToken = UUID.randomUUID().toString();
        String otp = generateOtp();
        OtpRecord record = OtpRecord.builder()
                .user(user)
                .verifyToken(verifyToken)
                .otpCode(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(VERIFY_TOKEN_TTL_MINUTES))
                .createdAt(LocalDateTime.now())
                .build();
        otpRecordRepository.save(record);
        return new LoginResponse(null, null, null, null, true, verifyToken);
    }

    private LoginResponse issueTokenPair(User user) {
        UserDetails principal = org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .build();

        String accessToken = jwtService.generateAccessToken(
                principal, Map.of("role", user.getRole().name(), "userId", user.getId()));
        String rawRefreshToken = jwtService.generateRefreshToken(principal);

        RefreshToken refreshToken = RefreshToken.builder()
                .token(rawRefreshToken)
                .user(user)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000))
                .createdAt(LocalDateTime.now())
                .build();
        refreshTokenRepository.save(refreshToken);

        return new LoginResponse(
                accessToken,
                rawRefreshToken,
                accessTokenExpirationMs / 1000,
                new LoginResponse.UserInfo(user.getId(), user.getUsername(), user.getFullName(), user.getRole()),
                null,
                null
        );
    }

    private String generateOtp() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 2) return email;
        String local = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        String masked = local.substring(0, 2) + "*".repeat(local.length() - 2);
        return masked + domain;
    }
}
