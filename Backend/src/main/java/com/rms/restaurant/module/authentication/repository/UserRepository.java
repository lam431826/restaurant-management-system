package com.rms.restaurant.module.authentication.repository;

import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.module.authentication.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, String id);
    boolean existsByPhone(String phone);
    boolean existsByPhoneAndIdNot(String phone, String id);
    Optional<User> findByUsernameAndStatus(String username, UserStatus status);
}
