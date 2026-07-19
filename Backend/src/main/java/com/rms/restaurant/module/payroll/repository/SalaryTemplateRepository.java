package com.rms.restaurant.module.payroll.repository;

import com.rms.restaurant.module.payroll.model.SalaryTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalaryTemplateRepository extends JpaRepository<SalaryTemplate, String> {
    List<SalaryTemplate> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, String id);
}
