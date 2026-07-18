package com.rms.restaurant.module.attendance.repository;

import com.rms.restaurant.module.attendance.model.ViolationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ViolationTypeRepository extends JpaRepository<ViolationType, String> {

    List<ViolationType> findByDeletedFalseOrderByName();
}
