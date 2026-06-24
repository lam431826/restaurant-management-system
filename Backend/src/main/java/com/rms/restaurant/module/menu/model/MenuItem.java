package com.rms.restaurant.module.menu.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "menu_items")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(length = 50)
    private String code;

    @Column(name = "category_id", nullable = false)
    private String categoryId;

    @Column(nullable = false, columnDefinition = "NVARCHAR(200)")
    private String name;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal price;

    @Column(name = "cost_price", precision = 12, scale = 0)
    private BigDecimal costPrice;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "menu_type", length = 50)
    private String menuType;

    @Column(name = "item_type", length = 50)
    private String itemType;

    @Column(length = 50)
    private String tag;

    @Builder.Default
    @Column(name = "track_stock", nullable = false)
    private boolean trackStock = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean available = true;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
