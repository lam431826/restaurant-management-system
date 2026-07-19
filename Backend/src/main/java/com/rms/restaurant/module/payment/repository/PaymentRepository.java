package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, String> {
    List<Payment> findByInvoiceId(String invoiceId);
    boolean existsByInvoiceId(String invoiceId);
    boolean existsByInvoiceIdIn(Collection<String> invoiceIds);
    boolean existsByInvoiceIdAndStatus(String invoiceId, String status);
    boolean existsByInvoiceIdInAndStatus(Collection<String> invoiceIds, String status);
    List<Payment> findAllByOrderByCreatedAtDesc();
    List<Payment> findByInvoiceIdOrderByCreatedAtDesc(String invoiceId);

    @Query("SELECT p FROM Payment p WHERE p.status = 'PAID' AND p.createdAt >= :from AND p.createdAt <= :to")
    List<Payment> findPaidPaymentsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
