package com.rms.restaurant.module.user.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "actor_id", nullable = false)
    private String actorId;

    @Column(name = "actor_username", nullable = false, length = 100)
    private String actorUsername;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "target_entity", length = 100)
    private String targetEntity;

    @Column(name = "target_id", length = 36)
    private String targetId;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String detail;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
