package com.rms.restaurant.common.init;

import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    record SeedUser(String username, String fullName, String email, String phone,
                    UserRole role, UserStatus status, String rawPassword) {}

    private static final List<SeedUser> SEED_USERS = List.of(
        new SeedUser("admin",      "System Administrator", "admin@rms.local",      "0900000001", UserRole.ADMIN,    UserStatus.ACTIVE,    "Admin@123456"),
        new SeedUser("manager01",  "Manager One",          "manager01@rms.local",  "0900000002", UserRole.MANAGER,  UserStatus.UN_ACTIVE, "Manager@123456"),
        new SeedUser("cashier01",  "Cashier One",          "cashier01@rms.local",  "0900000003", UserRole.CASHIER,  UserStatus.UN_ACTIVE, "Cashier@123456"),
        new SeedUser("waiter01",      "Waiter One",  "waiter01@rms.local",        "0900000004", UserRole.WAITER,   UserStatus.UN_ACTIVE, "Waiter@123456"),
        new SeedUser("TanTDHE191221", "Tan TD",      "tranduytanrobin@gmail.com", "0900000005", UserRole.MANAGER, UserStatus.UN_ACTIVE, "Qwedsa@1")
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int created = 0;
        for (SeedUser seed : SEED_USERS) {
            if (userRepository.existsByUsername(seed.username())) {
                log.debug("Seed user '{}' already exists — skipping", seed.username());
                continue;
            }
            userRepository.save(User.builder()
                    .username(seed.username())
                    .fullName(seed.fullName())
                    .email(seed.email())
                    .phone(seed.phone())
                    .role(seed.role())
                    .status(seed.status())
                    .passwordHash(passwordEncoder.encode(seed.rawPassword()))
                    .build());
            log.info("Seeded user '{}' [{}]", seed.username(), seed.role());
            created++;
        }
        if (created > 0) {
            log.info("DataSeeder: created {} user(s)", created);
        }
    }
}
