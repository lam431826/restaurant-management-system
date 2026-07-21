package com.rms.restaurant.module.user.controller;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.user.dto.AuditLogResponse;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public PageResponse<AuditLogResponse> getLogs(
            @RequestParam(required = false) String actorUsername,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetEntity,
            @RequestParam(required = false) String targetId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        return auditService.getLogs(actorUsername, action, targetEntity, targetId, from, to,
                PageRequest.of(page, size));
    }
}
