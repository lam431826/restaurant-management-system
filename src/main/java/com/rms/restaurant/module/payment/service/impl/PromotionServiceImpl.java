package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class PromotionServiceImpl implements PromotionService {

    @Override public Promotion getByCode(String code) { return null; }
}
