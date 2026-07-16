package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
