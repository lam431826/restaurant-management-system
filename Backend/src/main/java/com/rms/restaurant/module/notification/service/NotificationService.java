package com.rms.restaurant.module.notification.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.notification.dto.ManualNotificationRequest;
import com.rms.restaurant.module.notification.dto.NotificationLogResponse;
import com.rms.restaurant.module.notification.dto.PaymentNotificationRequest;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface NotificationService {

    void sendReservationNotification(ReservationNotificationRequest request);

    void sendPaymentNotification(PaymentNotificationRequest request);

    PageResponse<NotificationLogResponse> getLogs(String type, String status,
                                                   String referenceId,
                                                   LocalDate from, LocalDate to,
                                                   Pageable pageable);

    void sendManual(ManualNotificationRequest request);
}
