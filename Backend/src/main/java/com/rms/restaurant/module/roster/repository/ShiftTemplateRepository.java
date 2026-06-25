package com.rms.restaurant.module.roster.repository;

import com.rms.restaurant.module.roster.model.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, String> {
    boolean existsByNameIgnoreCaseAndIdNot(String name, String id);
    boolean existsByNameIgnoreCase(String name);
}
