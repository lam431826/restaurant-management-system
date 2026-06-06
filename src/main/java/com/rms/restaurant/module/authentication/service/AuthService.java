package com.rms.restaurant.module.authentication.service;

import com.rms.restaurant.module.authentication.dto.*;

public interface AuthService {
    LoginResponse login(LoginRequest request);
    LoginResponse refreshToken(RefreshTokenRequest request);
    void logout(String username);
    void changePassword(String username, ChangePasswordRequest request);
}
