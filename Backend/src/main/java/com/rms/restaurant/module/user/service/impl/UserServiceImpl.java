package com.rms.restaurant.module.user.service.impl;

import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ForbiddenException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.mail.GmailService;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.user.dto.CreateUserRequest;
import com.rms.restaurant.module.user.dto.CreateUserResponse;
import com.rms.restaurant.module.user.dto.UpdateUserRequest;
import com.rms.restaurant.module.user.dto.UserResponse;
import com.rms.restaurant.module.user.mapper.UserProfileMapper;
import com.rms.restaurant.module.user.service.AuditService;
import com.rms.restaurant.module.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int TEMP_PASSWORD_SUFFIX_LENGTH = 8;

    private final UserRepository userRepository;
    private final UserProfileMapper userProfileMapper;
    private final PasswordEncoder passwordEncoder;
    private final GmailService gmailService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(Pageable pageable) {
        return PageResponse.of(userRepository.findAll(pageable).map(userProfileMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUser(String id) {
        return userProfileMapper.toResponse(findUserById(id));
    }

    @Override
    public CreateUserResponse createUser(CreateUserRequest request) {
        if (request.role() == UserRole.ADMIN && !isAdmin()) {
            throw new ForbiddenException(ApplicationError.MANAGER_CANNOT_ASSIGN_ADMIN_ROLE);
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new ConflictException(ApplicationError.DUPLICATE_USERNAME);
        }
        if (StringUtils.hasText(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new ConflictException(ApplicationError.DUPLICATE_EMAIL);
        }
        if (StringUtils.hasText(request.phone()) && userRepository.existsByPhone(request.phone())) {
            throw new ConflictException(ApplicationError.DUPLICATE_PHONE);
        }

        String tempPassword = generateTempPassword();

        User user = User.builder()
                .username(request.username())
                .fullName(request.fullName())
                .email(request.email())
                .phone(request.phone())
                .role(request.role())
                .status(UserStatus.UN_ACTIVE)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .build();

        User saved = userRepository.save(user);
        log.info("Created user '{}' [{}]", saved.getUsername(), saved.getRole());

        if (StringUtils.hasText(saved.getEmail())) {
            try {
                gmailService.sendTempPasswordEmail(saved.getEmail(), saved.getFullName(), tempPassword);
            } catch (Exception e) {
                log.warn("Failed to send temp password email to '{}': {}", saved.getEmail(), e.getMessage());
            }
        }

        try {
            auditService.log("USER_CREATE", "User", saved.getId(),
                    "{\"username\":\"" + saved.getUsername() + "\",\"role\":\"" + saved.getRole() + "\"}");
        } catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }

        return new CreateUserResponse(userProfileMapper.toResponse(saved), tempPassword);
    }

    @Override
    public UserResponse updateUser(String id, UpdateUserRequest request) {
        User user = findUserById(id);

        if (StringUtils.hasText(request.fullName())) {
            user.setFullName(request.fullName());
        }
        if (StringUtils.hasText(request.email())) {
            if (userRepository.existsByEmailAndIdNot(request.email(), id)) {
                throw new ConflictException(ApplicationError.DUPLICATE_EMAIL);
            }
            user.setEmail(request.email());
        }
        if (StringUtils.hasText(request.phone())) {
            if (userRepository.existsByPhoneAndIdNot(request.phone(), id)) {
                throw new ConflictException(ApplicationError.DUPLICATE_PHONE);
            }
            user.setPhone(request.phone());
        }
        if (request.role() != null) {
            user.setRole(request.role());
            log.info("Admin changed role of user '{}' to {}", user.getUsername(), request.role());
        }
        if (request.status() != null) {
            user.setStatus(request.status());
            if (request.status() == UserStatus.ACTIVE) {
                user.setFailedLoginAttempts(0);
                user.setLockedAt(null);
            }
            log.info("Admin changed status of user '{}' to {}", user.getUsername(), request.status());
        }

        User saved = userRepository.save(user);
        try {
            auditService.log("USER_UPDATE", "User", saved.getId(),
                    "{\"username\":\"" + saved.getUsername() + "\",\"role\":\"" + saved.getRole() + "\",\"status\":\"" + saved.getStatus() + "\"}");
        } catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
        return userProfileMapper.toResponse(saved);
    }

    @Override
    public void deleteUser(String id) {
        User user = findUserById(id);
        user.setStatus(UserStatus.INACTIVE);
        userRepository.save(user);
        log.info("Soft-deleted user '{}'", user.getUsername());
        try {
            auditService.log("USER_DELETE", "User", user.getId(),
                    "{\"username\":\"" + user.getUsername() + "\"}");
        } catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    @Override
    public void unlockUser(String id) {
        User user = findUserById(id);
        if (user.getStatus() != UserStatus.LOCKED) {
            throw new ApplicationException(ApplicationError.USER_NOT_UNLOCKABLE);
        }
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockedAt(null);
        userRepository.save(user);
        log.info("Unlocked user '{}'", user.getUsername());
        try {
            auditService.log("USER_UNLOCK", "User", user.getId(),
                    "{\"username\":\"" + user.getUsername() + "\"}");
        } catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private User findUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
    }

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder("Tmp@");
        for (int i = 0; i < TEMP_PASSWORD_SUFFIX_LENGTH; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(secureRandom.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }
}
