package com.rms.restaurant.module.cashbook.repository;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.module.cashbook.model.CashbookOpeningBalance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashbookOpeningBalanceRepository extends JpaRepository<CashbookOpeningBalance, CashFlowMethod> {
}
