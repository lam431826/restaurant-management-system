package com.rms.restaurant.module.roster.repository;

import com.rms.restaurant.common.utils.enums.AttendanceStatus;
import com.rms.restaurant.module.roster.model.RosterAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RosterAttendanceRepository extends JpaRepository<RosterAttendance, String> {
    Optional<RosterAttendance> findByEmployeeIdAndWorkDateAndShiftTemplateId(
            String employeeId, LocalDate workDate, String shiftTemplateId);

    List<RosterAttendance> findByEmployeeIdAndWorkDateBetween(String employeeId, LocalDate from, LocalDate to);

    List<RosterAttendance> findByWorkDateBetween(LocalDate from, LocalDate to);

    // BR-X-01: check cashier is CHECKED_IN on today's work shift
    boolean existsByEmployeeIdAndWorkDateAndStatus(
            String employeeId, LocalDate workDate, AttendanceStatus status);
}
