package com.rms.restaurant.module.payroll.repository;

import com.rms.restaurant.module.payroll.model.PayslipPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PayslipPaymentRepository extends JpaRepository<PayslipPayment, String> {

    List<PayslipPayment> findByPayslipIdOrderByPaidAtDesc(String payslipId);

    List<PayslipPayment> findByPayslipIdInOrderByPaidAtDesc(List<String> payslipIds);

    boolean existsByPayslipId(String payslipId);
}
