package com.rms.restaurant.module.authentication.service.impl;

import com.rms.restaurant.module.authentication.dto.*;
import com.rms.restaurant.module.authentication.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    @Override
    public LoginResponse login(LoginRequest request) {
        // TODO: implement
        return null;
    }

    @Override
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        // TODO: implement
        return null;
    }

    @Override
    public void logout(String username) {
        // TODO: implement
    }

    @Override
    public void changePassword(String username, ChangePasswordRequest request) {
        // TODO: implement
    }
}
