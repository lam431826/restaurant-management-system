package com.rms.restaurant.module.employee.model;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmployeeStatus status;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "timekeep_code", length = 50)
    private String timekeepCode;

    @Column(length = 1000)
    private String note;

    @Column(name = "id_number", length = 30)
    private String idNumber;

    private LocalDate birthday;

    @Column(length = 10)
    private String gender;

    @Column(length = 300)
    private String address;

    @Column(length = 150)
    private String email;

    // Uniqueness enforced by a filtered index (uq_employees_user_id, V29) rather than a
    // plain column constraint, since SQL Server allows only one NULL per UNIQUE column.
    @Column(name = "user_id", length = 36)
    private String userId;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
