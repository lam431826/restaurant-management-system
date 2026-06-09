package com.rms.restaurant.module.payment.mapper;

import com.rms.restaurant.module.payment.dto.InvoiceResponse;
import com.rms.restaurant.module.payment.model.Invoice;
import org.springframework.stereotype.Component;

@Component
public class InvoiceMapper {
    public InvoiceResponse toResponse(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getOrderId(),
                invoice.getSubtotal(),
                invoice.getDiscountAmount(),
                invoice.getTotalAmount(),
                invoice.isPaid(),
                invoice.getCreatedAt()
        );
    }
}
