package com.rms.restaurant.module.payroll.model;

import com.rms.restaurant.common.utils.enums.SalaryPaymentMethod;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BR-PAY-16/17: one salary payout against a payslip. voucherCode (PC%06d) is minted by the
 * Cash Book (Sổ quỹ) module via CashbookService.createSystemVoucher.
 */
@Entity
@Table(name = "payslip_payments")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayslipPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "payslip_id", nullable = false, length = 36)
    private String payslipId;

    @Column(name = "voucher_code", nullable = false, unique = true, length = 20)
    private String voucherCode;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SalaryPaymentMethod method;

    @Column(name = "paid_at", nullable = false)
    private LocalDateTime paidAt;

    @Column(length = 500)
    private String note;

    @Column(name = "created_by", length = 150)
    private String createdBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
