package com.rms.restaurant.module.user.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.user.dto.CreateUserRequest;
import com.rms.restaurant.module.user.dto.CreateUserResponse;
import com.rms.restaurant.module.user.dto.UpdateUserRequest;
import com.rms.restaurant.module.user.dto.UserResponse;
import com.rms.restaurant.module.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // Read access: MANAGER also needs this to pick/search accounts when linking an Employee profile.
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<PageResponse<UserResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(userService.listUsers(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<UserResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUser(id)));
    }

    // MANAGER may create accounts (e.g. to link to an Employee profile) but never with role ADMIN —
    // enforced in UserServiceImpl.createUser(), not just here, since @PreAuthorize can't safely
    // depend on request-body field discovery across all compiler configurations.
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<CreateUserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        CreateUserResponse created = userService.createUser(request);
        return ResponseEntity
                .created(URI.create("/api/users/" + created.user().id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> update(@PathVariable String id,
                                                             @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateUser(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> unlock(@PathVariable String id) {
        userService.unlockUser(id);
        return ResponseEntity.noContent().build();
    }
}
