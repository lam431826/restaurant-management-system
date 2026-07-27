package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.payment.dto.CreatePromotionRequest;
import com.rms.restaurant.module.payment.dto.PromotionResponse;
import com.rms.restaurant.module.payment.dto.UpdatePromotionRequest;
import org.springframework.data.domain.Pageable;

public interface PromotionService {
    PageResponse<PromotionResponse> getAll(Pageable pageable);
    PromotionResponse getById(String id);
    PromotionResponse create(CreatePromotionRequest request);
    PromotionResponse update(String id, UpdatePromotionRequest request);
    void delete(String id);
}
