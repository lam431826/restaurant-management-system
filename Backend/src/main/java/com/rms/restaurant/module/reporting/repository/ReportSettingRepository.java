package com.rms.restaurant.module.reporting.repository;

import com.rms.restaurant.module.reporting.model.ReportSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportSettingRepository extends JpaRepository<ReportSetting, String> {
}
