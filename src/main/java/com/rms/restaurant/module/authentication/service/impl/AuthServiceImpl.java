package com.rms.restaurant.module.authentication.service.impl;

import com.rms.restaurant.common.security.JwtService;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ForbiddenException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.exception.UnauthorizedException;
import com.rms.restaurant.module.authentication.dto.*;
import com.rms.restaurant.module.authentication.model.RefreshToken;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.RefreshTokenRepository;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.authentication.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

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
        if (user.getStatus() == UserStatus.UN_ACTIVE) {
            throw new ForbiddenException(ApplicationError.ACCOUNT_UNVERIFIED);
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

        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUserId(user.getId());
        return issueTokenPair(user);
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
                new LoginResponse.UserInfo(user.getId(), user.getUsername(), user.getFullName(), user.getRole())
        );
    }
}
