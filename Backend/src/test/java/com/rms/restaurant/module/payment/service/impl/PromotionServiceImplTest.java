package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.payment.dto.CreatePromotionRequest;
import com.rms.restaurant.module.payment.dto.UpdatePromotionRequest;
import com.rms.restaurant.module.payment.mapper.PromotionMapper;
import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.repository.PromotionRepository;
import com.rms.restaurant.module.user.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionServiceImplTest {

    @Mock private PromotionRepository promotionRepository;
    @Mock private AuditService auditService;

    private PromotionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PromotionServiceImpl(promotionRepository, new PromotionMapper(), auditService);
    }

    @Test
    void createNormalizesCodeAndPersistsOneDiscountType() {
        CreatePromotionRequest request = new CreatePromotionRequest(
                " save10 ", " Giảm 10% ", BigDecimal.TEN, null,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 8, 1), 100);
        when(promotionRepository.findByCode("SAVE10")).thenReturn(Optional.empty());
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(invocation -> {
            Promotion saved = invocation.getArgument(0);
            saved.setId("promotion-1");
            return saved;
        });

        var response = service.create(request);

        assertThat(response.code()).isEqualTo("SAVE10");
        assertThat(response.description()).isEqualTo("Giảm 10%");
        assertThat(response.discountPercent()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(response.discountAmount()).isNull();
        assertThat(response.active()).isTrue();
        assertThat(response.usedCount()).isZero();
        assertThat(response.remainingUses()).isEqualTo(100);
    }

    @Test
    void createRejectsAmbiguousPercentAndFixedDiscount() {
        CreatePromotionRequest request = new CreatePromotionRequest(
                "SAVE10", "Không hợp lệ", BigDecimal.TEN, BigDecimal.valueOf(10_000),
                null, null, null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ApplicationException.class)
                .extracting(error -> ((ApplicationException) error).getError())
                .isEqualTo(ApplicationError.INVALID_STATUS_TRANSITION);

        verify(promotionRepository, never()).save(any(Promotion.class));
    }

    @Test
    void updateRejectsUsageLimitBelowAlreadyConsumedUses() {
        Promotion promotion = Promotion.builder()
                .id("promotion-1")
                .code("SAVE10")
                .description("Giảm 10%")
                .discountPercent(BigDecimal.TEN)
                .active(true)
                .usageLimit(10)
                .usedCount(5)
                .build();
        UpdatePromotionRequest request = new UpdatePromotionRequest(
                "SAVE10", "Giảm 10%", BigDecimal.TEN, null,
                null, null, 4, true);
        when(promotionRepository.findByIdForUpdate(promotion.getId())).thenReturn(Optional.of(promotion));

        assertThatThrownBy(() -> service.update(promotion.getId(), request))
                .isInstanceOf(ApplicationException.class)
                .extracting(error -> ((ApplicationException) error).getError())
                .isEqualTo(ApplicationError.INVALID_PROMOTION_USAGE_LIMIT);

        verify(promotionRepository).findByIdForUpdate(promotion.getId());
        verify(promotionRepository, never()).findById(promotion.getId());
        verify(promotionRepository, never()).save(any(Promotion.class));
    }

    @Test
    void deleteSoftDeactivatesPromotion() {
        Promotion promotion = Promotion.builder()
                .id("promotion-1")
                .code("SAVE10")
                .description("Giảm 10%")
                .discountPercent(BigDecimal.TEN)
                .active(true)
                .usedCount(2)
                .build();
        when(promotionRepository.findByIdForUpdate(promotion.getId())).thenReturn(Optional.of(promotion));
        when(promotionRepository.save(promotion)).thenReturn(promotion);

        service.delete(promotion.getId());

        assertThat(promotion.isActive()).isFalse();
        verify(promotionRepository).save(promotion);
    }

    @Test
    void deleteLocksPromotionSoConcurrentUsageCannotBeOverwritten() {
        Promotion promotion = Promotion.builder()
                .id("promotion-1")
                .code("SAVE10")
                .discountPercent(BigDecimal.TEN)
                .active(true)
                .usedCount(2)
                .build();
        when(promotionRepository.findByIdForUpdate(promotion.getId()))
                .thenReturn(Optional.of(promotion));
        when(promotionRepository.save(promotion)).thenReturn(promotion);

        service.delete(promotion.getId());

        verify(promotionRepository).findByIdForUpdate(promotion.getId());
        verify(promotionRepository, never()).findById(promotion.getId());
    }
}
