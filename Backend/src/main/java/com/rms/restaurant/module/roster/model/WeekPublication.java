package com.rms.restaurant.module.roster.model;

import com.rms.restaurant.common.utils.enums.WeekStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

// WS-02/BR-WS-03/04: DRAFT (manager-only) until PUBLISHED (visible to staff). Keyed by Monday.
@Entity
@Table(name = "roster_week_publications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WeekPublication {

    @Id
    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WeekStatus status;

    @Column(nullable = false)
    private int version;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;
}
