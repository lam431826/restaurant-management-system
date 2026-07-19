package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.module.payment.model.Invoice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("SELECT i.orderId FROM Invoice i WHERE i.id = :id")
    Optional<String> findOrderIdById(@Param("id") String id);

    @Query("SELECT i.id AS id, i.orderId AS orderId FROM Invoice i "
            + "WHERE i.id IN :ids ORDER BY i.id ASC")
    List<InvoiceOrderProjection> findOrderIdsByIds(@Param("ids") List<String> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id IN :ids ORDER BY i.id ASC")
    List<Invoice> findAllByIdsForUpdate(@Param("ids") List<String> ids);
}
