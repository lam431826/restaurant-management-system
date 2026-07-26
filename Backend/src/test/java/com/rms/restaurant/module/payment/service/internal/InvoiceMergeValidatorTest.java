package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.payment.dto.MergeInvoiceRequest;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceMergeValidatorTest {

    @Mock private InvoiceRepository invoiceRepository;

    private InvoiceMergeValidator validator;

    @BeforeEach
    void setUp() {
        validator = new InvoiceMergeValidator(invoiceRepository);
    }

    @Test
    void mergeNormalizesDeterministicIdsForInvoicesFromTheSameOrder() {
        when(invoiceRepository.findOrderIdsByIds(List.of("inv-a", "inv-b")))
                .thenReturn(List.of(
                        new Projection("inv-a", "order-1"),
                        new Projection("inv-b", "order-1")
                ));

        ValidatedInvoiceMergePlan plan = validator.validate(
                new MergeInvoiceRequest(List.of(" inv-b ", "inv-a"))
        );

        assertThat(plan.orderId()).isEqualTo("order-1");
        assertThat(plan.sourceInvoiceIds()).containsExactly("inv-a", "inv-b");
    }

    @Test
    void mergeRejectsInvoicesOwnedByDifferentOrders() {
        when(invoiceRepository.findOrderIdsByIds(List.of("inv-a", "inv-b")))
                .thenReturn(List.of(
                        new Projection("inv-a", "order-1"),
                        new Projection("inv-b", "order-2")
                ));

        assertThatThrownBy(() -> validator.validate(
                new MergeInvoiceRequest(List.of("inv-a", "inv-b"))))
                .isInstanceOf(ApplicationException.class)
                .extracting(error -> ((ApplicationException) error).getError())
                .isEqualTo(ApplicationError.INVOICE_MERGE_ORDER_MISMATCH);
    }

    @Test
    void mergeRejectsDuplicateIdsBeforeReadingTheDatabase() {
        assertThatThrownBy(() -> validator.validate(
                new MergeInvoiceRequest(List.of("inv-a", " inv-a "))))
                .isInstanceOf(ApplicationException.class)
                .extracting(error -> ((ApplicationException) error).getError())
                .isEqualTo(ApplicationError.INVALID_INVOICE_MERGE);

        verify(invoiceRepository, never()).findOrderIdsByIds(org.mockito.ArgumentMatchers.anyList());
    }

    private record Projection(String id, String orderId)
            implements InvoiceRepository.InvoiceOrderProjection {
        @Override
        public String getId() {
            return id;
        }

        @Override
        public String getOrderId() {
            return orderId;
        }
    }
}
