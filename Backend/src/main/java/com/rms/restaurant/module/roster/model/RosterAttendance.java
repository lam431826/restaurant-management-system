package com.rms.restaurant.module.roster.model;

import com.rms.restaurant.common.utils.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

// WS-03/07/08: one row per concrete (employee, date, shift) occurrence.
@Entity
@Table(name = "roster_attendance")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RosterAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "shift_template_id", nullable = false)
    private String shiftTemplateId;

    @Column(name = "assignment_id")
    private String assignmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(name = "check_in_at")
    private LocalDateTime checkInAt;

    @Column(name = "check_out_at")
    private LocalDateTime checkOutAt;

    @Column(name = "worked_minutes")
    private Integer workedMinutes;

    @Column(nullable = false)
    private boolean late;
}
