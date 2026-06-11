package com.rms.restaurant.module.notification.service.impl;

import com.rms.restaurant.common.utils.enums.NotificationChannel;
import com.rms.restaurant.module.notification.dto.ManualNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    @Override public void send(String recipient, String template, Map<String, Object> variables, NotificationChannel channel) {}
    @Override public void sendManual(ManualNotificationRequest request) {}
}
