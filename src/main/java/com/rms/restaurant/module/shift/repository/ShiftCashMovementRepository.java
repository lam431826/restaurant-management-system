package com.rms.restaurant.module.shift.repository;

import com.rms.restaurant.module.shift.model.ShiftCashMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftCashMovementRepository extends JpaRepository<ShiftCashMovement, String> {
    List<ShiftCashMovement> findByShiftId(String shiftId);
}
