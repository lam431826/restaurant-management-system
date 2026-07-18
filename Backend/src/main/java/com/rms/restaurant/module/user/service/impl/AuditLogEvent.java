package com.rms.restaurant.module.user.service.impl;

/**
 * Published synchronously from {@link AuditServiceImpl#log}, consumed by
 * {@link AuditServiceImpl#onAuditLogEvent} only after the publisher's transaction commits.
 * Actor resolution happens at publish time (while the request's SecurityContext is still
 * live), not at listener time.
 */
record AuditLogEvent(String actorId, String actorUsername, String action,
                     String targetEntity, String targetId, String detail) {}
