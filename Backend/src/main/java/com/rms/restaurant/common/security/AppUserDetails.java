package com.rms.restaurant.common.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

/**
 * Carries {@code tokenVersion} alongside the standard Spring Security fields so
 * JwtAuthenticationFilter can compare an access token's embedded "tv" claim against the
 * user's live value in a single DB lookup (see JwtService.isAccessTokenValid, BE-AUTH-01/02).
 */
public class AppUserDetails extends User {

    private final int tokenVersion;

    public AppUserDetails(String username, String password, Collection<? extends GrantedAuthority> authorities,
                           boolean enabled, boolean accountNonLocked, int tokenVersion) {
        super(username, password, enabled, true, true, accountNonLocked, authorities);
        this.tokenVersion = tokenVersion;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }
}
