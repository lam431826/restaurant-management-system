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

    // Manager reports use the authoritative settlement instant. A VNPAY attempt can be created
    // on one day and settle on another. Half-open [from, to) boundaries prevent adjacent periods
    // from double-counting or omitting a payment settled exactly at their shared boundary.
    @Query("SELECT p FROM Payment p WHERE p.status = 'PAID' AND p.paidAt >= :from AND p.paidAt < :to ORDER BY p.paidAt ASC")
    List<Payment> findSettledPaidBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") String id);

    // QR/VNPAY initiate idempotency: reuse an already-open PENDING transaction instead of
    // creating unlimited duplicates for the same invoice.
    Optional<Payment> findFirstByInvoiceIdAndMethodAndStatus(
            String invoiceId, PaymentMethod method, String status);

    // VNPAY Return/IPN idempotency: look up the attempt by its merchant transaction
    // reference and lock the row so concurrent/duplicate callbacks serialize.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.gatewayRef = :gatewayRef")
    Optional<Payment> findByGatewayRefForUpdate(@Param("gatewayRef") String gatewayRef);

    // Plain (non-locking) lookup for the status-polling endpoint — must not contend with
    // IPN's row lock just to read current state.
    Optional<Payment> findByGatewayRef(String gatewayRef);

    // Cross-method conflict guard: an unexpired PENDING attempt of any method (VNPAY or
    // legacy QR) must block a conflicting new attempt on the same invoice.
    Optional<Payment> findFirstByInvoiceIdAndStatusAndExpiresAtAfter(
            String invoiceId, String status, LocalDateTime now);

    // Stale-attempt cleanup: every PENDING attempt on an invoice, for QueryDR
    // reconciliation and lazy expiry before a new payment is allowed.
    List<Payment> findByInvoiceIdAndStatus(String invoiceId, String status);
}
