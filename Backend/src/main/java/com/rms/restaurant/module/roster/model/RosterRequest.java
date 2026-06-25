package com.rms.restaurant.module.roster.model;

import com.rms.restaurant.common.utils.enums.ShiftRequestStatus;
import com.rms.restaurant.common.utils.enums.ShiftRequestType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

// WS-05/06: staff-initiated swap/leave request awaiting manager approval.
@Entity
@Table(name = "roster_requests")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RosterRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ShiftRequestType type;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "shift_template_id", nullable = false)
    private String shiftTemplateId;

    @Column(name = "assignment_id", nullable = false)
    private String assignmentId;

    @Column(name = "target_employee_id")
    private String targetEmployeeId;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShiftRequestStatus status;

    @Column(name = "manager_note", length = 500)
    private String managerNote;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
