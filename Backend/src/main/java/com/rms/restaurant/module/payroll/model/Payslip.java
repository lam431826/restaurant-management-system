package com.rms.restaurant.module.payroll.model;

import com.rms.restaurant.common.utils.enums.PayslipStatus;
import com.rms.restaurant.common.utils.enums.SalaryPaymentStatus;
import com.rms.restaurant.common.utils.enums.SalaryType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One employee row of a payroll sheet. Employee code/name, salary type and the
 * per-record attendance breakdown (JSON) are snapshotted at computation time so a
 * FINALIZED sheet stays immutable (BR-PAY-13) and survives employee soft-delete.
 * salaryType == null means the employee had no salary setting when computed (BR-PAY-10).
 */
@Entity
@Table(name = "payslips")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payslip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "payroll_sheet_id", nullable = false, length = 36)
    private String payrollSheetId;

    @Column(name = "employee_id", nullable = false, length = 36)
    private String employeeId;

    @Column(name = "employee_code", nullable = false, length = 20)
    private String employeeCode;

    @Column(name = "employee_name", nullable = false, length = 150)
    private String employeeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "salary_type", length = 20)
    private SalaryType salaryType;

    @Builder.Default
    @Column(name = "main_salary", nullable = false, precision = 12, scale = 0)
    private BigDecimal mainSalary = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "overtime_salary", nullable = false, precision = 12, scale = 0)
    private BigDecimal overtimeSalary = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal deduction = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "main_overridden", nullable = false)
    private boolean mainOverridden = false;

    @Builder.Default
    @Column(name = "overtime_overridden", nullable = false)
    private boolean overtimeOverridden = false;

    @Builder.Default
    @Column(name = "deduction_overridden", nullable = false)
    private boolean deductionOverridden = false;

    @Builder.Default
    @Column(name = "paid_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "payment_status", nullable = false, length = 20)
    private SalaryPaymentStatus paymentStatus = SalaryPaymentStatus.UNPAID;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private PayslipStatus status = PayslipStatus.ACTIVE;

    @Builder.Default
    @Column(name = "shift_count", nullable = false)
    private int shiftCount = 0;

    @Builder.Default
    @Column(name = "worked_minutes", nullable = false)
    private int workedMinutes = 0;

    @Builder.Default
    @Column(name = "ot_minutes", nullable = false)
    private int otMinutes = 0;

    @Column(name = "attendance_snapshot", columnDefinition = "NVARCHAR(MAX)")
    private String attendanceSnapshot;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Lương thực nhận = lương chính + lương làm thêm giờ − khấu trừ tiền phạt. */
    @Transient
    public BigDecimal getTotal() {
        return mainSalary.add(overtimeSalary).subtract(deduction);
    }

    /** Còn cần trả. */
    @Transient
    public BigDecimal getRemaining() {
        return getTotal().subtract(paidAmount);
    }
}
