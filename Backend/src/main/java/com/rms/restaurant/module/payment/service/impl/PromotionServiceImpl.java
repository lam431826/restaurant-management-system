package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.payment.dto.CreatePromotionRequest;
import com.rms.restaurant.module.payment.dto.PromotionResponse;
import com.rms.restaurant.module.payment.dto.UpdatePromotionRequest;
import com.rms.restaurant.module.payment.mapper.PromotionMapper;
import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.repository.PromotionRepository;
import com.rms.restaurant.module.payment.service.PromotionService;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PromotionServiceImpl implements PromotionService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final PromotionRepository promotionRepository;
    private final PromotionMapper promotionMapper;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public List<PromotionResponse> getAll() {
        return promotionRepository.findAll()
                .stream()
                .map(promotionMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionResponse getById(String id) {
        return promotionMapper.toResponse(findPromotion(id));
    }

    @Override
    public PromotionResponse create(CreatePromotionRequest request) {
        validateDiscount(request.discountPercent(), request.discountAmount());
        validateValidityRange(request.validFrom(), request.validTo());
        validateUsageLimit(request.usageLimit(), 0);
        ensureCodeAvailable(request.code(), null);

        Promotion promotion = Promotion.builder()
                .code(normalizeCode(request.code()))
                .description(normalizeDescription(request.description()))
                .discountPercent(request.discountPercent())
                .discountAmount(request.discountAmount())
                .validFrom(request.validFrom())
                .validTo(request.validTo())
                .active(true)
                .usageLimit(request.usageLimit())
                .usedCount(0)
                .build();

        Promotion saved = promotionRepository.save(promotion);
        audit("PROMOTION_CREATE", saved.getId(),
                "{\"code\":\"" + esc(saved.getCode()) + "\"}");
        return promotionMapper.toResponse(saved);
    }

    @Override
    public PromotionResponse update(String id, UpdatePromotionRequest request) {
        Promotion promotion = findPromotion(id);
        validateDiscount(request.discountPercent(), request.discountAmount());
        validateValidityRange(request.validFrom(), request.validTo());
        validateUsageLimit(request.usageLimit(), promotion.getUsedCount());
        ensureCodeAvailable(request.code(), id);

        promotion.setCode(normalizeCode(request.code()));
        promotion.setDescription(normalizeDescription(request.description()));
        promotion.setDiscountPercent(request.discountPercent());
        promotion.setDiscountAmount(request.discountAmount());
        promotion.setValidFrom(request.validFrom());
        promotion.setValidTo(request.validTo());
        promotion.setUsageLimit(request.usageLimit());
        promotion.setActive(request.active() == null ? promotion.isActive() : request.active());

        Promotion saved = promotionRepository.save(promotion);
        audit("PROMOTION_UPDATE", saved.getId(),
                "{\"code\":\"" + esc(saved.getCode()) + "\",\"active\":" + saved.isActive() + "}");
        return promotionMapper.toResponse(saved);
    }

    @Override
    public void delete(String id) {
        Promotion promotion = findPromotion(id);
        promotion.setActive(false);
        Promotion saved = promotionRepository.save(promotion);
        audit("PROMOTION_DELETE", saved.getId(),
                "{\"code\":\"" + esc(saved.getCode()) + "\"}");
    }

    private Promotion findPromotion(String id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PROMOTION_NOT_FOUND));
    }

    private void ensureCodeAvailable(String code, String currentPromotionId) {
        String normalizedCode = normalizeCode(code);
        promotionRepository.findByCode(normalizedCode)
                .filter(existing -> !existing.getId().equals(currentPromotionId))
                .ifPresent(existing -> {
                    throw new ConflictException(
                            ApplicationError.INVALID_STATUS_TRANSITION,
                            "Promotion code already exists"
                    );
                });
    }

    private void validateDiscount(BigDecimal discountPercent, BigDecimal discountAmount) {
        boolean hasPercent = discountPercent != null;
        boolean hasAmount = discountAmount != null;

        if (hasPercent == hasAmount) {
            throw invalidPromotion("Provide either percent discount or fixed discount");
        }

        if (hasPercent && (discountPercent.compareTo(BigDecimal.ZERO) <= 0
                || discountPercent.compareTo(ONE_HUNDRED) > 0)) {
            throw invalidPromotion("Percent discount must be greater than 0 and less than or equal to 100");
        }

        if (hasAmount && discountAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw invalidPromotion("Fixed discount must be greater than 0");
        }
    }

    private void validateValidityRange(LocalDate validFrom, LocalDate validTo) {
        if (validFrom != null && validTo != null && !validFrom.isBefore(validTo)) {
            throw invalidPromotion("validFrom must be before validTo");
        }
    }

    private void validateUsageLimit(Integer usageLimit, int usedCount) {
        if (usageLimit != null && usageLimit < 1) {
            throw new ApplicationException(
                    ApplicationError.INVALID_PROMOTION_USAGE_LIMIT,
                    "usageLimit must be greater than or equal to 1"
            );
        }

        if (usageLimit != null && usageLimit < usedCount) {
            throw new ApplicationException(
                    ApplicationError.INVALID_PROMOTION_USAGE_LIMIT,
                    "usageLimit cannot be less than usedCount"
            );
        }
    }

    private ApplicationException invalidPromotion(String message) {
        return new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION, message);
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase();
    }

    private String normalizeDescription(String description) {
        return description == null ? "" : description.trim();
    }

    private void audit(String action, String id, String detail) {
        try { auditService.log(action, "Promotion", id, detail); }
        catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
