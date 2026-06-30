package com.rms.restaurant.module.roster.repository;

import com.rms.restaurant.module.roster.model.RosterAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RosterAssignmentRepository extends JpaRepository<RosterAssignment, String> {
    List<RosterAssignment> findByEmployeeId(String employeeId);
    boolean existsByShiftTemplateId(String shiftTemplateId);
}
