package com.rms.restaurant.common.codegen;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Generates persistent, human-readable business codes for Orders ("DH000001") and
 * Invoices ("HD000001"), mirroring the Employee "NV000001" format. Unlike Employee's own
 * generateNextCode() (a MAX(existing)+1 read in application code, unsafe under concurrent
 * creation), each code here is drawn from a dedicated SQL Server SEQUENCE (see V44):
 * NEXT VALUE FOR is atomic and never returns the same value twice to concurrent callers,
 * regardless of transaction isolation.
 */
@Component
@RequiredArgsConstructor
public class BusinessCodeGenerator {

    private static final String ORDER_PREFIX = "DH";
    private static final String INVOICE_PREFIX = "HD";

    private final EntityManager entityManager;

    public String nextOrderCode() {
        return ORDER_PREFIX + pad(nextSequenceValue("SELECT NEXT VALUE FOR dbo.order_code_seq"));
    }

    public String nextInvoiceCode() {
        return INVOICE_PREFIX + pad(nextSequenceValue("SELECT NEXT VALUE FOR dbo.invoice_code_seq"));
    }

    private long nextSequenceValue(String sql) {
        Number value = (Number) entityManager.createNativeQuery(sql).getSingleResult();
        return value.longValue();
    }

    private String pad(long value) {
        return String.format("%06d", value);
    }
}
