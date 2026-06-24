package com.rms.restaurant.module.table.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "table_areas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TableArea {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 255)
    private String note;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;
}
