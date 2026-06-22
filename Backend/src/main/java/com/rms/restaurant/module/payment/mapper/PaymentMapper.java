package com.rms.restaurant.module.payment.mapper;

import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.model.Payment;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {
    public PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getInvoiceId(),
                payment.getMethod(),
                payment.getAmount(),
                payment.getStatus(),
                payment.getGatewayRef(),
                payment.getCreatedAt()
        );
    }
}
