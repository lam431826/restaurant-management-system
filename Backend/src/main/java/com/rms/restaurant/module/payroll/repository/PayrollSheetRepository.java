package com.rms.restaurant.module.payroll.repository;

import com.rms.restaurant.common.utils.enums.PayrollSheetStatus;
import com.rms.restaurant.common.utils.enums.PayrollTerm;
import com.rms.restaurant.module.payroll.model.PayrollSheet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PayrollSheetRepository extends JpaRepository<PayrollSheet, String> {

    /**
     * BR-PAY-06: free-text search partially matches (case-insensitive substring) the sheet
     * code/name OR the code/name of any employee included in the sheet (via its payslips).
     * Callers must always pass a non-empty status list (default = all statuses) — JPQL
     * cannot null-check a list.
     */
    @Query("SELECT s FROM PayrollSheet s WHERE " +
           "(:q IS NULL OR LOWER(s.code) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%')) OR EXISTS (" +
           "    SELECT 1 FROM Payslip p WHERE p.payrollSheetId = s.id AND " +
           "    (LOWER(p.employeeCode) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.employeeName) LIKE LOWER(CONCAT('%', :q, '%'))))) AND " +
           "(:term IS NULL OR s.payTerm = :term) AND " +
           "s.status IN :statuses")
    Page<PayrollSheet> search(@Param("q") String q,
                              @Param("term") PayrollTerm term,
                              @Param("statuses") List<PayrollSheetStatus> statuses,
                              Pageable pageable);

    @Query("SELECT MAX(s.code) FROM PayrollSheet s WHERE s.code LIKE 'BL%'")
    Optional<String> findMaxCode();

    /** Báo cáo tài chính (accrual basis): FINALIZED sheets whose accrual period overlaps
     * [from, to] at all, for attributing payroll expense to the calendar month/quarter/year
     * containing each sheet's periodEnd. */
    @Query("SELECT s FROM PayrollSheet s WHERE s.status = com.rms.restaurant.common.utils.enums.PayrollSheetStatus.FINALIZED " +
           "AND s.periodStart <= :to AND s.periodEnd >= :from")
    List<PayrollSheet> findFinalizedOverlapping(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
