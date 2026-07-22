package com.rms.restaurant.module.reporting.repository;

import com.rms.restaurant.common.utils.enums.FinancialLineGroup;
import com.rms.restaurant.module.reporting.model.FinancialCustomLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FinancialCustomLineRepository extends JpaRepository<FinancialCustomLine, String> {
    List<FinancialCustomLine> findAllByOrderByGroupTypeAscSortOrderAsc();

    int countByGroupType(FinancialLineGroup groupType);
}
