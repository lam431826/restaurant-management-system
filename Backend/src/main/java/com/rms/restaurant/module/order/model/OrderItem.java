package com.rms.restaurant.module.order.model;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "menu_item_id", nullable = false)
    private String menuItemId;

    @Column(name = "menu_item_name", nullable = false, length = 200)
    private String menuItemName;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal unitPrice;

    @Column(length = 300)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "cooking_status", length = 20)
    private CookingStatus cookingStatus = CookingStatus.PENDING;
}
