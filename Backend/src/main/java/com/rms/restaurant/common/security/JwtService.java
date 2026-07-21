package com.rms.restaurant.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.access-token-expiration}")
    private long expirationMs;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshExpirationMs;

    public String generateAccessToken(UserDetails userDetails, Map<String, Object> extraClaims, int tokenVersion) {
        Map<String, Object> claims = new java.util.HashMap<>(extraClaims);
        claims.put("typ", "access");
        claims.put("tv", tokenVersion);
        return buildToken(userDetails, claims, expirationMs);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(userDetails, Map.of("typ", "refresh"), refreshExpirationMs);
    }

    private String buildToken(UserDetails userDetails, Map<String, Object> extra, long ttl) {
        // jti: without a unique claim here, two tokens issued for the same user within the same
        // issuedAt second (e.g. a double-click login, or a refresh right after login) are
        // byte-for-byte identical, which collides with refresh_tokens' UNIQUE KEY on `token` and
        // surfaces as a 500 on an otherwise-valid request.
        return Jwts.builder()
                .id(java.util.UUID.randomUUID().toString())
                .claims(extra)
                .subject(userDetails.getUsername())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + ttl))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extractAllClaims(token));
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    /**
     * Access-token validity check used by JwtAuthenticationFilter: in addition to the
     * subject/expiry check, requires typ=access (so a raw refresh token is rejected) and
     * a matching token-version claim (so revocation — logout/lock/deactivate/password-reset —
     * takes effect immediately instead of only at natural expiry). See BE-AUTH-01/02.
     */
    public boolean isAccessTokenValid(String token, UserDetails userDetails, int currentTokenVersion) {
        if (!isTokenValid(token, userDetails)) return false;
        Claims claims = extractAllClaims(token);
        Object typ = claims.get("typ");
        if (!"access".equals(typ)) return false;
        Object tv = claims.get("tv");
        return tv instanceof Number && ((Number) tv).intValue() == currentTokenVersion;
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
