package com.rms.restaurant.module.authentication.mapper;

import com.rms.restaurant.module.authentication.dto.LoginResponse;
import com.rms.restaurant.module.authentication.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public LoginResponse.UserInfo toUserInfo(User user) {
        return new LoginResponse.UserInfo(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole()
        );
    }
}
