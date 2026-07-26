package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.common.utils.enums.CashbookSourceType;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.cashbook.dto.SystemVoucherRequest;
import com.rms.restaurant.module.cashbook.service.CashbookService;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.config.VnpayProperties;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.mapper.PaymentMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.service.internal.MockQrPaymentGateway;
import com.rms.restaurant.module.payment.service.internal.VnpayQueryClient;
import com.rms.restaurant.module.payment.service.internal.VnpayService;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private AuditService auditService;
    @Mock private UserRepository userRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private MockQrPaymentGateway qrGateway;
    @Mock private CashbookService cashbookService;
    @Mock private VnpayService vnpayService;
    @Mock private VnpayQueryClient vnpayQueryClient;
    @Mock private VnpayProperties vnpayProperties;
    @Mock private RealtimeEventPublisher realtimeEventPublisher;

    @Captor private ArgumentCaptor<SystemVoucherRequest> voucherCaptor;

    private PaymentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PaymentServiceImpl(
                invoiceRepository, paymentRepository, orderRepository, new PaymentMapper(), auditService,
                userRepository, shiftRepository, qrGateway, cashbookService, vnpayService,
                vnpayQueryClient, vnpayProperties, realtimeEventPublisher);
    }

    @Test
    void cashPaymentSettlesInvoiceAndCreatesMatchingCashbookReceipt() {
        User cashier = User.builder().id("cashier-1").username("cashier01").build();
        Shift shift = Shift.builder().id("shift-1").cashierId(cashier.getId()).status("OPEN").build();
        Order order = Order.builder()
                .id("order-1")
                .code("DH000001")
                .tableId("table-1")
                .status(OrderStatus.SERVED)
                .customerName("Nguyễn Văn A")
                .build();
        Invoice invoice = Invoice.builder()
                .id("invoice-1")
                .code("HD000001")
                .orderId(order.getId())
                .subtotal(BigDecimal.valueOf(100_000))
                .discountAmount(BigDecimal.valueOf(10_000))
                .totalAmount(BigDecimal.valueOf(90_000))
                .paid(false)
                .status(InvoiceStatus.ACTIVE)
                .build();

        when(userRepository.findByUsername(cashier.getUsername())).thenReturn(Optional.of(cashier));
        when(shiftRepository.findByCashierIdAndStatus(cashier.getId(), "OPEN")).thenReturn(Optional.of(shift));
        when(paymentRepository.findByInvoiceIdAndStatus(invoice.getId(), "PENDING")).thenReturn(List.of());
        when(invoiceRepository.findOrderIdById(invoice.getId())).thenReturn(Optional.of(order.getId()));
        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByInvoiceId(invoice.getId())).thenReturn(List.of());
        when(paymentRepository.findFirstByInvoiceIdAndStatusAndExpiresAtAfter(
                anyString(), anyString(), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment saved = invocation.getArgument(0);
            saved.setId("payment-1");
            saved.setCreatedAt(LocalDateTime.of(2026, 7, 27, 12, 0));
            return saved;
        });

        var response = service.process(
                new ProcessPaymentRequest(invoice.getId(), PaymentMethod.CASH, BigDecimal.valueOf(100_000)),
                cashier.getUsername());

        assertThat(response.method()).isEqualTo(PaymentMethod.CASH);
        assertThat(response.status()).isEqualTo("PAID");
        assertThat(response.amount()).isEqualByComparingTo("90000");
        assertThat(response.receivedAmount()).isEqualByComparingTo("100000");
        assertThat(response.changeAmount()).isEqualByComparingTo("10000");
        assertThat(invoice.isPaid()).isTrue();

        verify(cashbookService).createSystemVoucher(voucherCaptor.capture());
        SystemVoucherRequest voucher = voucherCaptor.getValue();
        assertThat(voucher.type()).isEqualTo(CashFlowType.RECEIPT);
        assertThat(voucher.categoryCode()).isEqualTo("SALES_RECEIPT");
        assertThat(voucher.method()).isEqualTo(CashFlowMethod.CASH);
        assertThat(voucher.partnerGroup()).isEqualTo(CashbookPartnerGroup.CUSTOMER);
        assertThat(voucher.partnerName()).isEqualTo(order.getCustomerName());
        assertThat(voucher.amount()).isEqualByComparingTo(response.amount());
        assertThat(voucher.accountingToIncome()).isTrue();
        assertThat(voucher.sourceType()).isEqualTo(CashbookSourceType.INVOICE_PAYMENT);
        assertThat(voucher.sourceReferenceId()).isEqualTo(invoice.getId());
        assertThat(voucher.createdBy()).isEqualTo(cashier.getUsername());
    }

    @Test
    void duplicateVnpayIpnSettlesInvoiceAndCashbookExactlyOnce() {
        User cashier = User.builder().id("cashier-1").username("cashier01").build();
        Order order = Order.builder()
                .id("order-1")
                .code("DH000001")
                .tableId("table-1")
                .status(OrderStatus.SERVED)
                .customerName("Nguyễn Văn A")
                .build();
        Invoice invoice = Invoice.builder()
                .id("invoice-1")
                .code("HD000001")
                .orderId(order.getId())
                .subtotal(BigDecimal.valueOf(100_000))
                .discountAmount(BigDecimal.valueOf(10_000))
                .totalAmount(BigDecimal.valueOf(90_000))
                .paid(false)
                .status(InvoiceStatus.ACTIVE)
                .build();
        Payment payment = Payment.builder()
                .id("payment-1")
                .invoiceId(invoice.getId())
                .cashierId(cashier.getId())
                .method(PaymentMethod.VNPAY)
                .amount(invoice.getTotalAmount())
                .gatewayRef("RMS-TXN-1")
                .status("PENDING")
                .build();
        Map<String, String> params = Map.of(
                "vnp_TxnRef", payment.getGatewayRef(),
                "vnp_TmnCode", "RMSDEMO",
                "vnp_Amount", "9000000",
                "vnp_ResponseCode", "00",
                "vnp_TransactionStatus", "00",
                "vnp_SecureHash", "valid-signature");

        when(vnpayProperties.isConfigured()).thenReturn(true);
        when(vnpayProperties.getHashSecret()).thenReturn("secret");
        when(vnpayProperties.getTmnCode()).thenReturn("RMSDEMO");
        when(vnpayService.verifySignature(params, "secret", "valid-signature")).thenReturn(true);
        when(paymentRepository.findByGatewayRefForUpdate(payment.getGatewayRef())).thenReturn(Optional.of(payment));
        when(invoiceRepository.findOrderIdById(invoice.getId())).thenReturn(Optional.of(order.getId()));
        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByInvoiceId(invoice.getId())).thenReturn(List.of(payment));
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(userRepository.findById(cashier.getId())).thenReturn(Optional.of(cashier));

        Map<String, String> firstResponse = service.handleVnpayIpn(params);
        Map<String, String> duplicateResponse = service.handleVnpayIpn(params);

        assertThat(firstResponse.get("RspCode")).isEqualTo("00");
        assertThat(duplicateResponse.get("RspCode")).isEqualTo("02");
        assertThat(payment.getStatus()).isEqualTo("PAID");
        assertThat(payment.getPaidAt()).isNotNull();
        assertThat(invoice.isPaid()).isTrue();

        verify(cashbookService, times(1)).createSystemVoucher(voucherCaptor.capture());
        SystemVoucherRequest voucher = voucherCaptor.getValue();
        assertThat(voucher.method()).isEqualTo(CashFlowMethod.BANK);
        assertThat(voucher.amount()).isEqualByComparingTo(invoice.getTotalAmount());
        assertThat(voucher.sourceReferenceId()).isEqualTo(invoice.getId());
        assertThat(voucher.createdBy()).isEqualTo(cashier.getUsername());
    }
}
