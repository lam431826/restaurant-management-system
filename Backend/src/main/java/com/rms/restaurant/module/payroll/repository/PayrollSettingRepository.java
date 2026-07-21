package com.rms.restaurant.module.payroll.repository;

import com.rms.restaurant.module.payroll.model.PayrollSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollSettingRepository extends JpaRepository<PayrollSetting, String> {
}
