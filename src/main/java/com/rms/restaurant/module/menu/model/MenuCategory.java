package com.rms.restaurant.module.menu.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "menu_categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MenuCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "display_order")
    private int displayOrder;

    @Column(length = 100)
    private String icon;
}
