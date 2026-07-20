package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.module.payment.model.Invoice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    interface InvoiceOrderProjection {
        String getId();
        String getOrderId();
    }

    boolean existsByOrderId(String orderId);
    List<Invoice> findAllByOrderByCreatedAtDesc();
    List<Invoice> findByPaidOrderByCreatedAtDesc(boolean paid);
    List<Invoice> findByOrderIdOrderByCreatedAtDesc(String orderId);
    List<Invoice> findByOrderIdAndPaidOrderByCreatedAtDesc(String orderId, boolean paid);
    List<Invoice> findAllByOrderByCreatedAtDescIdDesc();
    List<Invoice> findByPaidOrderByCreatedAtDescIdDesc(boolean paid);
    List<Invoice> findByOrderIdOrderByCreatedAtDescIdDesc(String orderId);
    List<Invoice> findByOrderIdAndPaidOrderByCreatedAtDescIdDesc(String orderId, boolean paid);
    List<Invoice> findByOrderIdAndStatusOrderByCreatedAtAscIdAsc(String orderId, InvoiceStatus status);

    // Manager lifecycle-scoped list queries. Filtering happens in the database so the
    // Manager Invoice screen never receives rows outside the requested lifecycle set.
    List<Invoice> findByStatusInOrderByCreatedAtDescIdDesc(Collection<InvoiceStatus> statuses);

    List<Invoice> findByPaidAndStatusInOrderByCreatedAtDescIdDesc(
            boolean paid,
            Collection<InvoiceStatus> statuses
    );

    List<Invoice> findByOrderIdAndStatusInOrderByCreatedAtDescIdDesc(
            String orderId,
            Collection<InvoiceStatus> statuses
    );

    List<Invoice> findByOrderIdAndPaidAndStatusInOrderByCreatedAtDescIdDesc(
            String orderId,
            boolean paid,
            Collection<InvoiceStatus> statuses
    );

    // Reverse lineage lookups, used only when a single invoice detail is opened.
    List<Invoice> findBySplitFromInvoiceIdOrderByCreatedAtAscIdAsc(String splitFromInvoiceId);

    List<Invoice> findByMergedIntoInvoiceIdOrderByCreatedAtAscIdAsc(String mergedIntoInvoiceId);

    @Query("SELECT i.orderId FROM Invoice i WHERE i.id = :id")
    Optional<String> findOrderIdById(@Param("id") String id);

    @Query("SELECT i.id AS id, i.orderId AS orderId FROM Invoice i "
            + "WHERE i.id IN :ids ORDER BY i.id ASC")
    List<InvoiceOrderProjection> findOrderIdsByIds(@Param("ids") List<String> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") String id);

    // Báo cáo cuối ngày: paid invoices within a datetime window, oldest first.
    @Query("SELECT i FROM Invoice i WHERE i.paid = true AND i.createdAt >= :from AND i.createdAt <= :to ORDER BY i.createdAt ASC")
    List<Invoice> findPaidBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id IN :ids ORDER BY i.id ASC")
    List<Invoice> findAllByIdsForUpdate(@Param("ids") List<String> ids);
}
