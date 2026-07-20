package com.rms.restaurant.module.authentication.service;

import com.rms.restaurant.module.authentication.dto.*;

public interface AuthService {
    LoginResponse login(LoginRequest request);
    LoginResponse refreshToken(RefreshTokenRequest request);
    void logout(String username);
    void changePassword(String username, ChangePasswordRequest request);
    VerifyInfoResponse verifyInfo(String verifyToken, VerifyInfoRequest request);
    LoginResponse verifyOtp(String verifyToken, VerifyOtpRequest request);
    ResendOtpResponse resendOtp(ResendOtpRequest request);
    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);
    void resetPassword(String resetToken, ResetPasswordRequest request);
}
