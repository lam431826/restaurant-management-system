package com.rms.restaurant.module.notification.service;

import com.rms.restaurant.module.notification.dto.PaymentNotificationRequest;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;

public interface NotificationService {

    void sendReservationNotification(ReservationNotificationRequest request);

    void sendPaymentNotification(PaymentNotificationRequest request);

}
