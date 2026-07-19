package com.rms.restaurant.common.realtime;

import com.rms.restaurant.common.security.JwtService;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * Authenticates STOMP CONNECT frames — {@code JwtAuthenticationFilter} only runs on the
 * initial HTTP handshake and never again once the connection is upgraded, so this is the
 * STOMP-level equivalent, invoked per CONNECT frame. A validation failure here throws, which
 * Spring turns into a STOMP ERROR frame + session close (no HTTP 401 available post-upgrade).
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TableRepository tableRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            Object role = accessor.getSessionAttributes() != null
                    ? accessor.getSessionAttributes().get(RoleTaggingHandshakeInterceptor.SESSION_ATTR)
                    : null;
            if (!(role instanceof RoleTaggingHandshakeInterceptor.Role wsRole)) {
                throw new IllegalStateException("STOMP session missing role attribute — handshake interceptor not applied");
            }

            Principal principal = switch (wsRole) {
                case STAFF -> authenticateStaff(accessor);
                case GUEST -> authenticateGuest(accessor);
            };
            accessor.setUser(principal);
        }

        return message;
    }

    private Principal authenticateStaff(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing Authorization header on STOMP CONNECT");
        }
        String token = authHeader.substring(7);
        String username = jwtService.extractUsername(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(token, userDetails)) {
            throw new IllegalArgumentException("Invalid or expired JWT on STOMP CONNECT");
        }
        return () -> username;
    }

    private Principal authenticateGuest(StompHeaderAccessor accessor) {
        String tableToken = accessor.getFirstNativeHeader("X-Table-Token");
        if (tableToken == null || tableToken.isBlank()) {
            throw new IllegalArgumentException("Missing X-Table-Token header on STOMP CONNECT");
        }
        String tableId = tableRepository.findByQrToken(tableToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid table token on STOMP CONNECT"))
                .getId();
        return () -> tableId;
    }
}
