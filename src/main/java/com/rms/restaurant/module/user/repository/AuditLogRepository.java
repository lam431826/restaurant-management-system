package com.rms.restaurant.module.user.repository;

import com.rms.restaurant.module.user.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    Page<AuditLog> findByActorId(String actorId, Pageable pageable);
    Page<AuditLog> findByTargetEntityAndTargetId(String entity, String id, Pageable pageable);
}
