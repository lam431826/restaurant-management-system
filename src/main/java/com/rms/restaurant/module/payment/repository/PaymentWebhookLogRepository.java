package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.PaymentWebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentWebhookLogRepository extends JpaRepository<PaymentWebhookLog, String> {}
