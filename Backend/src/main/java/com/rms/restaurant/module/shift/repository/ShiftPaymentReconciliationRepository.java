package com.rms.restaurant.module.shift.repository;

import com.rms.restaurant.module.shift.model.ShiftPaymentReconciliation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftPaymentReconciliationRepository extends JpaRepository<ShiftPaymentReconciliation, String> {
    List<ShiftPaymentReconciliation> findByShiftId(String shiftId);
}
