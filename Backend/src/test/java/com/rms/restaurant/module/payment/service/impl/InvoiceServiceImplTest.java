package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.codegen.BusinessCodeGenerator;
import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.mail.GmailService;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.notification.service.NotificationDispatcher;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.mapper.InvoiceMapper;
import com.rms.restaurant.module.payment.dto.GenerateInvoiceRequest;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.repository.PromotionRepository;
import com.rms.restaurant.module.payment.service.internal.InvoiceMergePersistenceService;
import com.rms.restaurant.module.payment.service.internal.InvoiceMergeValidator;
import com.rms.restaurant.module.payment.service.internal.InvoiceSplitPersistenceService;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.user.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceImplTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private PromotionRepository promotionRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private TableRepository tableRepository;
    @Mock private UserRepository userRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private MenuItemRepository menuItemRepository;
    @Mock private InvoiceSplitPersistenceService invoiceSplitPersistenceService;
    @Mock private InvoiceMergeValidator invoiceMergeValidator;
    @Mock private InvoiceMergePersistenceService invoiceMergePersistenceService;
    @Mock private AuditService auditService;
    @Mock private NotificationDispatcher notificationDispatcher;
    @Mock private GmailService gmailService;
    @Mock private BusinessCodeGenerator businessCodeGenerator;
    @Mock private RealtimeEventPublisher realtimeEventPublisher;

    @Captor private ArgumentCaptor<Map<String, Object>> emailVariablesCaptor;
    @Captor private ArgumentCaptor<List<InvoiceItemAllocation>> allocationsCaptor;

    private InvoiceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new InvoiceServiceImpl(
                invoiceRepository, invoiceItemAllocationRepository, orderRepository, orderItemRepository,
                promotionRepository, paymentRepository, tableRepository, userRepository, shiftRepository,
                menuItemRepository, new InvoiceMapper(), invoiceSplitPersistenceService, invoiceMergeValidator,
                invoiceMergePersistenceService, auditService, notificationDispatcher, gmailService,
                businessCodeGenerator, realtimeEventPublisher);
    }

    @Test
    void sendInvoiceShowsVnpayAsTheSettledPaymentMethod() {
        Order order = Order.builder()
                .id("order-1")
                .code("DH000001")
                .tableId("table-1")
                .status(OrderStatus.SERVED)
                .customerName("Nguyễn Văn A")
                .customerPhone("0900000000")
                .customerEmail("guest@example.com")
                .build();
        OrderItem orderItem = OrderItem.builder()
                .id("order-item-1")
                .order(order)
                .menuItemId("menu-1")
                .menuItemName("Sushi")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(100_000))
                .cookingStatus(CookingStatus.SERVED)
                .build();
        order.setItems(List.of(orderItem));

        Invoice invoice = Invoice.builder()
                .id("invoice-1")
                .code("HD000001")
                .orderId(order.getId())
                .subtotal(BigDecimal.valueOf(100_000))
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(100_000))
                .paid(true)
                .status(InvoiceStatus.ACTIVE)
                .createdAt(LocalDateTime.of(2026, 7, 27, 12, 0))
                .build();
        InvoiceItemAllocation allocation = InvoiceItemAllocation.builder()
                .id("allocation-1")
                .invoiceId(invoice.getId())
                .orderItemId(orderItem.getId())
                .allocatedQuantity(1)
                .unitPriceSnapshot(BigDecimal.valueOf(100_000))
                .active(true)
                .build();
        Payment payment = Payment.builder()
                .id("payment-1")
                .invoiceId(invoice.getId())
                .method(PaymentMethod.VNPAY)
                .amount(BigDecimal.valueOf(100_000))
                .status("PAID")
                .createdAt(LocalDateTime.of(2026, 7, 27, 12, 5))
                .build();

        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(gmailService.isConfigured()).thenReturn(true);
        when(tableRepository.findById(order.getTableId())).thenReturn(Optional.empty());
        when(invoiceItemAllocationRepository.findAllByInvoiceIdAndActiveTrueOrderByCreatedAtAscIdAsc(invoice.getId()))
                .thenReturn(List.of(allocation));
        when(orderItemRepository.findAllById(anyCollection())).thenReturn(List.of(orderItem));
        when(paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoice.getId())).thenReturn(List.of(payment));
        when(notificationDispatcher.dispatchNow(
                eq(order.getCustomerEmail()), eq("INVOICE_DELIVERY"), anyMap(),
                eq(invoice.getId()), eq("INVOICE")))
                .thenReturn(true);

        service.sendInvoice(invoice.getId());

        verify(notificationDispatcher).dispatchNow(
                eq(order.getCustomerEmail()), eq("INVOICE_DELIVERY"), emailVariablesCaptor.capture(),
                eq(invoice.getId()), eq("INVOICE"));
        assertThat(emailVariablesCaptor.getValue().get("paymentMethodLabel")).isEqualTo("VNPAY");
    }

    @Test
    void generateSnapshotsOnlyPayableItemsAndExcludesRejectedItems() {
        Order order = Order.builder()
                .id("order-1")
                .code("DH000001")
                .tableId("table-1")
                .status(OrderStatus.SERVED)
                .build();
        OrderItem payableItem = OrderItem.builder()
                .id("order-item-ready")
                .order(order)
                .menuItemId("menu-ready")
                .menuItemName("Sushi")
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(40_000))
                .cookingStatus(CookingStatus.READY)
                .build();
        OrderItem rejectedItem = OrderItem.builder()
                .id("order-item-rejected")
                .order(order)
                .menuItemId("menu-rejected")
                .menuItemName("Hết hàng")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(30_000))
                .cookingStatus(CookingStatus.REJECTED)
                .build();

        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(invoiceRepository.existsByOrderId(order.getId())).thenReturn(false);
        when(orderItemRepository.findAllByOrderIdForUpdate(order.getId()))
                .thenReturn(List.of(payableItem, rejectedItem));
        when(invoiceItemAllocationRepository.findActiveByOrderItemIdsForUpdate(List.of(payableItem.getId())))
                .thenReturn(List.of());
        when(businessCodeGenerator.nextInvoiceCode()).thenReturn("HD000001");
        when(menuItemRepository.findAllById(anyCollection())).thenReturn(List.of(
                MenuItem.builder()
                        .id("menu-ready")
                        .costPrice(BigDecimal.valueOf(15_000))
                        .build()
        ));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice saved = invocation.getArgument(0);
            saved.setId("invoice-1");
            saved.setCreatedAt(LocalDateTime.of(2026, 7, 27, 12, 0));
            return saved;
        });

        var response = service.generate(new GenerateInvoiceRequest(order.getId(), null), "cashier01");

        assertThat(response.subtotal()).isEqualByComparingTo("80000");
        assertThat(response.discountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.totalAmount()).isEqualByComparingTo("80000");
        assertThat(response.status()).isEqualTo(InvoiceStatus.ACTIVE);
        assertThat(response.paid()).isFalse();

        verify(invoiceItemAllocationRepository).saveAll(allocationsCaptor.capture());
        assertThat(allocationsCaptor.getValue()).singleElement().satisfies(allocation -> {
            assertThat(allocation.getInvoiceId()).isEqualTo("invoice-1");
            assertThat(allocation.getOrderItemId()).isEqualTo(payableItem.getId());
            assertThat(allocation.getAllocatedQuantity()).isEqualTo(2);
            assertThat(allocation.getUnitPriceSnapshot()).isEqualByComparingTo("40000");
            assertThat(allocation.getUnitCostSnapshot()).isEqualByComparingTo("15000");
            assertThat(allocation.isActive()).isTrue();
        });
    }

    @Test
    void generateRejectsOrderWhileAnItemIsStillPending() {
        Order order = Order.builder()
                .id("order-1")
                .tableId("table-1")
                .status(OrderStatus.ACCEPTED)
                .build();
        OrderItem pendingItem = OrderItem.builder()
                .id("order-item-pending")
                .order(order)
                .menuItemId("menu-1")
                .menuItemName("Sushi")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(40_000))
                .cookingStatus(CookingStatus.PENDING)
                .build();

        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(invoiceRepository.existsByOrderId(order.getId())).thenReturn(false);
        when(orderItemRepository.findAllByOrderIdForUpdate(order.getId())).thenReturn(List.of(pendingItem));

        assertThatThrownBy(() -> service.generate(
                new GenerateInvoiceRequest(order.getId(), null), "cashier01"))
                .isInstanceOf(ApplicationException.class)
                .extracting(error -> ((ApplicationException) error).getError())
                .isEqualTo(ApplicationError.ORDER_NOT_READY_FOR_INVOICE);

        verify(invoiceRepository, never()).save(any(Invoice.class));
        verify(invoiceItemAllocationRepository, never()).saveAll(anyCollection());
    }

    @Test
    void generateAppliesPromotionAndConsumesExactlyOneUse() {
        Order order = Order.builder()
                .id("order-1")
                .tableId("table-1")
                .status(OrderStatus.SERVED)
                .build();
        OrderItem payableItem = OrderItem.builder()
                .id("order-item-1")
                .order(order)
                .menuItemId("menu-1")
                .menuItemName("Sushi")
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(50_000))
                .cookingStatus(CookingStatus.SERVED)
                .build();
        Promotion promotion = Promotion.builder()
                .id("promotion-1")
                .code("SAVE10")
                .description("Giảm 10%")
                .discountPercent(BigDecimal.TEN)
                .active(true)
                .usageLimit(5)
                .usedCount(0)
                .build();

        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(invoiceRepository.existsByOrderId(order.getId())).thenReturn(false);
        when(orderItemRepository.findAllByOrderIdForUpdate(order.getId())).thenReturn(List.of(payableItem));
        when(invoiceItemAllocationRepository.findActiveByOrderItemIdsForUpdate(List.of(payableItem.getId())))
                .thenReturn(List.of());
        when(promotionRepository.findActiveByCodeForUpdate("SAVE10")).thenReturn(Optional.of(promotion));
        when(businessCodeGenerator.nextInvoiceCode()).thenReturn("HD000001");
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice saved = invocation.getArgument(0);
            saved.setId("invoice-1");
            return saved;
        });

        var response = service.generate(new GenerateInvoiceRequest(order.getId(), " save10 "), "cashier01");

        assertThat(response.subtotal()).isEqualByComparingTo("100000");
        assertThat(response.discountAmount()).isEqualByComparingTo("10000");
        assertThat(response.totalAmount()).isEqualByComparingTo("90000");
        assertThat(promotion.getUsedCount()).isEqualTo(1);
        verify(promotionRepository).save(promotion);
    }
}
