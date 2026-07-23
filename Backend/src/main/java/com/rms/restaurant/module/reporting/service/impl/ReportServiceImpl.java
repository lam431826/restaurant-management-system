package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookSourceType;
import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.DashboardGranularity;
import com.rms.restaurant.common.utils.enums.FinancialGranularity;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.enums.PayslipStatus;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.cashbook.model.CashbookCategory;
import com.rms.restaurant.module.cashbook.model.CashbookVoucher;
import com.rms.restaurant.module.cashbook.repository.CashbookCategoryRepository;
import com.rms.restaurant.module.cashbook.repository.CashbookVoucherRepository;
import com.rms.restaurant.module.menu.model.MenuItem;
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
import com.rms.restaurant.module.payroll.model.PayrollSheet;
import com.rms.restaurant.module.payroll.model.Payslip;
import com.rms.restaurant.module.payroll.repository.PayrollSheetRepository;
import com.rms.restaurant.module.payroll.repository.PayslipRepository;
import com.rms.restaurant.module.reporting.dto.DashboardOverviewResponse;
import com.rms.restaurant.module.reporting.dto.EndOfDaySalesRow;
import com.rms.restaurant.module.reporting.dto.FinancialCategoryLineAmountDto;
import com.rms.restaurant.module.reporting.dto.FinancialCategoryLineDto;
import com.rms.restaurant.module.reporting.dto.FinancialPeriodResponse;
import com.rms.restaurant.module.reporting.dto.MenuPerformanceResponse;
import com.rms.restaurant.module.reporting.dto.TrafficReportResponse;
import com.rms.restaurant.common.utils.enums.FinancialLineGroup;
import com.rms.restaurant.module.reporting.service.ReportService;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final TableRepository tableRepository;
    private final MenuItemRepository menuItemRepository;
    private final PayrollSheetRepository payrollSheetRepository;
    private final PayslipRepository payslipRepository;
    private final CashbookCategoryRepository cashbookCategoryRepository;
    private final CashbookVoucherRepository cashbookVoucherRepository;

    @Override
    public List<FinancialPeriodResponse> getFinancialReport(int year, FinancialGranularity granularity) {
        LocalDate today = LocalDate.now();
        if (year > today.getYear()) return List.of();

        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = year == today.getYear() ? today : LocalDate.of(year, 12, 31);

        Map<YearMonth, MonthAccumulator> byMonth = new TreeMap<>();
        for (YearMonth ym = YearMonth.from(yearStart); !ym.isAfter(YearMonth.from(yearEnd)); ym = ym.plusMonths(1)) {
            byMonth.put(ym, new MonthAccumulator());
        }

        LocalDateTime yearStartTime = yearStart.atStartOfDay();
        LocalDateTime yearEndTime = yearEnd.atTime(23, 59, 59);
        accumulateRevenueAndCogs(byMonth, yearStartTime, yearEndTime);
        accumulatePayroll(byMonth, yearStart, yearEnd);

        List<CashbookCategory> categoryLines =
                cashbookCategoryRepository.findByCodeIsNullAndAccountingToIncomeTrueOrderByNameAsc();
        accumulateCashbookCategoryLines(byMonth, categoryLines, yearStartTime, yearEndTime);

        List<Map.Entry<YearMonth, MonthAccumulator>> monthEntries = new ArrayList<>(byMonth.entrySet());

        List<FinancialPeriodResponse> periods = switch (granularity) {
            case MONTH -> monthEntries.stream()
                    .map(e -> toResponse(monthKey(e.getKey()), monthLabel(e.getKey()), e.getValue(), categoryLines))
                    .toList();
            case QUARTER -> buildQuarterPeriods(monthEntries, year, categoryLines);
            case YEAR -> buildYearPeriod(monthEntries, year, categoryLines);
        };

        List<FinancialPeriodResponse> mostRecentFirst = new ArrayList<>(periods);
        Collections.reverse(mostRecentFirst);
        return mostRecentFirst;
    }

    /** Doanh thu bán hàng, chiết khấu hóa đơn (from paid Invoices) and giá vốn hàng bán
     * (from payable OrderItems × MenuItem.costPrice), bucketed by the invoice's month. */
    private void accumulateRevenueAndCogs(Map<YearMonth, MonthAccumulator> byMonth, LocalDateTime from, LocalDateTime to) {
        List<Invoice> invoices = invoiceRepository.findPaidBetween(from, to);
        if (invoices.isEmpty()) return;

        List<String> orderIds = invoices.stream().map(Invoice::getOrderId).distinct().toList();
        Map<String, BigDecimal> cogsByOrderId = computeCogsByOrder(orderIds);

        for (Invoice invoice : invoices) {
            MonthAccumulator acc = byMonth.get(YearMonth.from(invoice.getCreatedAt()));
            if (acc == null) continue;
            BigDecimal discount = invoice.getDiscountAmount() == null ? BigDecimal.ZERO : invoice.getDiscountAmount();
            acc.salesRevenue = acc.salesRevenue.add(invoice.getSubtotal());
            acc.invoiceDiscount = acc.invoiceDiscount.add(discount);
            acc.cogs = acc.cogs.add(cogsByOrderId.getOrDefault(invoice.getOrderId(), BigDecimal.ZERO));
        }
    }

    private Map<String, BigDecimal> computeCogsByOrder(List<String> orderIds) {
        List<OrderItem> items = orderItemRepository.findByOrderIdIn(orderIds).stream()
                .filter(this::isPayableItem)
                .toList();
        if (items.isEmpty()) return Map.of();

        Set<String> menuItemIds = items.stream().map(OrderItem::getMenuItemId).collect(Collectors.toSet());
        Map<String, BigDecimal> costByMenuItemId = menuItemRepository.findAllById(menuItemIds).stream()
                .collect(Collectors.toMap(MenuItem::getId, mi -> mi.getCostPrice() == null ? BigDecimal.ZERO : mi.getCostPrice()));

        return items.stream().collect(Collectors.groupingBy(
                oi -> oi.getOrder().getId(),
                Collectors.reducing(BigDecimal.ZERO,
                        oi -> costByMenuItemId.getOrDefault(oi.getMenuItemId(), BigDecimal.ZERO)
                                .multiply(BigDecimal.valueOf(oi.getQuantity())),
                        BigDecimal::add)));
    }

    /** Phí chi trả lương Nhân viên, accrual basis: FINALIZED sheets' ACTIVE payslip totals,
     * attributed to the month containing the sheet's periodEnd (matches how MONTHLY-term
     * sheets already align to calendar months; CUSTOM-term sheets are attributed to the
     * single month of their periodEnd rather than prorated — a documented simplification). */
    private void accumulatePayroll(Map<YearMonth, MonthAccumulator> byMonth, LocalDate yearStart, LocalDate yearEnd) {
        List<PayrollSheet> sheets = payrollSheetRepository.findFinalizedOverlapping(yearStart, yearEnd);
        if (sheets.isEmpty()) return;

        List<String> sheetIds = sheets.stream().map(PayrollSheet::getId).toList();
        Map<String, PayrollSheet> sheetsById = sheets.stream()
                .collect(Collectors.toMap(PayrollSheet::getId, s -> s));

        Map<String, BigDecimal> payrollBySheetId = payslipRepository.findByPayrollSheetIdIn(sheetIds).stream()
                .filter(p -> p.getStatus() == PayslipStatus.ACTIVE)
                .collect(Collectors.groupingBy(Payslip::getPayrollSheetId,
                        Collectors.reducing(BigDecimal.ZERO, Payslip::getTotal, BigDecimal::add)));

        for (Map.Entry<String, BigDecimal> entry : payrollBySheetId.entrySet()) {
            PayrollSheet sheet = sheetsById.get(entry.getKey());
            MonthAccumulator acc = byMonth.get(YearMonth.from(sheet.getPeriodEnd()));
            if (acc == null) continue;
            acc.expPayroll = acc.expPayroll.add(entry.getValue());
        }
    }

    private List<FinancialPeriodResponse> buildQuarterPeriods(
            List<Map.Entry<YearMonth, MonthAccumulator>> monthEntries, int year, List<CashbookCategory> categories) {
        Map<Integer, MonthAccumulator> byQuarter = new TreeMap<>();
        for (Map.Entry<YearMonth, MonthAccumulator> e : monthEntries) {
            int quarter = (e.getKey().getMonthValue() - 1) / 3 + 1;
            byQuarter.computeIfAbsent(quarter, q -> new MonthAccumulator()).add(e.getValue());
        }
        return byQuarter.entrySet().stream()
                .map(e -> toResponse(year + "-Q" + e.getKey(), "Q" + e.getKey() + "." + year, e.getValue(), categories))
                .toList();
    }

    private List<FinancialPeriodResponse> buildYearPeriod(
            List<Map.Entry<YearMonth, MonthAccumulator>> monthEntries, int year, List<CashbookCategory> categories) {
        MonthAccumulator total = new MonthAccumulator();
        for (Map.Entry<YearMonth, MonthAccumulator> e : monthEntries) total.add(e.getValue());
        return List.of(toResponse(String.valueOf(year), String.valueOf(year), total, categories));
    }

    /** Chi phí (6)/Thu nhập khác (8) sub-line amounts, sourced from manager-created Cashbook
     * categories (code IS NULL) flagged accountingToIncome=true. sourceType=MANUAL only —
     * PAYROLL/INVOICE_PAYMENT system vouchers are already counted via expPayroll/salesRevenue,
     * so folding them in here would double-count. Bucketed by voucher.occurredAt's month. */
    private void accumulateCashbookCategoryLines(
            Map<YearMonth, MonthAccumulator> byMonth, List<CashbookCategory> categories,
            LocalDateTime from, LocalDateTime to) {
        if (categories.isEmpty()) return;
        List<String> categoryIds = categories.stream().map(CashbookCategory::getId).toList();
        List<CashbookVoucher> vouchers =
                cashbookVoucherRepository.findForFinancialReport(CashbookSourceType.MANUAL, from, to, categoryIds);
        for (CashbookVoucher voucher : vouchers) {
            MonthAccumulator acc = byMonth.get(YearMonth.from(voucher.getOccurredAt()));
            if (acc == null) continue;
            acc.categoryLineAmounts.merge(voucher.getCategoryId(), voucher.getAmount(), BigDecimal::add);
        }
    }

    private String monthKey(YearMonth ym) {
        return String.format("%d-%02d", ym.getYear(), ym.getMonthValue());
    }

    private String monthLabel(YearMonth ym) {
        return "T" + ym.getMonthValue() + "." + ym.getYear();
    }

    /** Derives the remaining P&L lines from the computable base figures. returnedGoods and
     * otherExpense are always zero — nothing tracked for them anywhere else in this app.
     * expenses/otherIncome now fold in Cashbook-derived category lines (see
     * accumulateCashbookCategoryLines) instead of the old manually-typed custom lines. */
    private FinancialPeriodResponse toResponse(
            String key, String label, MonthAccumulator acc, List<CashbookCategory> categories) {
        BigDecimal returnedGoods = BigDecimal.ZERO;
        BigDecimal discountReduction = acc.invoiceDiscount.add(returnedGoods);
        BigDecimal netRevenue = acc.salesRevenue.subtract(discountReduction);
        BigDecimal grossProfit = netRevenue.subtract(acc.cogs);

        BigDecimal categoryExpenseTotal = BigDecimal.ZERO;
        BigDecimal categoryOtherIncomeTotal = BigDecimal.ZERO;
        List<FinancialCategoryLineAmountDto> categoryLineValues = new ArrayList<>();
        for (CashbookCategory category : categories) {
            BigDecimal amount = acc.categoryLineAmounts.getOrDefault(category.getId(), BigDecimal.ZERO);
            categoryLineValues.add(new FinancialCategoryLineAmountDto(category.getId(), amount));
            if (category.getType() == CashFlowType.PAYMENT) categoryExpenseTotal = categoryExpenseTotal.add(amount);
            else categoryOtherIncomeTotal = categoryOtherIncomeTotal.add(amount);
        }

        BigDecimal expenses = acc.expPayroll.add(categoryExpenseTotal);
        BigDecimal operatingProfit = grossProfit.subtract(expenses);

        BigDecimal otherIncome = categoryOtherIncomeTotal;
        BigDecimal otherExpense = BigDecimal.ZERO;
        BigDecimal netProfit = operatingProfit.add(otherIncome).subtract(otherExpense);

        return new FinancialPeriodResponse(
                key, label,
                acc.salesRevenue, discountReduction, acc.invoiceDiscount, returnedGoods,
                netRevenue, acc.cogs, grossProfit,
                expenses, acc.expPayroll,
                operatingProfit,
                otherIncome,
                otherExpense,
                netProfit,
                categoryLineValues);
    }

    private static class MonthAccumulator {
        BigDecimal salesRevenue = BigDecimal.ZERO;
        BigDecimal invoiceDiscount = BigDecimal.ZERO;
        BigDecimal cogs = BigDecimal.ZERO;
        BigDecimal expPayroll = BigDecimal.ZERO;
        Map<String, BigDecimal> categoryLineAmounts = new java.util.HashMap<>();

        void add(MonthAccumulator other) {
            salesRevenue = salesRevenue.add(other.salesRevenue);
            invoiceDiscount = invoiceDiscount.add(other.invoiceDiscount);
            cogs = cogs.add(other.cogs);
            expPayroll = expPayroll.add(other.expPayroll);
            other.categoryLineAmounts.forEach((id, amount) -> categoryLineAmounts.merge(id, amount, BigDecimal::add));
        }
    }

    @Override
    public List<FinancialCategoryLineDto> getFinancialReportLines() {
        return cashbookCategoryRepository.findByCodeIsNullAndAccountingToIncomeTrueOrderByNameAsc().stream()
                .map(c -> new FinancialCategoryLineDto(
                        c.getId(),
                        c.getType() == CashFlowType.PAYMENT ? FinancialLineGroup.EXPENSE : FinancialLineGroup.OTHER_INCOME,
                        c.getName()))
                .toList();
    }

    @Override public TrafficReportResponse getTrafficReport(LocalDate from, LocalDate to) { return null; }
    @Override public MenuPerformanceResponse getMenuPerformance(LocalDate from, LocalDate to) { return null; }

    @Override
    public DashboardOverviewResponse getDashboardOverview(
            LocalDateTime from, LocalDateTime to, DashboardGranularity granularity) {

        // Anchored on the authoritative SETTLEMENT instant (Payment.paidAt) — set exactly once,
        // in the same transaction as invoice.setPaid(true), by whichever path actually confirms
        // the money (CASH's immediate settlement, QR confirm, or VNPAY's settleVnpaySuccess,
        // shared by Return/IPN and any later QueryDR catch-up). An invoice created on one day can
        // settle on another (VNPAY left PENDING overnight, reconciled the next morning); revenue
        // must land in the period the money actually arrived in, not when the invoice was opened.
        // This deliberately diverges from the Financial/P&L and End-of-day reports, which bucket
        // by invoice.createdAt — that is pre-existing behavior of those two reports, audited but
        // intentionally left unchanged here (no shared query was touched; see PaymentRepository
        // .findSettledPaidBetween). PENDING/FAILED/CANCELLED/EXPIRED attempts are excluded by the
        // status filter in that query, and duplicate IPN/QueryDR processing can never surface more
        // than one PAID row per invoice (enforced by PaymentServiceImpl's stale-invoice guard) —
        // the dedupe below is a deterministic defensive backstop, not the primary safeguard.
        List<Payment> settledPayments = paymentRepository.findSettledPaidBetween(from, to);
        Map<String, Payment> settledPaymentByInvoiceId = dedupeToAuthoritativePaymentPerInvoice(settledPayments);

        List<String> invoiceIds = List.copyOf(settledPaymentByInvoiceId.keySet());
        Map<String, Invoice> invoicesById = invoiceIds.isEmpty()
                ? Map.of()
                : invoiceRepository.findAllById(invoiceIds).stream()
                        .collect(Collectors.toMap(Invoice::getId, i -> i));
        List<Invoice> invoices = List.copyOf(invoicesById.values());

        // Revenue summary. Deliberately NOT gated on order completion: a paid split invoice's
        // money was genuinely collected even before the rest of its order is closed.
        BigDecimal grossRevenue = invoices.stream()
                .map(Invoice::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDiscount = invoices.stream()
                .map(i -> i.getDiscountAmount() == null ? BigDecimal.ZERO : i.getDiscountAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netRevenue = invoices.stream()
                .map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        int paidInvoiceCount = invoices.size();

        // No order-level "completed" count: Order has no authoritative closedAt timestamp, and
        // OrderStatus is a mutable, current-state field. Counting "orders whose current status
        // is CLOSED, among those with a settled invoice in this window" double-attributes a split
        // order across periods — e.g. invoice A settles day 1, invoice B settles (and closes the
        // order) day 2: day 1's window would find invoice A (settled in-window) and the order
        // *currently* CLOSED, and day 2 would independently find the same thing for invoice B —
        // "completed" in both periods from one completion event. Reporting strictly on invoices
        // actually settled in [from, to) avoids this; see DashboardOverviewResponse.Revenue.
        BigDecimal averageInvoiceValue = paidInvoiceCount == 0
                ? BigDecimal.ZERO
                : netRevenue.divide(BigDecimal.valueOf(paidInvoiceCount), 0, RoundingMode.HALF_UP);

        DashboardOverviewResponse.Revenue revenue = new DashboardOverviewResponse.Revenue(
                grossRevenue, totalDiscount, netRevenue, paidInvoiceCount, averageInvoiceValue);

        List<DashboardOverviewResponse.RevenuePoint> revenueSeries =
                buildRevenueSeries(settledPaymentByInvoiceId, invoicesById, from, to, granularity);
        List<DashboardOverviewResponse.PaymentBreakdownRow> paymentBreakdown =
                buildPaymentBreakdown(settledPaymentByInvoiceId.values());
        List<DashboardOverviewResponse.MenuItemStat> topItems = buildTopItems(invoiceIds);

        return new DashboardOverviewResponse(revenue, revenueSeries, paymentBreakdown, topItems);
    }

    /** Resolves at most one authoritative PAID payment per invoice. The business invariant
     *  (PaymentServiceImpl) is that at most one payment per invoice ever reaches PAID; this
     *  tie-break (latest paidAt, then id) only guards against that invariant being violated by
     *  stale/anomalous data, so an invoice is never counted — or revenue-summed — twice. */
    private Map<String, Payment> dedupeToAuthoritativePaymentPerInvoice(List<Payment> payments) {
        Comparator<Payment> mostAuthoritative = Comparator
                .comparing((Payment p) -> p.getPaidAt() == null ? LocalDateTime.MIN : p.getPaidAt())
                .thenComparing(Payment::getId, Comparator.nullsLast(Comparator.naturalOrder()));
        return payments.stream().collect(Collectors.toMap(Payment::getInvoiceId, p -> p,
                (a, b) -> mostAuthoritative.compare(a, b) >= 0 ? a : b));
    }

    /** Every bucket across the half-open [from, to) range is emitted (continuous axis); empty
     *  buckets carry a real 0. Both ends are half-open by construction here: `from` is the first
     *  instant a bucket can start at, `to` is an exclusive upper bound the loop never reaches
     *  (`bucket.isBefore(to)`) — the frontend period resolver always passes "start of the
     *  day/period after the one intended" as `to`, so no payment near a boundary is ever silently
     *  dropped by second/millisecond truncation, and it can never land in two adjacent periods.
     *  Buckets by Payment.paidAt (settlement time), matching getDashboardOverview's revenue
     *  anchor — NOT invoice.createdAt. */
    private List<DashboardOverviewResponse.RevenuePoint> buildRevenueSeries(
            Map<String, Payment> settledPaymentByInvoiceId, Map<String, Invoice> invoicesById,
            LocalDateTime from, LocalDateTime to, DashboardGranularity granularity) {
        if (!from.isBefore(to)) return List.of();

        Map<LocalDateTime, BigDecimal> revenueByBucket = new TreeMap<>();
        Map<LocalDateTime, Integer> countByBucket = new TreeMap<>();
        for (LocalDateTime bucket = firstBucket(from, granularity);
             bucket.isBefore(to);
             bucket = nextBucket(bucket, granularity)) {
            revenueByBucket.put(bucket, BigDecimal.ZERO);
            countByBucket.put(bucket, 0);
        }

        for (Payment payment : settledPaymentByInvoiceId.values()) {
            if (payment.getPaidAt() == null) continue; // defensive — PAID always sets paidAt
            Invoice invoice = invoicesById.get(payment.getInvoiceId());
            if (invoice == null) continue;
            LocalDateTime bucket = bucketOf(payment.getPaidAt(), granularity);
            if (!revenueByBucket.containsKey(bucket)) continue; // outside the pre-filled range
            revenueByBucket.merge(bucket, invoice.getTotalAmount(), BigDecimal::add);
            countByBucket.merge(bucket, 1, Integer::sum);
        }

        return revenueByBucket.entrySet().stream()
                .map(e -> new DashboardOverviewResponse.RevenuePoint(
                        e.getKey(), e.getValue(), countByBucket.getOrDefault(e.getKey(), 0)))
                .toList();
    }

    private LocalDateTime firstBucket(LocalDateTime from, DashboardGranularity granularity) {
        return granularity == DashboardGranularity.HOUR
                ? from.truncatedTo(ChronoUnit.HOURS)
                : from.toLocalDate().atStartOfDay();
    }

    private LocalDateTime nextBucket(LocalDateTime bucket, DashboardGranularity granularity) {
        return granularity == DashboardGranularity.HOUR ? bucket.plusHours(1) : bucket.plusDays(1);
    }

    private LocalDateTime bucketOf(LocalDateTime time, DashboardGranularity granularity) {
        return granularity == DashboardGranularity.HOUR
                ? time.truncatedTo(ChronoUnit.HOURS)
                : time.toLocalDate().atStartOfDay();
    }

    /** Aggregates by method from the payments the caller already resolved to one authoritative,
     *  settled (status == PAID) row per invoice — see dedupeToAuthoritativePaymentPerInvoice.
     *  Because that same collection is what revenue is summed from, sum(amount) here reconciles
     *  to dashboard paid revenue by construction (payment.amount is always a snapshot of
     *  invoice.totalAmount at settlement — see PaymentServiceImpl). */
    private List<DashboardOverviewResponse.PaymentBreakdownRow> buildPaymentBreakdown(
            Collection<Payment> settledPayments) {
        if (settledPayments.isEmpty()) return List.of();

        Map<PaymentMethod, BigDecimal> amountByMethod = new EnumMap<>(PaymentMethod.class);
        Map<PaymentMethod, Integer> countByMethod = new EnumMap<>(PaymentMethod.class);
        for (Payment payment : settledPayments) {
            if (payment.getMethod() == null) continue;
            amountByMethod.merge(payment.getMethod(),
                    payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount(), BigDecimal::add);
            countByMethod.merge(payment.getMethod(), 1, Integer::sum);
        }
        return amountByMethod.entrySet().stream()
                .map(e -> new DashboardOverviewResponse.PaymentBreakdownRow(
                        e.getKey(), e.getValue(), countByMethod.getOrDefault(e.getKey(), 0)))
                .sorted(Comparator.comparing(DashboardOverviewResponse.PaymentBreakdownRow::amount).reversed())
                .toList();
    }

    /** Top 5 items by settled revenue, aggregated from InvoiceItemAllocation rows — NOT from
     *  "every payable item of an order that has some paid invoice". One order can have multiple
     *  invoices (split); joining paid-invoice → orderId → all of that order's items would credit
     *  quantity/revenue still sitting on a still-unpaid sibling invoice, and would silently
     *  duplicate nothing only by luck. Allocation rows are the authoritative, quantity-conserving
     *  link from an invoice to exactly the order-item quantity it covers: every invoice
     *  (split or not) gets them at generation time, a partial split shrinks the source's row and
     *  creates a new one on the child with the exact remainder (no quantity created or lost), and
     *  a merge combines source rows into one target row under a DB uniqueness constraint — so
     *  `active = true` rows scoped to this window's *paid invoice ids* can never double-count.
     *  unitPriceSnapshot is used (not the live OrderItem price) so a later menu price change can
     *  never retroactively change historical revenue. */
    private List<DashboardOverviewResponse.MenuItemStat> buildTopItems(List<String> invoiceIds) {
        if (invoiceIds.isEmpty()) return List.of();
        List<InvoiceItemAllocation> allocations = invoiceItemAllocationRepository.findAllByInvoiceIds(invoiceIds)
                .stream()
                .filter(InvoiceItemAllocation::isActive)
                .toList();
        if (allocations.isEmpty()) return List.of();

        Set<String> orderItemIds = allocations.stream()
                .map(InvoiceItemAllocation::getOrderItemId).collect(Collectors.toSet());
        Map<String, OrderItem> orderItemsById = orderItemRepository.findAllById(orderItemIds).stream()
                .collect(Collectors.toMap(OrderItem::getId, oi -> oi));

        Map<String, ItemAccumulator> byMenuItem = new java.util.LinkedHashMap<>();
        for (InvoiceItemAllocation allocation : allocations) {
            OrderItem orderItem = orderItemsById.get(allocation.getOrderItemId());
            if (orderItem == null) continue; // defensive — should always resolve
            ItemAccumulator acc = byMenuItem.computeIfAbsent(
                    orderItem.getMenuItemId(), k -> new ItemAccumulator(orderItem.getMenuItemName()));
            acc.quantity += allocation.getAllocatedQuantity();
            acc.revenue = acc.revenue.add(
                    allocation.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(allocation.getAllocatedQuantity())));
        }

        return byMenuItem.entrySet().stream()
                .map(e -> new DashboardOverviewResponse.MenuItemStat(
                        e.getKey(), e.getValue().name, e.getValue().quantity, e.getValue().revenue))
                .sorted(Comparator.comparing(DashboardOverviewResponse.MenuItemStat::revenue).reversed())
                .limit(5)
                .toList();
    }

    private static class ItemAccumulator {
        final String name;
        int quantity = 0;
        BigDecimal revenue = BigDecimal.ZERO;
        ItemAccumulator(String name) { this.name = name; }
    }

    @Override
    public List<EndOfDaySalesRow> getEndOfDaySales(
            LocalDateTime from, LocalDateTime to,
            List<String> staffIds, PaymentMethod paymentMethod, String areaName, String tableName) {

        List<Invoice> invoices = invoiceRepository.findPaidBetween(from, to);
        if (invoices.isEmpty()) return List.of();

        List<String> orderIds = invoices.stream().map(Invoice::getOrderId).distinct().toList();
        List<String> invoiceIds = invoices.stream().map(Invoice::getId).toList();

        Map<String, Order> ordersById = orderRepository.findAllById(orderIds).stream()
                .collect(Collectors.toMap(Order::getId, o -> o));

        // Batch cashier-name resolution — same pattern as ShiftServiceImpl's bulk cashier lookup.
        Set<String> cashierIds = ordersById.values().stream()
                .map(Order::getCashierId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, String> staffNamesById = userRepository.findAllById(cashierIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));

        Map<String, RestaurantTable> tablesById = tableRepository.findAll().stream()
                .collect(Collectors.toMap(RestaurantTable::getId, t -> t));

        Map<String, Integer> quantityByOrderId = orderItemRepository.findByOrderIdIn(orderIds).stream()
                .filter(this::isPayableItem)
                .collect(Collectors.groupingBy(oi -> oi.getOrder().getId(), Collectors.summingInt(OrderItem::getQuantity)));

        // One PAID payment per invoice at this stage — take the first if somehow more than one exists.
        Map<String, Payment> paymentByInvoiceId = paymentRepository.findByInvoiceIdIn(invoiceIds).stream()
                .collect(Collectors.toMap(Payment::getInvoiceId, p -> p, (a, b) -> a));

        return invoices.stream()
                .map(invoice -> toRow(invoice, ordersById, staffNamesById, tablesById, quantityByOrderId, paymentByInvoiceId))
                .filter(row -> staffIds == null || staffIds.isEmpty() || staffIds.contains(row.staffId()))
                .filter(row -> paymentMethod == null || paymentMethod == row.paymentMethod())
                .filter(row -> areaName == null || areaName.isBlank() || areaName.equals(row.areaName()))
                .filter(row -> tableName == null || tableName.isBlank() || tableName.equals(row.tableName()))
                .sorted(Comparator.comparing(EndOfDaySalesRow::time))
                .toList();
    }

    private EndOfDaySalesRow toRow(
            Invoice invoice, Map<String, Order> ordersById, Map<String, String> staffNamesById,
            Map<String, RestaurantTable> tablesById, Map<String, Integer> quantityByOrderId,
            Map<String, Payment> paymentByInvoiceId) {
        Order order = ordersById.get(invoice.getOrderId());
        RestaurantTable table = order != null ? tablesById.get(order.getTableId()) : null;
        Payment payment = paymentByInvoiceId.get(invoice.getId());
        String staffId = order != null ? order.getCashierId() : null;
        BigDecimal discount = invoice.getDiscountAmount() == null ? BigDecimal.ZERO : invoice.getDiscountAmount();

        return new EndOfDaySalesRow(
                invoice.getId(),
                invoice.getCode(),
                invoice.getCreatedAt(),
                table != null ? table.getName() : null,
                table != null ? table.getArea() : null,
                quantityByOrderId.getOrDefault(invoice.getOrderId(), 0),
                invoice.getSubtotal(),
                discount,
                invoice.getTotalAmount(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                payment != null ? payment.getAmount() : BigDecimal.ZERO,
                staffId,
                staffId != null ? staffNamesById.get(staffId) : null,
                payment != null ? payment.getMethod() : null);
    }

    private boolean isPayableItem(OrderItem item) {
        return item.getCookingStatus() == CookingStatus.READY || item.getCookingStatus() == CookingStatus.SERVED;
    }
}
