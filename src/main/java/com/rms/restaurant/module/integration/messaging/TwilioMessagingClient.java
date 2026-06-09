package com.rms.restaurant.module.integration.messaging;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Profile("twilio")
@RequiredArgsConstructor
public class TwilioMessagingClient implements MessagingClient {

    @Override
    public void send(String recipient, String template, Map<String, Object> variables, String channel) {
        // TODO: implement Twilio integration
    }
}
