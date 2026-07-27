package com.rms.restaurant.module.shift.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    // BR-CS-14: business date this shift rolls up to, assigned at open via the
    // configurable business-day cutoff (default 05:00) — not calendar midnight.
    @Column(name = "business_date")
    private LocalDate businessDate;

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

    @Column(length = 30)
    private String status;

    // Always "NORMAL" now; floating-shift support (BR-CS-18/19) was removed. Column kept
    // (not dropped) so historical rows and the JSON contract are unaffected.
    @Column(name = "shift_type", length = 20)
    private String shiftType;

    @Column(name = "closed_by")
    private String closedBy;

    @Column(name = "handover_amount", precision = 12, scale = 0)
    private BigDecimal handoverAmount;

    // BR-CS-12: optional card POS batch total entered at close — informational
    // cross-check only; never produces a discrepancy and never blocks closing.
    @Column(name = "card_batch_total", precision = 12, scale = 0)
    private BigDecimal cardBatchTotal;

    @Column(name = "closing_note", length = 500)
    private String closingNote;
}
