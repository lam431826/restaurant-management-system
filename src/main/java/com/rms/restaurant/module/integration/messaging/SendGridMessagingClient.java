package com.rms.restaurant.module.integration.messaging;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Profile("sendgrid")
@RequiredArgsConstructor
public class SendGridMessagingClient implements MessagingClient {

    @Override
    public void send(String recipient, String template, Map<String, Object> variables, String channel) {
        // TODO: implement SendGrid integration
    }
}
