package com.rms.restaurant.module.user.service.impl;

import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.user.dto.AuditLogResponse;
import com.rms.restaurant.module.user.model.AuditLog;
import com.rms.restaurant.module.user.repository.AuditLogRepository;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * {@link #log} only publishes an event — it does not touch the database. The actual
 * AuditLog row is written by {@link #onAuditLogEvent}, which fires AFTER the caller's
 * own transaction commits (fallbackExecution covers the rare case of no active
 * transaction). This is deliberate: a previous REQUIRES_NEW-based design committed the
 * audit row independently and *before* the caller's own save() actually flushed to the
 * DB (JPA defers INSERTs for GenerationType.UUID entities), so a late DB-level failure
 * (e.g. a column-length violation) rolled back the real mutation while the audit log
 * still recorded it as successful. See CLAUDE.md "Audit logging" for the incident.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private static final String SYSTEM = "SYSTEM";

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public void log(String action, String targetEntity, String targetId, String detail) {
        String actorId = SYSTEM;
        String actorUsername = SYSTEM;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            actorUsername = auth.getName();
            actorId = userRepository.findByUsername(actorUsername)
                    .map(u -> u.getId())
                    .orElse(SYSTEM);
        }

        eventPublisher.publishEvent(new AuditLogEvent(actorId, actorUsername, action, targetEntity, targetId, detail));
    }

    @Override
    public void log(String actorId, String actorUsername, String action, String targetEntity, String targetId, String detail) {
        eventPublisher.publishEvent(new AuditLogEvent(
                actorId != null ? actorId : SYSTEM, actorUsername, action, targetEntity, targetId, detail));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getLogs(
            String actorUsername, String action, String targetEntity, String targetId,
            LocalDate from, LocalDate to, Pageable pageable) {

        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.plusDays(1).atStartOfDay() : null;

        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        return PageResponse.of(
                auditLogRepository.findWithFilters(actorUsername, action, targetEntity, targetId, fromDt, toDt, sorted)
                        .map(this::toResponse));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAuditLogEvent(AuditLogEvent event) {
        try {
            AuditLog entry = AuditLog.builder()
                    .actorId(event.actorId())
                    .actorUsername(event.actorUsername())
                    .action(event.action())
                    .targetEntity(event.targetEntity())
                    .targetId(event.targetId())
                    .detail(event.detail())
                    .build();
            AuditLog saved = auditLogRepository.save(entry);
            realtimeEventPublisher.publishAuditEvent(toResponse(saved));
        } catch (Exception e) {
            log.warn("Audit log persist failed: {}", e.getMessage());
        }
    }

    private AuditLogResponse toResponse(AuditLog a) {
        return new AuditLogResponse(
                a.getId(), a.getActorId(), a.getActorUsername(),
                a.getAction(), a.getTargetEntity(), a.getTargetId(),
                a.getDetail(), a.getIpAddress(), a.getCreatedAt());
    }
}
