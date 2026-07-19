package com.rms.restaurant.common.realtime;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Tags the HTTP handshake session with which STOMP endpoint (/ws vs /ws-guest) it came from,
 * since the shared {@link StompAuthChannelInterceptor} needs to know which auth scheme (JWT vs
 * table token) to apply once the CONNECT frame arrives — the handshake attributes are the only
 * thing that survives from the HTTP upgrade into the STOMP session.
 */
public class RoleTaggingHandshakeInterceptor implements HandshakeInterceptor {

    public enum Role { STAFF, GUEST }

    public static final String SESSION_ATTR = "wsRole";

    private final Role role;

    public RoleTaggingHandshakeInterceptor(Role role) {
        this.role = role;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
        attributes.put(SESSION_ATTR, role);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }
}
