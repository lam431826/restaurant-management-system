package com.rms.restaurant.module.payment.mapper;

import com.rms.restaurant.module.payment.dto.PromotionResponse;
import com.rms.restaurant.module.payment.model.Promotion;
import org.springframework.stereotype.Component;

@Component
public class PromotionMapper {

    public PromotionResponse toResponse(Promotion promotion) {
        return new PromotionResponse(
                promotion.getId(),
                promotion.getCode(),
                promotion.getDescription(),
                promotion.getDiscountPercent(),
                promotion.getDiscountAmount(),
                promotion.getValidFrom(),
                promotion.getValidTo(),
                promotion.isActive()
        );
    }
}
