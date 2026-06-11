package com.rms.restaurant.module.user.service.impl;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.user.dto.CreateUserRequest;
import com.rms.restaurant.module.user.dto.UpdateUserRequest;
import com.rms.restaurant.module.user.dto.UserResponse;
import com.rms.restaurant.module.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    @Override
    public PageResponse<UserResponse> listUsers(Pageable pageable) {
        return null;
    }

    @Override
    public UserResponse getUser(String id) {
        return null;
    }

    @Override
    public UserResponse createUser(CreateUserRequest request) {
        return null;
    }

    @Override
    public UserResponse updateUser(String id, UpdateUserRequest request) {
        return null;
    }

    @Override
    public void deleteUser(String id) {
    }

    @Override
    public void unlockUser(String id) {
    }
}
