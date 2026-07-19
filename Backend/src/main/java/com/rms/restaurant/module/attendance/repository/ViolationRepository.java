package com.rms.restaurant.module.attendance.repository;

import com.rms.restaurant.module.attendance.model.Violation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface ViolationRepository extends JpaRepository<Violation, String> {

    List<Violation> findByAttendanceRecordId(String attendanceRecordId);

    List<Violation> findByAttendanceRecordIdIn(Collection<String> recordIds);

    void deleteByAttendanceRecordId(String attendanceRecordId);

    boolean existsByViolationTypeId(String violationTypeId);

    /** BR-AT-12: total penalty of one employee in a period = sum(count x appliedPenalty). */
    @Query("""
            SELECT COALESCE(SUM(v.count * v.appliedPenalty), 0) FROM Violation v
            JOIN AttendanceRecord r ON r.id = v.attendanceRecordId
            JOIN WorkSchedule s ON s.id = r.scheduleId
            WHERE s.employeeId = :employeeId AND s.workDate BETWEEN :start AND :end
            """)
    BigDecimal totalPenaltyForEmployee(@Param("employeeId") String employeeId,
                                       @Param("start") LocalDate start,
                                       @Param("end") LocalDate end);
}
