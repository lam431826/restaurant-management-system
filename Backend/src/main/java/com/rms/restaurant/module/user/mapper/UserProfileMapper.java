package com.rms.restaurant.module.user.mapper;

import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.user.dto.UserResponse;
import org.springframework.stereotype.Component;

@Component
public class UserProfileMapper {

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.getCreatedAt()
        );
    }
}
