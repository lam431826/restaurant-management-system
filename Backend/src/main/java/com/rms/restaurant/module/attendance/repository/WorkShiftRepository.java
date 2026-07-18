package com.rms.restaurant.module.attendance.repository;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.module.attendance.model.WorkShift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkShiftRepository extends JpaRepository<WorkShift, String> {

    List<WorkShift> findByStatusOrderByStartTime(WorkShiftStatus status);

    List<WorkShift> findAllByOrderByStartTime();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, String id);
}
