package com.rms.restaurant.module.authentication.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.authentication.dto.*;
import com.rms.restaurant.module.authentication.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserDetails userDetails) {
        authService.logout(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal UserDetails userDetails,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify/info")
    public ResponseEntity<ApiResponse<VerifyInfoResponse>> verifyInfo(
            @RequestHeader("X-Verify-Token") String verifyToken,
            @Valid @RequestBody VerifyInfoRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.verifyInfo(verifyToken, request)));
    }

    @PostMapping("/verify/otp")
    public ResponseEntity<LoginResponse> verifyOtp(
            @RequestHeader("X-Verify-Token") String verifyToken,
            @Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(verifyToken, request));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<ResendOtpResponse>> resendOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.resendOtp(request)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<ForgotPasswordResponse>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.forgotPassword(request)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(
            @RequestHeader("X-Reset-Token") String resetToken,
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(resetToken, request);
        return ResponseEntity.noContent().build();
    }
}
