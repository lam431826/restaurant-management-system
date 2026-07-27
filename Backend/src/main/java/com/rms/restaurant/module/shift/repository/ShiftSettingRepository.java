package com.rms.restaurant.module.shift.repository;

import com.rms.restaurant.module.shift.model.ShiftSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftSettingRepository extends JpaRepository<ShiftSetting, String> {
}
