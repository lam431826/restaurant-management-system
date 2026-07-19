package com.rms.restaurant.module.attendance.repository;

import com.rms.restaurant.module.attendance.model.WorkSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, String> {

    List<WorkSchedule> findByWorkDateBetween(LocalDate start, LocalDate end);

    List<WorkSchedule> findByEmployeeIdAndWorkDate(String employeeId, LocalDate workDate);

    List<WorkSchedule> findByEmployeeIdAndWorkDateBetween(String employeeId, LocalDate start, LocalDate end);

    boolean existsByShiftId(String shiftId);

    boolean existsByEmployeeIdAndShiftIdAndWorkDate(String employeeId, String shiftId, LocalDate workDate);

    List<WorkSchedule> findByRuleId(String ruleId);

    /** Occurrences of a rule after a cutoff date that have no attendance yet — deletable on rule cancel. */
    @Query("""
            SELECT s FROM WorkSchedule s
            WHERE s.ruleId = :ruleId AND s.workDate > :after
              AND NOT EXISTS (SELECT 1 FROM AttendanceRecord r WHERE r.scheduleId = s.id)
            """)
    List<WorkSchedule> findUnattendedByRuleAfter(@Param("ruleId") String ruleId, @Param("after") LocalDate after);

    @Modifying
    @Query("DELETE FROM WorkSchedule s WHERE s.shiftId = :shiftId")
    void deleteByShiftId(@Param("shiftId") String shiftId);
}
