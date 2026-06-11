package com.rms.restaurant.module.user.dto;

public record CreateUserResponse(
        UserResponse user,
        String tempPassword
) {}
