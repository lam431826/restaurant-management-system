package com.rms.restaurant.module.notification.repository;

import com.rms.restaurant.module.notification.model.NotificationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, String> {

    Page<NotificationLog> findByRecipient(String recipient, Pageable pageable);

    @Query("SELECT n FROM NotificationLog n WHERE " +
           "(:type IS NULL OR n.type = :type) AND " +
           "(:status IS NULL OR n.status = :status) AND " +
           "(:from IS NULL OR n.sentAt >= :from) AND " +
           "(:to IS NULL OR n.sentAt <= :to) " +
           "ORDER BY n.sentAt DESC")
    Page<NotificationLog> findWithFilters(
            @Param("type")   String type,
            @Param("status") String status,
            @Param("from")   LocalDateTime from,
            @Param("to")     LocalDateTime to,
            Pageable pageable
    );
}
