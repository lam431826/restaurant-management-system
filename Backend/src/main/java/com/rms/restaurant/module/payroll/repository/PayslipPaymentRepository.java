package com.rms.restaurant.module.payroll.repository;

import com.rms.restaurant.module.payroll.model.PayslipPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PayslipPaymentRepository extends JpaRepository<PayslipPayment, String> {

    List<PayslipPayment> findByPayslipIdOrderByPaidAtDesc(String payslipId);

    List<PayslipPayment> findByPayslipIdInOrderByPaidAtDesc(List<String> payslipIds);

    boolean existsByPayslipId(String payslipId);

    @Query("SELECT MAX(pp.voucherCode) FROM PayslipPayment pp WHERE pp.voucherCode LIKE 'PC%'")
    Optional<String> findMaxVoucherCode();
}
