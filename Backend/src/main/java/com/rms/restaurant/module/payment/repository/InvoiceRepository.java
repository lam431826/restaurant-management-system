package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.Invoice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    Optional<Invoice> findByOrderId(String orderId);
    List<Invoice> findAllByOrderByCreatedAtDesc();
    List<Invoice> findByPaidOrderByCreatedAtDesc(boolean paid);
    List<Invoice> findByOrderIdOrderByCreatedAtDesc(String orderId);
    List<Invoice> findByOrderIdAndPaidOrderByCreatedAtDesc(String orderId, boolean paid);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") String id);

    // Báo cáo cuối ngày: paid invoices within a datetime window, oldest first.
    @Query("SELECT i FROM Invoice i WHERE i.paid = true AND i.createdAt >= :from AND i.createdAt <= :to ORDER BY i.createdAt ASC")
    List<Invoice> findPaidBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
