package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.model.Promotion;

public interface PromotionService {
    Promotion getByCode(String code);
}
