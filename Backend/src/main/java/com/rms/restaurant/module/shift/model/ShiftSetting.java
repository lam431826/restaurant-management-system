package com.rms.restaurant.module.shift.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Cashier shift ("Kết ca") configuration singleton — exactly one row, seeded by V57
 * with FIXED_ID.
 */
@Entity
@Table(name = "shift_settings")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftSetting {

    public static final String FIXED_ID = "b0000000-0000-0000-0000-000000000001";

    @Id
    private String id;

    @Builder.Default
    @Column(name = "shift_closing_required", nullable = false)
    private boolean shiftClosingRequired = true;

    @Builder.Default
    @Column(name = "manager_confirm_closing", nullable = false)
    private boolean managerConfirmClosing = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
