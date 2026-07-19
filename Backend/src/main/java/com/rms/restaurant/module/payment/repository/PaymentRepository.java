package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.module.payment.model.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {
    List<Payment> findByInvoiceId(String invoiceId);
    boolean existsByInvoiceId(String invoiceId);
    boolean existsByInvoiceIdIn(Collection<String> invoiceIds);
    boolean existsByInvoiceIdAndStatus(String invoiceId, String status);
    boolean existsByInvoiceIdInAndStatus(Collection<String> invoiceIds, String status);
    List<Payment> findAllByOrderByCreatedAtDesc();
    List<Payment> findByInvoiceIdOrderByCreatedAtDesc(String invoiceId);

    // BR-CS-08: payments attributed to a specific shift (revenue by ownership)
    List<Payment> findByShiftIdAndStatus(String shiftId, String status);

    @Query("SELECT p FROM Payment p WHERE p.status = 'PAID' AND p.createdAt >= :from AND p.createdAt <= :to")
    List<Payment> findPaidPaymentsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") String id);

    // QR initiate idempotency: reuse an already-open PENDING transaction instead of
    // creating unlimited duplicates for the same invoice.
    Optional<Payment> findFirstByInvoiceIdAndMethodAndStatus(
            String invoiceId, PaymentMethod method, String status);
}
