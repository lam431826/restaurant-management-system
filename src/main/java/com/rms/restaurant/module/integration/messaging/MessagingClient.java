package com.rms.restaurant.module.integration.messaging;

import java.util.Map;

public interface MessagingClient {
    void send(String recipient, String template, Map<String, Object> variables, String channel);
}
