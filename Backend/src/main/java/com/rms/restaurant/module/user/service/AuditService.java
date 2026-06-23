package com.rms.restaurant.module.user.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.user.dto.AuditLogResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface AuditService {

    // Reads actor from SecurityContextHolder — use for authenticated staff actions
    void log(String action, String targetEntity, String targetId, String detail);

    // Explicit actor — use when SecurityContext is not yet set (e.g. login flow)
    void log(String actorId, String actorUsername, String action, String targetEntity, String targetId, String detail);

    PageResponse<AuditLogResponse> getLogs(
            String actorUsername, String action, String targetEntity, String targetId,
            LocalDate from, LocalDate to, Pageable pageable);
}
