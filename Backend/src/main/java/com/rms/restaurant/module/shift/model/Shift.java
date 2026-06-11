package com.rms.restaurant.module.shift.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "shifts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "cashier_id", nullable = false)
    private String cashierId;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "opening_cash", nullable = false, precision = 12, scale = 0)
    private BigDecimal openingCash;

    @Column(name = "closing_cash", precision = 12, scale = 0)
    private BigDecimal closingCash;

    @Column(name = "total_revenue", precision = 12, scale = 0)
    private BigDecimal totalRevenue;

    @Column(length = 20)
    private String status;

    @Column(name = "closed_by")
    private String closedBy;

    @Column(name = "closing_note", length = 500)
    private String closingNote;
}
