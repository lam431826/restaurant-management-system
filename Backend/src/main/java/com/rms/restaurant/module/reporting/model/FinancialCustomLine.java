package com.rms.restaurant.module.reporting.model;

import com.rms.restaurant.common.utils.enums.FinancialLineGroup;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** A user-defined Chi phí / Thu nhập khác line item on Báo cáo tài chính, replacing the
 * fixed placeholder sub-lines that had no domain data (everything except expPayroll). */
@Entity
@Table(name = "financial_custom_lines")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FinancialCustomLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "group_type", nullable = false, length = 20)
    private FinancialLineGroup groupType;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
