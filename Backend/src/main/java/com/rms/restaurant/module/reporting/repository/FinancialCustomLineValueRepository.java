package com.rms.restaurant.module.reporting.repository;

import com.rms.restaurant.module.reporting.model.FinancialCustomLineValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancialCustomLineValueRepository extends JpaRepository<FinancialCustomLineValue, String> {
    List<FinancialCustomLineValue> findByCustomLineIdInAndYear(List<String> customLineIds, int year);

    Optional<FinancialCustomLineValue> findByCustomLineIdAndYearAndMonth(String customLineId, int year, int month);
}
