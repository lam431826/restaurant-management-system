package com.rms.restaurant.module.cashbook.repository;

import com.rms.restaurant.module.cashbook.model.CashbookCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CashbookCategoryRepository extends JpaRepository<CashbookCategory, String> {

    Optional<CashbookCategory> findByCode(String code);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, String id);
}
