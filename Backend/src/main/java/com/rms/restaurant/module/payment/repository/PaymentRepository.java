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
    List<Payment> findByInvoiceIdIn(List<String> invoiceIds);
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

    // Manager dashboard only — anchored on the authoritative SETTLEMENT instant (paidAt), not
    // attempt creation time: a VNPAY payment can be created on one day and settle (Return/IPN,
    // or a later QueryDR catch-up) on another, and revenue belongs to when the money actually
    // landed. Half-open [from, to): `to` is exclusive so a period boundary can never double-count
    // or omit a payment settled at that exact instant — unlike findPaidPaymentsBetween above
    // (creation-time, inclusive-both-ends, currently unused) or InvoiceRepository.findPaidBetween
    // (creation-time, inclusive-both-ends, shared by the Financial/EOD reports — left untouched).
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
