package com.rms.restaurant.module.authentication.service.impl;

import com.rms.restaurant.common.security.AppUserDetails;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        // UN_ACTIVE accounts still need a valid UserDetails during the first-login OTP flow
        // (verify/info, verify/otp run before status flips to ACTIVE); only LOCKED/INACTIVE
        // should actually disable the account (BE-AUTH-02).
        boolean enabled = user.getStatus() == UserStatus.ACTIVE || user.getStatus() == UserStatus.UN_ACTIVE;
        boolean accountNonLocked = user.getStatus() != UserStatus.LOCKED;

        return new AppUserDetails(
                user.getUsername(),
                user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                enabled,
                accountNonLocked,
                user.getTokenVersion()
        );
    }
}
