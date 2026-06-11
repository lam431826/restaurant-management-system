package com.rms.restaurant.module.notification.service;

import com.rms.restaurant.common.utils.enums.NotificationChannel;
import com.rms.restaurant.module.notification.dto.ManualNotificationRequest;

import java.util.Map;

public interface NotificationService {
    void send(String recipient, String template, Map<String, Object> variables, NotificationChannel channel);
    void sendManual(ManualNotificationRequest request);
}
