package com.rms.restaurant.module.attendance.repository;

import com.rms.restaurant.module.attendance.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, String> {

    Optional<AttendanceRecord> findByScheduleId(String scheduleId);

    List<AttendanceRecord> findByScheduleIdIn(Collection<String> scheduleIds);

    /** BR-AT-02: a shift with any attendance data can only be deactivated, never deleted. */
    @Query("""
            SELECT COUNT(r) > 0 FROM AttendanceRecord r
            WHERE r.scheduleId IN (SELECT s.id FROM WorkSchedule s WHERE s.shiftId = :shiftId)
            """)
    boolean existsForShift(@Param("shiftId") String shiftId);

    /** One employee's records in a period, joined with schedule for date/shift (payroll feed, BR-AT-13). */
    @Query("""
            SELECT r, s FROM AttendanceRecord r
            JOIN WorkSchedule s ON s.id = r.scheduleId
            WHERE s.employeeId = :employeeId AND s.workDate BETWEEN :start AND :end
            ORDER BY s.workDate
            """)
    List<Object[]> findWithScheduleForEmployee(@Param("employeeId") String employeeId,
                                               @Param("start") LocalDate start,
                                               @Param("end") LocalDate end);
}
