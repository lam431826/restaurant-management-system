package com.rms.restaurant.module.authentication.service.impl;

import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.module.authentication.model.OtpRecord;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.OtpRecordRepository;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Persists failed-attempt counters in their own transaction, independent of the caller's.
 *
 * AuthServiceImpl.login()/verifyOtp()/resetPassword() each increment a counter and then throw to
 * reject the request — but AuthServiceImpl is @Transactional at the class level, and Spring rolls
 * back the WHOLE method's writes on an uncaught RuntimeException, silently undoing the counter
 * write along with everything else. REQUIRES_NEW commits the counter update (and, for logins, the
 * resulting LOCKED transition) before the caller's exception ever propagates, so it survives
 * regardless of what the caller does next. Must live on a separate bean — self-invocation from
 * within AuthServiceImpl would bypass the Spring AOP proxy and silently run in the same
 * transaction, same class of pitfall as the @Async self-invocation note elsewhere in this codebase.
 *
 * recordFailedLogin() also emits the AUTH_LOGIN_FAILED audit entry itself, for the same reason:
 * AuditServiceImpl.log() only writes its row via a @TransactionalEventListener(phase=AFTER_COMMIT)
 * — publishing that event from AuthServiceImpl.login() was a no-op, since that method's own
 * transaction never commits on a failed login. Publishing it here, inside a transaction that does
 * commit, is what actually gets the row written.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthAttemptService {

    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final OtpRecordRepository otpRecordRepository;
    private final AuditService auditService;

    /** @return true if this attempt pushed the account into LOCKED */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean recordFailedLogin(String userId) {
        User user = userRepository.findById(userId).orElseThrow();
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        boolean locked = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
        if (locked) {
            user.setStatus(UserStatus.LOCKED);
            user.setLockedAt(LocalDateTime.now());
            user.setTokenVersion(user.getTokenVersion() + 1);
        }
        userRepository.save(user);
        try {
            auditService.log(user.getId(), user.getUsername(), "AUTH_LOGIN_FAILED", "User", user.getId(),
                    "{\"reason\":\"INVALID_CREDENTIALS\",\"locked\":" + locked + "}");
        } catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
        return locked;
    }

    /** @return the attempt count after this increment */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int recordFailedOtpAttempt(String otpRecordId) {
        OtpRecord record = otpRecordRepository.findById(otpRecordId).orElseThrow();
        int attempts = record.getAttemptCount() + 1;
        record.setAttemptCount(attempts);
        otpRecordRepository.save(record);
        return attempts;
    }
}
