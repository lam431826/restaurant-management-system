package com.rms.restaurant.module.user.repository;

import com.rms.restaurant.module.user.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:actorUsername IS NULL OR a.actorUsername = :actorUsername) AND " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:targetEntity IS NULL OR a.targetEntity = :targetEntity) AND " +
           "(:targetId IS NULL OR a.targetId = :targetId) AND " +
           "(:from IS NULL OR a.createdAt >= :from) AND " +
           "(:to IS NULL OR a.createdAt <= :to)")
    Page<AuditLog> findWithFilters(
            @Param("actorUsername") String actorUsername,
            @Param("action") String action,
            @Param("targetEntity") String targetEntity,
            @Param("targetId") String targetId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);
}
