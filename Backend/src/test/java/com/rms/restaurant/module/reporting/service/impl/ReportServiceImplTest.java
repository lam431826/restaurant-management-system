package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.DashboardGranularity;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payroll.repository.PayrollSheetRepository;
import com.rms.restaurant.module.payroll.repository.PayslipRepository;
import com.rms.restaurant.module.reporting.dto.DashboardOverviewResponse;
import com.rms.restaurant.module.table.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Focused correctness audit for the Manager Dashboard aggregation (getDashboardOverview):
 * half-open [from, to) time boundaries, settlement-time (Payment.paidAt) revenue anchoring,
 * invoice-based KPIs (paidInvoiceCount / averageInvoiceValue — deliberately NOT an order
 * "completed" count, since Order has no authoritative closedAt and OrderStatus is a mutable,
 * current-state field), allocation-aware menu aggregation under split/merge, and
 * authoritative-payment selection for the payment breakdown. Pure unit tests against mocked
 * repositories — no database, no changed local configuration.
 */
@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    @Mock InvoiceRepository invoiceRepository;
    @Mock OrderRepository orderRepository;
    @Mock OrderItemRepository orderItemRepository;
    @Mock InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock UserRepository userRepository;
    @Mock TableRepository tableRepository;
    @Mock MenuItemRepository menuItemRepository;
    @Mock PayrollSheetRepository payrollSheetRepository;
    @Mock PayslipRepository payslipRepository;

    private ReportServiceImpl service;

    private static final LocalDateTime FROM = LocalDateTime.of(2026, 7, 22, 0, 0, 0);
    private static final LocalDateTime TO = LocalDateTime.of(2026, 7, 23, 0, 0, 0); // exclusive

    @BeforeEach
    void setUp() {
        service = new ReportServiceImpl(
                invoiceRepository, orderRepository, orderItemRepository, invoiceItemAllocationRepository,
                paymentRepository, userRepository, tableRepository, menuItemRepository,
                payrollSheetRepository, payslipRepository);

        lenient().when(orderRepository.findAllById(anyCollection())).thenReturn(List.of());
        lenient().when(invoiceRepository.findAllById(anyCollection())).thenReturn(List.of());
        lenient().when(invoiceItemAllocationRepository.findAllByInvoiceIds(anyCollection())).thenReturn(List.of());
        lenient().when(orderItemRepository.findAllById(anyCollection())).thenReturn(List.of());
    }

    // ── Fixtures ─────────────────────────────────────────────────────────────

    private Invoice invoice(String id, String orderId, String code, BigDecimal subtotal,
                             BigDecimal discount, BigDecimal total, boolean paid, InvoiceStatus status,
                             LocalDateTime createdAt) {
        return Invoice.builder()
                .id(id).code(code).orderId(orderId)
                .subtotal(subtotal).discountAmount(discount).totalAmount(total)
                .paid(paid).status(status).createdAt(createdAt)
                .build();
    }

    private OrderItem orderItem(String id, String menuItemId, String menuItemName, int qty, BigDecimal unitPrice) {
        return OrderItem.builder()
                .id(id).menuItemId(menuItemId).menuItemName(menuItemName)
                .quantity(qty).unitPrice(unitPrice).cookingStatus(CookingStatus.SERVED).isQrOrder(false)
                .build();
    }

    private InvoiceItemAllocation allocation(String invoiceId, String orderItemId, int qty, BigDecimal unitPrice) {
        return InvoiceItemAllocation.builder()
                .id("alloc-" + invoiceId + "-" + orderItemId)
                .invoiceId(invoiceId).orderItemId(orderItemId)
                .allocatedQuantity(qty).unitPriceSnapshot(unitPrice).active(true)
                .build();
    }

    /** paidAt is the authoritative settlement instant; createdAt (attempt creation) defaults to
     *  the same value unless a test deliberately separates them (e.g. VNPAY created day A,
     *  settled day B). */
    private Payment payment(String id, String invoiceId, PaymentMethod method, BigDecimal amount,
                             String status, LocalDateTime paidAt) {
        return payment(id, invoiceId, method, amount, status, paidAt, paidAt);
    }

    private Payment payment(String id, String invoiceId, PaymentMethod method, BigDecimal amount,
                             String status, LocalDateTime paidAt, LocalDateTime createdAt) {
        return Payment.builder()
                .id(id).invoiceId(invoiceId).method(method).amount(amount).status(status)
                .paidAt(paidAt).createdAt(createdAt)
                .build();
    }

    /** Wires the two repository lookups the service performs after resolving settled payments:
     *  invoiceRepository.findAllById(...) and orderRepository.findAllById(...). */
    private void stubInvoicesAndOrders(List<Invoice> invoices, List<Order> orders) {
        lenient().when(invoiceRepository.findAllById(any())).thenReturn(invoices);
        lenient().when(orderRepository.findAllById(any())).thenReturn(orders);
    }

    // ── 1. Half-open interval boundaries ────────────────────────────────────

    @Test
    void boundary_paymentAtFromExactly_included() {
        Payment p = payment("p-1", "inv-1", PaymentMethod.CASH, BigDecimal.valueOf(10_000), "PAID", FROM);
        Invoice inv = invoice("inv-1", "order-1", "HD001", BigDecimal.valueOf(10_000), BigDecimal.ZERO,
                BigDecimal.valueOf(10_000), true, InvoiceStatus.ACTIVE, FROM);
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        stubInvoicesAndOrders(List.of(inv), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount()).isEqualTo(1);
        assertThat(resp.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.valueOf(10_000));
    }

    @Test
    void boundary_paymentOnePrecisionUnitBeforeTo_included() {
        LocalDateTime justBeforeTo = TO.minusNanos(1_000_000); // 1 ms before `to`
        Payment p = payment("p-1", "inv-1", PaymentMethod.CASH, BigDecimal.valueOf(10_000), "PAID", justBeforeTo);
        Invoice inv = invoice("inv-1", "order-1", "HD001", BigDecimal.valueOf(10_000), BigDecimal.ZERO,
                BigDecimal.valueOf(10_000), true, InvoiceStatus.ACTIVE, justBeforeTo);
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        stubInvoicesAndOrders(List.of(inv), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount()).isEqualTo(1);
        // Must land in the one DAY bucket [FROM,TO), not spill into a phantom extra bucket.
        assertThat(resp.revenueSeries()).hasSize(1);
        assertThat(resp.revenueSeries().get(0).revenue()).isEqualByComparingTo(BigDecimal.valueOf(10_000));
    }

    @Test
    void boundary_paymentExactlyAtTo_excludedFromThisQuery() {
        // The repository is the enforcement point for exclusivity — this proves the service
        // passes `to` straight through as the exclusive bound rather than adjusting it, i.e. it
        // trusts findSettledPaidBetween's own "< :to" semantics and never re-includes a payment
        // at exactly `to` itself. A payment settled AT `to` simply never appears in this window's
        // mocked repository result, matching how `p.paidAt < :to` would behave for real.
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount()).isEqualTo(0);
        assertThat(resp.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void boundary_adjacentPeriods_midnightPaymentAppearsInExactlyOnePeriod() {
        LocalDateTime midnight = TO; // boundary between "today" (FROM..TO) and "tomorrow" (TO..TO2)
        LocalDateTime nextTo = TO.plusDays(1);
        // Simulates the repository behavior for each period: a payment settled exactly at
        // `midnight` satisfies period 2's `paidAt >= :from` but fails period 1's `paidAt < :to`.
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of());
        Payment atMidnight = payment("p-mid", "inv-mid", PaymentMethod.CASH,
                BigDecimal.valueOf(5_000), "PAID", midnight);
        when(paymentRepository.findSettledPaidBetween(TO, nextTo)).thenReturn(List.of(atMidnight));
        Invoice invMid = invoice("inv-mid", "order-mid", "HD099", BigDecimal.valueOf(5_000), BigDecimal.ZERO,
                BigDecimal.valueOf(5_000), true, InvoiceStatus.ACTIVE, midnight);
        stubInvoicesAndOrders(List.of(invMid), List.of());

        DashboardOverviewResponse day1 = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);
        DashboardOverviewResponse day2 = service.getDashboardOverview(TO, nextTo, DashboardGranularity.DAY);

        assertThat(day1.revenue().paidInvoiceCount()).isEqualTo(0);
        assertThat(day2.revenue().paidInvoiceCount()).isEqualTo(1);
    }

    // ── 2. Settlement-time revenue anchoring ────────────────────────────────

    @Test
    void settlementTime_invoiceCreatedDayA_paidDayB_appearsInDayB() {
        LocalDateTime dayA = FROM.minusDays(1).withHour(20);
        LocalDateTime dayB = FROM.withHour(9);
        Invoice inv = invoice("inv-1", "order-1", "HD001", BigDecimal.valueOf(30_000), BigDecimal.ZERO,
                BigDecimal.valueOf(30_000), true, InvoiceStatus.ACTIVE, dayA); // created day A
        Payment p = payment("p-1", "inv-1", PaymentMethod.CASH, BigDecimal.valueOf(30_000), "PAID", dayB); // paid day B

        // Day A's window must NOT surface this invoice — it queries settled payments, not
        // invoice creation.
        when(paymentRepository.findSettledPaidBetween(dayA.toLocalDate().atStartOfDay(),
                dayA.toLocalDate().plusDays(1).atStartOfDay())).thenReturn(List.of());
        // Day B's window (FROM..TO) is where the payment actually settled.
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        stubInvoicesAndOrders(List.of(inv), List.of());

        DashboardOverviewResponse dayAResult = service.getDashboardOverview(
                dayA.toLocalDate().atStartOfDay(), dayA.toLocalDate().plusDays(1).atStartOfDay(),
                DashboardGranularity.DAY);
        DashboardOverviewResponse dayBResult = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(dayAResult.revenue().paidInvoiceCount())
                .as("revenue must not appear on the invoice's creation day")
                .isEqualTo(0);
        assertThat(dayBResult.revenue().netRevenue())
                .as("revenue belongs to the settlement day")
                .isEqualByComparingTo(BigDecimal.valueOf(30_000));
    }

    @Test
    void settlementTime_vnpayCreatedDayA_reconciledDayB_countedOnceInCorrectPeriod() {
        LocalDateTime createdDayA = FROM.minusDays(1).withHour(23);
        LocalDateTime reconciledDayB = FROM.withHour(8);
        Invoice inv = invoice("inv-vnpay", "order-1", "HD002", BigDecimal.valueOf(75_000), BigDecimal.ZERO,
                BigDecimal.valueOf(75_000), true, InvoiceStatus.ACTIVE, createdDayA);
        // The Payment row's own createdAt (attempt creation) is day A, but paidAt (the
        // QueryDR-confirmed settlement instant) is day B — the dashboard must key off paidAt.
        Payment vnpay = payment("p-vnpay", "inv-vnpay", PaymentMethod.VNPAY, BigDecimal.valueOf(75_000),
                "PAID", reconciledDayB, createdDayA);

        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(vnpay));
        stubInvoicesAndOrders(List.of(inv), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount()).isEqualTo(1);
        assertThat(resp.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.valueOf(75_000));
        assertThat(resp.paymentBreakdown()).hasSize(1);
        assertThat(resp.paymentBreakdown().get(0).method()).isEqualTo(PaymentMethod.VNPAY);
        assertThat(resp.paymentBreakdown().get(0).count()).isEqualTo(1);
    }

    @Test
    void settlementTime_failedAttemptDayA_thenPaidDayB_noRevenueDayA_oneSettledAmountDayB() {
        LocalDateTime dayAStart = FROM.minusDays(1).toLocalDate().atStartOfDay();
        LocalDateTime dayAEnd = FROM;

        // Day A: a FAILED VNPAY attempt was made — findSettledPaidBetween filters status='PAID'
        // at the repository level, so a FAILED row is never even returned for day A's window.
        when(paymentRepository.findSettledPaidBetween(dayAStart, dayAEnd)).thenReturn(List.of());
        // Day B: the retry succeeds.
        Payment settledDayB = payment("p-retry", "inv-1", PaymentMethod.VNPAY,
                BigDecimal.valueOf(45_000), "PAID", FROM.withHour(10));
        Invoice inv = invoice("inv-1", "order-1", "HD003", BigDecimal.valueOf(45_000), BigDecimal.ZERO,
                BigDecimal.valueOf(45_000), true, InvoiceStatus.ACTIVE, dayAEnd);
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(settledDayB));
        stubInvoicesAndOrders(List.of(inv), List.of());

        DashboardOverviewResponse dayAResult =
                service.getDashboardOverview(dayAStart, dayAEnd, DashboardGranularity.DAY);
        DashboardOverviewResponse dayBResult = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(dayAResult.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(dayBResult.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.valueOf(45_000));
        assertThat(dayBResult.paymentBreakdown()).hasSize(1);
        assertThat(dayBResult.paymentBreakdown().get(0).count()).isEqualTo(1);
    }

    // ── 3. Invoice-based KPIs — no order-completion semantics ───────────────

    @Test
    void paidInvoiceCountAndAverageInvoiceValue_computedFromSettledInvoices() {
        Payment pa = payment("p-a", "inv-a", PaymentMethod.CASH, BigDecimal.valueOf(40_000), "PAID", FROM.plusHours(9));
        Payment pb = payment("p-b", "inv-b", PaymentMethod.CASH, BigDecimal.valueOf(60_000), "PAID", FROM.plusHours(10));
        Invoice a = invoice("inv-a", "order-1", "HD001", BigDecimal.valueOf(40_000), BigDecimal.ZERO,
                BigDecimal.valueOf(40_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        Invoice b = invoice("inv-b", "order-2", "HD002", BigDecimal.valueOf(60_000), BigDecimal.ZERO,
                BigDecimal.valueOf(60_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(10));
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(pa, pb));
        stubInvoicesAndOrders(List.of(a, b), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount()).isEqualTo(2);
        assertThat(resp.revenue().averageInvoiceValue())
                .isEqualByComparingTo(BigDecimal.valueOf(50_000)); // (40_000 + 60_000) / 2
    }

    @Test
    void averageInvoiceValue_safelyZero_whenNoSettledInvoices() {
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount()).isEqualTo(0);
        assertThat(resp.revenue().averageInvoiceValue()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void noOrderCompletionDoubleCounting_splitInvoicesPaidInDifferentPeriods() {
        // The proven limitation this fix addresses: a split order's invoice A settles day 1,
        // invoice B settles (and closes the order) day 2. Each period must independently report
        // exactly the ONE invoice actually settled inside it — there is no order-level count left
        // to show the same order as "completed" in both periods.
        LocalDateTime day1From = FROM.minusDays(1).toLocalDate().atStartOfDay();
        LocalDateTime day1To = FROM;
        Payment payDay1 = payment("p-a", "inv-a", PaymentMethod.CASH, BigDecimal.valueOf(40_000), "PAID",
                day1From.plusHours(9));
        Invoice invA = invoice("inv-a", "order-split", "HD100", BigDecimal.valueOf(40_000), BigDecimal.ZERO,
                BigDecimal.valueOf(40_000), true, InvoiceStatus.ACTIVE, day1From.plusHours(9));
        Payment payDay2 = payment("p-b", "inv-b", PaymentMethod.CASH, BigDecimal.valueOf(60_000), "PAID",
                FROM.plusHours(10));
        Invoice invB = invoice("inv-b", "order-split", "HD101", BigDecimal.valueOf(60_000), BigDecimal.ZERO,
                BigDecimal.valueOf(60_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(10));

        when(paymentRepository.findSettledPaidBetween(day1From, day1To)).thenReturn(List.of(payDay1));
        when(invoiceRepository.findAllById(List.of("inv-a"))).thenReturn(List.of(invA));
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(payDay2));
        when(invoiceRepository.findAllById(List.of("inv-b"))).thenReturn(List.of(invB));

        DashboardOverviewResponse day1Result = service.getDashboardOverview(day1From, day1To, DashboardGranularity.DAY);
        DashboardOverviewResponse day2Result = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(day1Result.revenue().paidInvoiceCount()).isEqualTo(1);
        assertThat(day1Result.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.valueOf(40_000));
        assertThat(day2Result.revenue().paidInvoiceCount()).isEqualTo(1);
        assertThat(day2Result.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.valueOf(60_000));
    }

    @Test
    void orderStatusNeverConsulted_getDashboardOverviewDoesNotQueryOrders() {
        // Positive proof that the KPI calculation does not use Order/OrderStatus at all — a
        // settled invoice counts regardless of its order's current status, and orderRepository
        // is never even called from this code path.
        Payment p = payment("p-1", "inv-1", PaymentMethod.CASH, BigDecimal.valueOf(50_000), "PAID", FROM.plusHours(9));
        Invoice inv = invoice("inv-1", "order-1", "HD200", BigDecimal.valueOf(50_000), BigDecimal.ZERO,
                BigDecimal.valueOf(50_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        when(invoiceRepository.findAllById(any())).thenReturn(List.of(inv));

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount()).isEqualTo(1);
        verify(orderRepository, never()).findAllById(any());
    }

    // ── 4. Menu performance under split / merge ─────────────────────────────

    @Test
    void menuAggregation_singleNormalInvoice_usesAllocatedQuantity() {
        Payment p = payment("p-1", "inv-1", PaymentMethod.CASH, BigDecimal.valueOf(90_000), "PAID", FROM.plusHours(9));
        Invoice inv = invoice("inv-1", "order-1", "HD010", BigDecimal.valueOf(90_000), BigDecimal.ZERO,
                BigDecimal.valueOf(90_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        OrderItem item = orderItem("oi-1", "menu-pho", "Phở bò", 3, BigDecimal.valueOf(30_000));
        InvoiceItemAllocation alloc = allocation("inv-1", "oi-1", 3, BigDecimal.valueOf(30_000));

        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        stubInvoicesAndOrders(List.of(inv), List.of());
        when(invoiceItemAllocationRepository.findAllByInvoiceIds(List.of("inv-1"))).thenReturn(List.of(alloc));
        when(orderItemRepository.findAllById(any())).thenReturn(List.of(item));

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.topItems()).hasSize(1);
        assertThat(resp.topItems().get(0).quantity()).isEqualTo(3);
        assertThat(resp.topItems().get(0).revenue()).isEqualByComparingTo(BigDecimal.valueOf(90_000));
    }

    @Test
    void menuAggregation_partiallyPaidSplit_onlyCountsPaidInvoiceAllocation() {
        Payment p = payment("p-a", "inv-a", PaymentMethod.CASH, BigDecimal.valueOf(30_000), "PAID", FROM.plusHours(9));
        Invoice paidInvoice = invoice("inv-a", "order-split", "HD011", BigDecimal.valueOf(30_000), BigDecimal.ZERO,
                BigDecimal.valueOf(30_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        OrderItem item1 = orderItem("oi-1", "menu-pho", "Phở bò", 1, BigDecimal.valueOf(30_000));
        InvoiceItemAllocation allocA = allocation("inv-a", "oi-1", 1, BigDecimal.valueOf(30_000));

        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        stubInvoicesAndOrders(List.of(paidInvoice), List.of());
        when(invoiceItemAllocationRepository.findAllByInvoiceIds(List.of("inv-a"))).thenReturn(List.of(allocA));
        when(orderItemRepository.findAllById(any())).thenReturn(List.of(item1));

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.topItems()).hasSize(1);
        assertThat(resp.topItems().get(0).quantity())
                .as("must not include the second item still sitting on the unpaid sibling invoice")
                .isEqualTo(1);
    }

    @Test
    void menuAggregation_fullyPaidSplit_sumsWithoutDuplication() {
        Payment pa = payment("p-a", "inv-a", PaymentMethod.CASH, BigDecimal.valueOf(30_000), "PAID", FROM.plusHours(9));
        Payment pb = payment("p-b", "inv-b", PaymentMethod.CASH, BigDecimal.valueOf(60_000), "PAID", FROM.plusHours(10));
        Invoice childA = invoice("inv-a", "order-split", "HD012", BigDecimal.valueOf(30_000), BigDecimal.ZERO,
                BigDecimal.valueOf(30_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        Invoice childB = invoice("inv-b", "order-split", "HD013", BigDecimal.valueOf(60_000), BigDecimal.ZERO,
                BigDecimal.valueOf(60_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(10));
        OrderItem item = orderItem("oi-1", "menu-pho", "Phở bò", 3, BigDecimal.valueOf(30_000));
        InvoiceItemAllocation allocA = allocation("inv-a", "oi-1", 1, BigDecimal.valueOf(30_000));
        InvoiceItemAllocation allocB = allocation("inv-b", "oi-1", 2, BigDecimal.valueOf(30_000));

        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(pa, pb));
        stubInvoicesAndOrders(List.of(childA, childB), List.of());
        when(invoiceItemAllocationRepository.findAllByInvoiceIds(any())).thenReturn(List.of(allocA, allocB));
        when(orderItemRepository.findAllById(any())).thenReturn(List.of(item));

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.topItems()).hasSize(1);
        assertThat(resp.topItems().get(0).quantity()).isEqualTo(3);
        assertThat(resp.topItems().get(0).revenue()).isEqualByComparingTo(BigDecimal.valueOf(90_000));
    }

    @Test
    void menuAggregation_inactiveAllocationExcluded_mergeSourceNeverDoubleCounted() {
        Payment p = payment("p-target", "inv-target", PaymentMethod.CASH, BigDecimal.valueOf(90_000), "PAID", FROM.plusHours(9));
        Invoice target = invoice("inv-target", "order-1", "HD014", BigDecimal.valueOf(90_000), BigDecimal.ZERO,
                BigDecimal.valueOf(90_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        OrderItem item = orderItem("oi-1", "menu-pho", "Phở bò", 3, BigDecimal.valueOf(30_000));
        InvoiceItemAllocation activeTargetAlloc = allocation("inv-target", "oi-1", 3, BigDecimal.valueOf(30_000));
        InvoiceItemAllocation staleInactiveAlloc = InvoiceItemAllocation.builder()
                .id("stale").invoiceId("inv-target").orderItemId("oi-1")
                .allocatedQuantity(99).unitPriceSnapshot(BigDecimal.valueOf(30_000)).active(false)
                .build();

        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        stubInvoicesAndOrders(List.of(target), List.of());
        when(invoiceItemAllocationRepository.findAllByInvoiceIds(List.of("inv-target")))
                .thenReturn(List.of(activeTargetAlloc, staleInactiveAlloc));
        when(orderItemRepository.findAllById(any())).thenReturn(List.of(item));

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.topItems().get(0).quantity()).isEqualTo(3);
    }

    // ── 5. Payment breakdown ─────────────────────────────────────────────────

    @Test
    void paymentBreakdown_excludesFailedAndCancelledAttempts() {
        // findSettledPaidBetween itself filters status='PAID' at the query level — a FAILED or
        // CANCELLED attempt on the same invoice is never part of what the mocked call returns,
        // exactly as the repository would behave for real. Only the settled CASH row surfaces.
        Payment settledCash = payment("p-paid", "inv-1", PaymentMethod.CASH,
                BigDecimal.valueOf(85_000), "PAID", FROM.plusHours(11));
        Invoice inv = invoice("inv-1", "order-1", "HD020", BigDecimal.valueOf(85_000), BigDecimal.ZERO,
                BigDecimal.valueOf(85_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(11));
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(settledCash));
        stubInvoicesAndOrders(List.of(inv), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.paymentBreakdown()).hasSize(1);
        assertThat(resp.paymentBreakdown().get(0).method()).isEqualTo(PaymentMethod.CASH);
        assertThat(resp.paymentBreakdown().get(0).amount()).isEqualByComparingTo(BigDecimal.valueOf(85_000));
        assertThat(resp.paymentBreakdown().get(0).count()).isEqualTo(1);
    }

    @Test
    void paymentBreakdown_duplicateReconciliation_pickedDeterministicallyNotSummed() {
        // Data anomaly: two rows both marked PAID for the same invoice. Must resolve to exactly
        // one, not double the amount or the invoice/order counts.
        Payment earlier = payment("p-1", "inv-1", PaymentMethod.VNPAY, BigDecimal.valueOf(50_000), "PAID", FROM.plusHours(9));
        Payment later = payment("p-2", "inv-1", PaymentMethod.VNPAY, BigDecimal.valueOf(50_000), "PAID", FROM.plusHours(10));
        Invoice inv = invoice("inv-1", "order-1", "HD021", BigDecimal.valueOf(50_000), BigDecimal.ZERO,
                BigDecimal.valueOf(50_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));

        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(earlier, later));
        stubInvoicesAndOrders(List.of(inv), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().paidInvoiceCount())
                .as("must not count the same settled invoice twice")
                .isEqualTo(1);
        assertThat(resp.paymentBreakdown()).hasSize(1);
        assertThat(resp.paymentBreakdown().get(0).count()).isEqualTo(1);
        assertThat(resp.paymentBreakdown().get(0).amount()).isEqualByComparingTo(BigDecimal.valueOf(50_000));
    }

    @Test
    void paymentBreakdown_reconcilesToTotalPaidRevenue() {
        Payment cash = payment("p-cash", "inv-cash", PaymentMethod.CASH, BigDecimal.valueOf(40_000), "PAID", FROM.plusHours(9));
        Payment vnpay = payment("p-vnpay", "inv-vnpay", PaymentMethod.VNPAY, BigDecimal.valueOf(50_000), "PAID", FROM.plusHours(10));
        Invoice cashInvoice = invoice("inv-cash", "order-1", "HD022", BigDecimal.valueOf(40_000), BigDecimal.ZERO,
                BigDecimal.valueOf(40_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        Invoice vnpayInvoice = invoice("inv-vnpay", "order-2", "HD023", BigDecimal.valueOf(60_000), BigDecimal.valueOf(10_000),
                BigDecimal.valueOf(50_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(10));

        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(cash, vnpay));
        stubInvoicesAndOrders(List.of(cashInvoice, vnpayInvoice), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        BigDecimal breakdownSum = resp.paymentBreakdown().stream()
                .map(DashboardOverviewResponse.PaymentBreakdownRow::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(breakdownSum)
                .as("sum(payment breakdown) must reconcile to dashboard paid revenue")
                .isEqualByComparingTo(resp.revenue().netRevenue());
    }

    // ── 6. Revenue basis (discount handling) ────────────────────────────────

    @Test
    void revenue_discountedInvoice_netRevenueExcludesDiscount() {
        Payment p = payment("p-1", "inv-1", PaymentMethod.CASH, BigDecimal.valueOf(85_000), "PAID", FROM.plusHours(9));
        Invoice discounted = invoice("inv-1", "order-1", "HD030", BigDecimal.valueOf(100_000), BigDecimal.valueOf(15_000),
                BigDecimal.valueOf(85_000), true, InvoiceStatus.ACTIVE, FROM.plusHours(9));
        when(paymentRepository.findSettledPaidBetween(FROM, TO)).thenReturn(List.of(p));
        stubInvoicesAndOrders(List.of(discounted), List.of());

        DashboardOverviewResponse resp = service.getDashboardOverview(FROM, TO, DashboardGranularity.DAY);

        assertThat(resp.revenue().grossRevenue()).isEqualByComparingTo(BigDecimal.valueOf(100_000));
        assertThat(resp.revenue().totalDiscount()).isEqualByComparingTo(BigDecimal.valueOf(15_000));
        assertThat(resp.revenue().netRevenue()).isEqualByComparingTo(BigDecimal.valueOf(85_000));
    }
}
