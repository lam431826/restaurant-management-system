package com.rms.restaurant.module.payroll.repository;

import com.rms.restaurant.module.payroll.model.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PayslipRepository extends JpaRepository<Payslip, String> {

    List<Payslip> findByPayrollSheetIdOrderByEmployeeCode(String payrollSheetId);

    List<Payslip> findByPayrollSheetIdIn(List<String> payrollSheetIds);

    /** UC-PAY-09: an employee's payslips on FINALIZED sheets, newest first. */
    @Query("SELECT p FROM Payslip p JOIN PayrollSheet s ON s.id = p.payrollSheetId " +
           "WHERE p.employeeId = :employeeId AND s.status = com.rms.restaurant.common.utils.enums.PayrollSheetStatus.FINALIZED " +
           "ORDER BY s.periodStart DESC, p.createdAt DESC")
    List<Payslip> findFinalizedByEmployee(@Param("employeeId") String employeeId);

    @Query("SELECT MAX(p.code) FROM Payslip p WHERE p.code LIKE 'PL%'")
    Optional<String> findMaxCode();
}
