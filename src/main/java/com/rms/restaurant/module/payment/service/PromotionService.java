package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.CreatePromotionRequest;
import com.rms.restaurant.module.payment.dto.PromotionResponse;
import com.rms.restaurant.module.payment.dto.UpdatePromotionRequest;

import java.util.List;

public interface PromotionService {
    List<PromotionResponse> getAll();
    PromotionResponse getById(String id);
    PromotionResponse create(CreatePromotionRequest request);
    PromotionResponse update(String id, UpdatePromotionRequest request);
    void delete(String id);
}
