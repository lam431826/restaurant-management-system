package com.rms.restaurant.module.payment.mapper;

import com.rms.restaurant.module.payment.dto.InvoiceResponse;
import com.rms.restaurant.module.payment.dto.InvoiceSummaryResponse;
import com.rms.restaurant.module.payment.model.Invoice;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class InvoiceMapper {
    public InvoiceResponse toResponse(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getCode(),
                invoice.getOrderId(),
                invoice.getSubtotal(),
                invoice.getDiscountAmount(),
                invoice.getTotalAmount(),
                invoice.isPaid(),
                invoice.getCreatedAt(),
                invoice.getStatus(),
                invoice.getMergedIntoInvoiceId(),
                invoice.getSplitFromInvoiceId()
        );
    }

    /**
     * @param lineageCodesById codes of other invoices referenced by mergedIntoInvoiceId /
     *                         splitFromInvoiceId, keyed by their id. Batch-resolved by the
     *                         caller so a list of N invoices costs one extra query, not N.
     * @param orderCodesByOrderId codes of the owning orders, keyed by orderId, same reason.
     */
    public InvoiceSummaryResponse toSummaryResponse(
            Invoice invoice,
            Map<String, String> lineageCodesById,
            Map<String, String> orderCodesByOrderId
    ) {
        return new InvoiceSummaryResponse(
                invoice.getId(),
                invoice.getCode(),
                invoice.getOrderId(),
                orderCodesByOrderId.get(invoice.getOrderId()),
                invoice.getSubtotal(),
                invoice.getDiscountAmount(),
                invoice.getTotalAmount(),
                invoice.isPaid(),
                invoice.getPromotionId(),
                invoice.getCreatedAt(),
                invoice.getStatus(),
                invoice.getMergedIntoInvoiceId(),
                lineageCodesById.get(invoice.getMergedIntoInvoiceId()),
                invoice.getSplitFromInvoiceId(),
                lineageCodesById.get(invoice.getSplitFromInvoiceId())
        );
    }
}
