package com.rms.restaurant.module.authentication.service.impl;

import com.rms.restaurant.common.security.JwtService;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
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
import com.rms.restaurant.module.employee.dto.SelfEmployeeProfileRequest;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import com.rms.restaurant.module.employee.service.EmployeeService;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

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
    private final AuditService auditService;
    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository;
    private final AuthAttemptService authAttemptService;
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
            // Runs in its own REQUIRES_NEW transaction (including its own AUTH_LOGIN_FAILED audit
            // entry) so both survive the UnauthorizedException below rolling back this method's
            // own transaction — see AuthAttemptService's class javadoc.
            authAttemptService.recordFailedLogin(user.getId());
            throw new UnauthorizedException(ApplicationError.INVALID_CREDENTIALS);
        }

        if (user.getStatus() == UserStatus.UN_ACTIVE) {
            return createVerificationResponse(user);
        }

        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUserId(user.getId());
        audit(user.getId(), user.getUsername(), "AUTH_LOGIN", "User", user.getId(), "{}");
        return issueTokenPair(user);
    }

    @Override
    public VerifyInfoResponse verifyInfo(String verifyToken, VerifyInfoRequest request) {
        OtpRecord record = otpRecordRepository.findByVerifyTokenAndUsedFalse(verifyToken)
                .orElseThrow(() -> new UnauthorizedException(ApplicationError.INVALID_VERIFY_TOKEN));

        // BE-AUTH-03: verify/info regenerates an OTP in place (no new OtpRecord row), so it
        // was never counted by resendOtp()'s rate limit. Share the same MAX_RESEND_RECORDS cap.
        if (record.getInfoRequestCount() >= MAX_RESEND_RECORDS) {
            throw new RateLimitException(ApplicationError.RESEND_LIMIT_EXCEEDED);
        }

        User user = record.getUser();
        // Prefer the linked Employee's email (onboarding may have pre-existed the login account,
        // see EmployeeServiceImpl.linkUser()); otherwise fall back to the email the admin set on
        // the User row at account-creation time (CreateUserRequest.email()). If either is already
        // on file, the submitted email must match it exactly — this step confirms the existing
        // registered contact rather than letting the user redefine it to something arbitrary.
        String emailOnFile = employeeRepository.findByUserId(user.getId())
                .map(e -> StringUtils.hasText(e.getEmail()) ? e.getEmail() : null)
                .orElse(StringUtils.hasText(user.getEmail()) ? user.getEmail() : null);
        if (emailOnFile != null && !emailOnFile.equalsIgnoreCase(request.email())) {
            throw new ApplicationException(ApplicationError.EMAIL_VERIFICATION_MISMATCH);
        }

        // B1: duplicate email/phone checks — excludes the user's own row(s) so resubmitting the
        // same values (e.g. after an expired OTP) doesn't falsely conflict with itself. Checked
        // here (not just at verifyOtp's saveMyProfile call) so a conflict surfaces immediately
        // while the user is still filling the form, not silently swallowed after OTP succeeds.
        if (userRepository.existsByEmailAndIdNot(request.email(), user.getId())) {
            throw new ConflictException(ApplicationError.DUPLICATE_EMAIL);
        }
        if (userRepository.existsByPhoneAndIdNot(request.phone(), user.getId())) {
            throw new ConflictException(ApplicationError.DUPLICATE_PHONE);
        }
        boolean phoneTakenByEmployee = employeeRepository.findByUserId(user.getId())
                .map(e -> employeeRepository.existsByPhoneAndIdNot(request.phone(), e.getId()))
                .orElseGet(() -> employeeRepository.existsByPhone(request.phone()));
        if (phoneTakenByEmployee) {
            throw new ConflictException(ApplicationError.DUPLICATE_EMPLOYEE_PHONE);
        }
        // B2 (required fields / formats) is enforced by @Valid on VerifyInfoRequest already.

        record.setInfoRequestCount(record.getInfoRequestCount() + 1);
        record.setPendingFullName(request.fullName());
        record.setPendingEmail(request.email());
        record.setPendingPhone(request.phone());
        record.setPendingStartDate(request.startDate());
        record.setPendingNote(request.note());
        record.setPendingIdNumber(request.idNumber());
        record.setPendingBirthday(request.birthday());
        record.setPendingGender(request.gender());
        record.setPendingAddress(request.address());

        // B3: send OTP to the email just submitted, not user.getEmail() — the account may not
        // have one on file yet, which is exactly the gap this form exists to close.
        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES);
        record.setOtpCode(otp);
        record.setExpiresAt(expiresAt);
        record.setAttemptCount(0);
        otpRecordRepository.save(record);

        try {
            gmailService.sendOtpEmail(request.email(), request.fullName(), otp);
        } catch (Exception e) {
            log.warn("OTP email failed for user '{}': {}", user.getUsername(), e.getMessage());
        }

        return new VerifyInfoResponse(maskEmail(request.email()), expiresAt);
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
            authAttemptService.recordFailedOtpAttempt(record.getId());
            throw new UnauthorizedException(ApplicationError.INVALID_OTP);
        }

        record.setUsed(true);
        otpRecordRepository.save(record);

        User user = record.getUser();
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        audit(user.getId(), user.getUsername(), "AUTH_ACCOUNT_ACTIVATED", "User", user.getId(), "{}");

        // B4: OTP confirmed — commit the full profile submitted at verify/info, both onto User
        // (name/email/phone) and a newly linked Employee row, by reusing the exact self-service
        // upsert path ("Hồ sơ của tôi" / EmployeeService.saveMyProfile) so the two never drift.
        // Best-effort: a conflict here (e.g. the phone got taken by someone else in the few
        // minutes between verify/info and verify/otp) must NOT block account activation — the
        // account is already ACTIVE above regardless; the user can fix/finish their profile
        // later from "Hồ sơ của tôi".
        if (record.getPendingFullName() != null && record.getPendingPhone() != null) {
            try {
                employeeService.saveMyProfile(user.getUsername(), new SelfEmployeeProfileRequest(
                        record.getPendingFullName(),
                        record.getPendingPhone(),
                        record.getPendingStartDate(),
                        record.getPendingNote(),
                        record.getPendingIdNumber(),
                        record.getPendingBirthday(),
                        record.getPendingGender(),
                        record.getPendingAddress(),
                        record.getPendingEmail()));
            } catch (Exception e) {
                log.warn("Auto-creating employee profile failed for user '{}': {}", user.getUsername(), e.getMessage());
            }
        }

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

        // Carry the pending profile (submitted at verify/info) over to the new record — otherwise
        // a resend would lose it and verify/otp would have nothing to commit onto the user.
        OtpRecord newRecord = OtpRecord.builder()
                .user(user)
                .verifyToken(newVerifyToken)
                .otpCode(otp)
                .expiresAt(expiresAt)
                .createdAt(LocalDateTime.now())
                .pendingFullName(oldRecord.getPendingFullName())
                .pendingEmail(oldRecord.getPendingEmail())
                .pendingPhone(oldRecord.getPendingPhone())
                .pendingStartDate(oldRecord.getPendingStartDate())
                .pendingNote(oldRecord.getPendingNote())
                .pendingIdNumber(oldRecord.getPendingIdNumber())
                .pendingBirthday(oldRecord.getPendingBirthday())
                .pendingGender(oldRecord.getPendingGender())
                .pendingAddress(oldRecord.getPendingAddress())
                .build();
        otpRecordRepository.save(newRecord);

        String targetEmail = oldRecord.getPendingEmail() != null ? oldRecord.getPendingEmail() : user.getEmail();
        String targetName = oldRecord.getPendingFullName() != null ? oldRecord.getPendingFullName() : user.getFullName();
        try {
            gmailService.sendOtpEmail(targetEmail, targetName, otp);
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
        userRepository.findByUsername(username).ifPresent(user -> {
            refreshTokenRepository.revokeAllByUserId(user.getId());
            // BE-AUTH-01/02: invalidate any already-issued access token immediately too,
            // not just the refresh token — otherwise "logout" leaves the current session usable.
            user.setTokenVersion(user.getTokenVersion() + 1);
            userRepository.save(user);
            audit(user.getId(), user.getUsername(), "AUTH_LOGOUT", "User", user.getId(), "{}");
        });
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
        audit(user.getId(), user.getUsername(), "AUTH_PASSWORD_CHANGED", "User", user.getId(), "{}");
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
            authAttemptService.recordFailedOtpAttempt(record.getId());
            throw new UnauthorizedException(ApplicationError.INVALID_OTP);
        }

        record.setUsed(true);
        otpRecordRepository.save(record);

        User user = record.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setFailedLoginAttempts(0);
        user.setTokenVersion(user.getTokenVersion() + 1);
        if (user.getStatus() == UserStatus.LOCKED) {
            user.setStatus(UserStatus.ACTIVE);
            user.setLockedAt(null);
        }
        userRepository.save(user);
        audit(user.getId(), user.getUsername(), "AUTH_PASSWORD_RESET", "User", user.getId(), "{}");

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
                principal, Map.of("role", user.getRole().name(), "userId", user.getId()), user.getTokenVersion());
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

    private void audit(String actorId, String actorUsername, String action,
                       String targetEntity, String targetId, String detail) {
        try { auditService.log(actorId, actorUsername, action, targetEntity, targetId, detail); }
        catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
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
