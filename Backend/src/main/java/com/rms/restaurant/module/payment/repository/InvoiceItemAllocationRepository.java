package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface InvoiceItemAllocationRepository extends JpaRepository<InvoiceItemAllocation, String> {

    List<InvoiceItemAllocation> findAllByInvoiceIdAndActiveTrueOrderByCreatedAtAscIdAsc(String invoiceId);

    List<InvoiceItemAllocation> findAllByInvoiceIdOrderByCreatedAtAscIdAsc(String invoiceId);

    @Query("SELECT a FROM InvoiceItemAllocation a "
            + "WHERE a.invoiceId IN :invoiceIds "
            + "ORDER BY a.invoiceId ASC, a.createdAt ASC, a.id ASC")
    List<InvoiceItemAllocation> findAllByInvoiceIds(@Param("invoiceIds") Collection<String> invoiceIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM InvoiceItemAllocation a "
            + "WHERE a.orderItemId IN :orderItemIds AND a.active = true "
            + "ORDER BY a.orderItemId ASC, a.id ASC")
    List<InvoiceItemAllocation> findActiveByOrderItemIdsForUpdate(
            @Param("orderItemIds") Collection<String> orderItemIds
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM InvoiceItemAllocation a "
            + "WHERE a.invoiceId = :invoiceId AND a.active = true "
            + "ORDER BY a.orderItemId ASC, a.id ASC")
    List<InvoiceItemAllocation> findActiveByInvoiceIdForUpdate(@Param("invoiceId") String invoiceId);
}
