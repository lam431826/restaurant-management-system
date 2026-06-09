package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PromotionRepository extends JpaRepository<Promotion, String> {
    Optional<Promotion> findByCodeAndActiveTrue(String code);
}
