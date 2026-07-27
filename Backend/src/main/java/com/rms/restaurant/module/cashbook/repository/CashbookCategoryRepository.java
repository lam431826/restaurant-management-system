package com.rms.restaurant.module.cashbook.repository;

import com.rms.restaurant.module.cashbook.model.CashbookCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CashbookCategoryRepository extends JpaRepository<CashbookCategory, String> {

    Optional<CashbookCategory> findByCode(String code);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, String id);

    /** Manager-created categories (system-reserved ones like SALARY_PAYMENT/SALES_RECEIPT always
     * have a non-null code) flagged as counting toward P&L — the set that surfaces as dynamic
     * "Chi phí (6)"/"Thu nhập khác (8)" sub-lines on the financial report (see ReportServiceImpl). */
    List<CashbookCategory> findByCodeIsNullAndAccountingToIncomeTrueOrderByNameAsc();
}
