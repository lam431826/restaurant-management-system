package com.rms.restaurant.module.attendance.repository;

import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceSettingRepository extends JpaRepository<AttendanceSetting, String> {
}
