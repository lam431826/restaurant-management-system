package com.rms.restaurant.module.notification.repository;

import com.rms.restaurant.module.notification.model.NotificationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, String> {
    Page<NotificationLog> findByRecipient(String recipient, Pageable pageable);
}
