package com.rms.restaurant.module.employee.repository;

import com.rms.restaurant.module.employee.model.SalarySetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SalarySettingRepository extends JpaRepository<SalarySetting, String> {

    Optional<SalarySetting> findByEmployeeId(String employeeId);
}
