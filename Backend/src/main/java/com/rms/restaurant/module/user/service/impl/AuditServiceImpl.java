package com.rms.restaurant.module.user.service.impl;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.user.dto.AuditLogResponse;
import com.rms.restaurant.module.user.model.AuditLog;
import com.rms.restaurant.module.user.repository.AuditLogRepository;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private static final String SYSTEM = "SYSTEM";

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

        persist(actorId, actorUsername, action, targetEntity, targetId, detail);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String actorId, String actorUsername, String action, String targetEntity, String targetId, String detail) {
        persist(actorId != null ? actorId : SYSTEM, actorUsername, action, targetEntity, targetId, detail);
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

    private void persist(String actorId, String actorUsername, String action,
                         String targetEntity, String targetId, String detail) {
        AuditLog entry = AuditLog.builder()
                .actorId(actorId)
                .actorUsername(actorUsername)
                .action(action)
                .targetEntity(targetEntity)
                .targetId(targetId)
                .detail(detail)
                .build();
        auditLogRepository.save(entry);
    }

    private AuditLogResponse toResponse(AuditLog a) {
        return new AuditLogResponse(
                a.getId(), a.getActorId(), a.getActorUsername(),
                a.getAction(), a.getTargetEntity(), a.getTargetId(),
                a.getDetail(), a.getIpAddress(), a.getCreatedAt());
    }
}
