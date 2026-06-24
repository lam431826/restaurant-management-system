package com.rms.restaurant.module.table.model;

import com.rms.restaurant.common.utils.enums.TableStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "restaurant_tables")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RestaurantTable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 20)
    private String name;

    @Column(nullable = false)
    private int capacity;

    @Column(length = 50)
    private String area;

    @Column(length = 255)
    private String note;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TableStatus status;

    @Column(name = "qr_token", unique = true, length = 200)
    private String qrToken;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
