package com.rms.restaurant.module.user.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.user.dto.CreateUserRequest;
import com.rms.restaurant.module.user.dto.UpdateUserRequest;
import com.rms.restaurant.module.user.dto.UserResponse;
import org.springframework.data.domain.Pageable;

public interface UserService {
    PageResponse<UserResponse> listUsers(Pageable pageable);
    UserResponse getUser(String id);
    UserResponse createUser(CreateUserRequest request);
    UserResponse updateUser(String id, UpdateUserRequest request);
    void deleteUser(String id);
    void unlockUser(String id);
}
