package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, String> {
    List<Payment> findByInvoiceId(String invoiceId);
    List<Payment> findByInvoiceIdIn(List<String> invoiceIds);
    List<Payment> findAllByOrderByCreatedAtDesc();
    List<Payment> findByInvoiceIdOrderByCreatedAtDesc(String invoiceId);

    // BR-CS-08: payments attributed to a specific shift (revenue by ownership)
    List<Payment> findByShiftIdAndStatus(String shiftId, String status);

    @Query("SELECT p FROM Payment p WHERE p.status = 'PAID' AND p.createdAt >= :from AND p.createdAt <= :to")
    List<Payment> findPaidPaymentsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
