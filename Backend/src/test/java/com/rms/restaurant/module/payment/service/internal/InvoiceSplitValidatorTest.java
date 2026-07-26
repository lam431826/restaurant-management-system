package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.dto.SplitInvoiceGroupRequest;
import com.rms.restaurant.module.payment.dto.SplitInvoiceItemRequest;
import com.rms.restaurant.module.payment.dto.SplitInvoiceRequest;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceSplitValidatorTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private InvoiceItemAllocationRepository allocationRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private PaymentRepository paymentRepository;

    private InvoiceSplitValidator validator;

    @BeforeEach
    void setUp() {
        validator = new InvoiceSplitValidator(
                invoiceRepository,
                orderRepository,
                allocationRepository,
                orderItemRepository,
                paymentRepository
        );
    }

    @Test
    void partialQuantitySplitConservesQuantityAndMoney() {
        stubEligibleSourceWithThreeUnits();

        ValidatedInvoiceSplitPlan plan = validator.validateForUpdate(
                " inv-1 ",
                splitOneUnit()
        );

        assertThat(plan.groups()).hasSize(1);
        assertThat(plan.groups().get(0).subtotal()).isEqualByComparingTo("30000");
        assertThat(plan.groups().get(0).selections().get(0).quantity()).isEqualTo(1);
        assertThat(plan.remainingQuantityByAllocationId()).containsEntry("alloc-1", 2);
        assertThat(plan.remainingSubtotal()).isEqualByComparingTo("60000");
        assertThat(plan.remainingSubtotal().add(plan.groups().get(0).subtotal()))
                .isEqualByComparingTo(plan.sourceSubtotal());
    }

    @Test
    void splitRejectsMovingEveryUnitBecauseSourceMustRemainPayable() {
        stubEligibleSourceWithThreeUnits();
        SplitInvoiceRequest request = new SplitInvoiceRequest(List.of(
                new SplitInvoiceGroupRequest(
                        null,
                        List.of(new SplitInvoiceItemRequest("alloc-1", 3))
                )
        ));

        assertThatThrownBy(() -> validator.validateForUpdate("inv-1", request))
                .isInstanceOf(ApplicationException.class)
                .extracting(error -> ((ApplicationException) error).getError())
                .isEqualTo(ApplicationError.INVALID_INVOICE_SPLIT);
    }

    private SplitInvoiceRequest splitOneUnit() {
        return new SplitInvoiceRequest(List.of(
                new SplitInvoiceGroupRequest(
                        null,
                        List.of(new SplitInvoiceItemRequest("alloc-1", 1))
                )
        ));
    }

    private void stubEligibleSourceWithThreeUnits() {
        Order order = Order.builder()
                .id("order-1")
                .status(OrderStatus.SERVED)
                .build();
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .orderId("order-1")
                .subtotal(new BigDecimal("90000"))
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("90000"))
                .paid(false)
                .status(InvoiceStatus.ACTIVE)
                .build();
        InvoiceItemAllocation allocation = InvoiceItemAllocation.builder()
                .id("alloc-1")
                .invoiceId("inv-1")
                .orderItemId("item-1")
                .allocatedQuantity(3)
                .unitPriceSnapshot(new BigDecimal("30000"))
                .unitCostSnapshot(new BigDecimal("12000"))
                .active(true)
                .build();
        OrderItem item = OrderItem.builder()
                .id("item-1")
                .order(order)
                .quantity(3)
                .unitPrice(new BigDecimal("30000"))
                .cookingStatus(CookingStatus.READY)
                .build();

        when(invoiceRepository.findOrderIdById("inv-1")).thenReturn(Optional.of("order-1"));
        when(orderRepository.findByIdForUpdate("order-1")).thenReturn(Optional.of(order));
        when(invoiceRepository.findByIdForUpdate("inv-1")).thenReturn(Optional.of(invoice));
        when(allocationRepository.findActiveByInvoiceIdForUpdate("inv-1"))
                .thenReturn(List.of(allocation));
        when(orderItemRepository.findAllByIdsForUpdate(List.of("item-1")))
                .thenReturn(List.of(item));
        when(paymentRepository.existsByInvoiceIdAndStatus("inv-1", "PAID"))
                .thenReturn(false);
        when(paymentRepository.existsByInvoiceId("inv-1")).thenReturn(false);
    }
}
