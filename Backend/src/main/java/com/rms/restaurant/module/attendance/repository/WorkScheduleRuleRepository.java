package com.rms.restaurant.module.attendance.repository;

import com.rms.restaurant.module.attendance.model.WorkScheduleRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleRuleRepository extends JpaRepository<WorkScheduleRule, String> {

    /** Endless rules whose materialization window has fallen behind (BR-AT-04). */
    List<WorkScheduleRule> findByEndDateIsNullAndGeneratedUntilBefore(LocalDate horizon);

    List<WorkScheduleRule> findByShiftId(String shiftId);
}
