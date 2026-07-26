package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.common.utils.enums.DashboardGranularity;
import com.rms.restaurant.common.utils.enums.FinancialGranularity;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.enums.PayslipStatus;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
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
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineAmountDto;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineDto;
import com.rms.restaurant.module.reporting.dto.FinancialPeriodResponse;
import com.rms.restaurant.common.utils.enums.FinancialLineGroup;
import com.rms.restaurant.module.reporting.service.FinancialCustomLineService;
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
    private final PayrollSheetRepository payrollSheetRepository;
    private final PayslipRepository payslipRepository;
    private final FinancialCustomLineService financialCustomLineService;

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

        accumulateRevenueAndCogs(byMonth, yearStart.atStartOfDay(), yearEnd.plusDays(1).atStartOfDay());
        accumulatePayroll(byMonth, yearStart, yearEnd);

        List<FinancialCustomLineDto> customLines = financialCustomLineService.list();
        accumulateCustomLines(byMonth, financialCustomLineService.getValuesForYear(year));

        List<Map.Entry<YearMonth, MonthAccumulator>> monthEntries = new ArrayList<>(byMonth.entrySet());

        List<FinancialPeriodResponse> periods = switch (granularity) {
            case MONTH -> monthEntries.stream()
                    .map(e -> toResponse(monthKey(e.getKey()), monthLabel(e.getKey()), e.getValue(), customLines))
                    .toList();
            case QUARTER -> buildQuarterPeriods(monthEntries, year, customLines);
            case YEAR -> buildYearPeriod(monthEntries, year, customLines);
        };

        List<FinancialPeriodResponse> mostRecentFirst = new ArrayList<>(periods);
        Collections.reverse(mostRecentFirst);
        return mostRecentFirst;
    }

    /** Revenue, invoice discounts and allocation-scoped COGS, bucketed by settlement month. */
    private void accumulateRevenueAndCogs(
            Map<YearMonth, MonthAccumulator> byMonth,
            LocalDateTime from,
            LocalDateTime toExclusive
    ) {
        SettledInvoices settled = loadSettledInvoices(from, toExclusive);
        if (settled.invoicesById().isEmpty()) return;

        Map<String, BigDecimal> cogsByInvoiceId = computeCogsByInvoice(settled.invoiceIds());
        for (Map.Entry<String, Payment> entry : settled.paymentsByInvoiceId().entrySet()) {
            Payment payment = entry.getValue();
            Invoice invoice = settled.invoicesById().get(entry.getKey());
            if (invoice == null || payment.getPaidAt() == null) continue;
            MonthAccumulator acc = byMonth.get(YearMonth.from(payment.getPaidAt()));
            if (acc == null) continue;
            BigDecimal discount = invoice.getDiscountAmount() == null ? BigDecimal.ZERO : invoice.getDiscountAmount();
            acc.salesRevenue = acc.salesRevenue.add(invoice.getSubtotal());
            acc.invoiceDiscount = acc.invoiceDiscount.add(discount);
            acc.cogs = acc.cogs.add(cogsByInvoiceId.getOrDefault(invoice.getId(), BigDecimal.ZERO));
        }
    }

    private Map<String, BigDecimal> computeCogsByInvoice(List<String> invoiceIds) {
        List<InvoiceItemAllocation> allocations = invoiceItemAllocationRepository
                .findAllByInvoiceIds(invoiceIds).stream()
                .filter(InvoiceItemAllocation::isActive)
                .toList();
        Map<String, BigDecimal> cogsByInvoiceId = new java.util.HashMap<>();
        for (InvoiceItemAllocation allocation : allocations) {
            BigDecimal unitCost = allocation.getUnitCostSnapshot() == null
                    ? BigDecimal.ZERO
                    : allocation.getUnitCostSnapshot();
            BigDecimal cost = unitCost
                    .multiply(BigDecimal.valueOf(allocation.getAllocatedQuantity()));
            cogsByInvoiceId.merge(allocation.getInvoiceId(), cost, BigDecimal::add);
        }
        return cogsByInvoiceId;
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
            List<Map.Entry<YearMonth, MonthAccumulator>> monthEntries, int year, List<FinancialCustomLineDto> customLines) {
        Map<Integer, MonthAccumulator> byQuarter = new TreeMap<>();
        for (Map.Entry<YearMonth, MonthAccumulator> e : monthEntries) {
            int quarter = (e.getKey().getMonthValue() - 1) / 3 + 1;
            byQuarter.computeIfAbsent(quarter, q -> new MonthAccumulator()).add(e.getValue());
        }
        return byQuarter.entrySet().stream()
                .map(e -> toResponse(year + "-Q" + e.getKey(), "Q" + e.getKey() + "." + year, e.getValue(), customLines))
                .toList();
    }

    private List<FinancialPeriodResponse> buildYearPeriod(
            List<Map.Entry<YearMonth, MonthAccumulator>> monthEntries, int year, List<FinancialCustomLineDto> customLines) {
        MonthAccumulator total = new MonthAccumulator();
        for (Map.Entry<YearMonth, MonthAccumulator> e : monthEntries) total.add(e.getValue());
        return List.of(toResponse(String.valueOf(year), String.valueOf(year), total, customLines));
    }

    /** Folds each user-defined custom line's per-month entered amount into the matching
     * MonthAccumulator, so quarter/year aggregation (MonthAccumulator.add) sums them for free. */
    private void accumulateCustomLines(Map<YearMonth, MonthAccumulator> byMonth, Map<String, BigDecimal[]> valuesByLine) {
        for (Map.Entry<YearMonth, MonthAccumulator> e : byMonth.entrySet()) {
            int monthIndex = e.getKey().getMonthValue() - 1;
            for (Map.Entry<String, BigDecimal[]> lineEntry : valuesByLine.entrySet()) {
                BigDecimal amount = lineEntry.getValue()[monthIndex];
                if (amount != null && amount.signum() != 0) {
                    e.getValue().customLineAmounts.merge(lineEntry.getKey(), amount, BigDecimal::add);
                }
            }
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
     * expenses/otherIncome now fold in the user-managed custom lines (see FinancialCustomLine)
     * instead of the old fixed zero placeholders. */
    private FinancialPeriodResponse toResponse(
            String key, String label, MonthAccumulator acc, List<FinancialCustomLineDto> customLines) {
        BigDecimal returnedGoods = BigDecimal.ZERO;
        BigDecimal discountReduction = acc.invoiceDiscount.add(returnedGoods);
        BigDecimal netRevenue = acc.salesRevenue.subtract(discountReduction);
        BigDecimal grossProfit = netRevenue.subtract(acc.cogs);

        BigDecimal customExpenseTotal = BigDecimal.ZERO;
        BigDecimal customOtherIncomeTotal = BigDecimal.ZERO;
        List<FinancialCustomLineAmountDto> customLineValues = new ArrayList<>();
        for (FinancialCustomLineDto line : customLines) {
            BigDecimal amount = acc.customLineAmounts.getOrDefault(line.id(), BigDecimal.ZERO);
            customLineValues.add(new FinancialCustomLineAmountDto(line.id(), amount));
            if (line.group() == FinancialLineGroup.EXPENSE) customExpenseTotal = customExpenseTotal.add(amount);
            else customOtherIncomeTotal = customOtherIncomeTotal.add(amount);
        }

        BigDecimal expenses = acc.expPayroll.add(customExpenseTotal);
        BigDecimal operatingProfit = grossProfit.subtract(expenses);

        BigDecimal otherIncome = customOtherIncomeTotal;
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
                customLineValues);
    }

    private static class MonthAccumulator {
        BigDecimal salesRevenue = BigDecimal.ZERO;
        BigDecimal invoiceDiscount = BigDecimal.ZERO;
        BigDecimal cogs = BigDecimal.ZERO;
        BigDecimal expPayroll = BigDecimal.ZERO;
        Map<String, BigDecimal> customLineAmounts = new java.util.HashMap<>();

        void add(MonthAccumulator other) {
            salesRevenue = salesRevenue.add(other.salesRevenue);
            invoiceDiscount = invoiceDiscount.add(other.invoiceDiscount);
            cogs = cogs.add(other.cogs);
            expPayroll = expPayroll.add(other.expPayroll);
            other.customLineAmounts.forEach((lineId, amount) -> customLineAmounts.merge(lineId, amount, BigDecimal::add));
        }
    }

    @Override
    public DashboardOverviewResponse getDashboardOverview(
            LocalDateTime from, LocalDateTime to, DashboardGranularity granularity) {
        SettledInvoices settled = loadSettledInvoices(from, to);
        DashboardOverviewResponse.Revenue revenue = buildRevenue(settled.invoicesById().values());
        List<DashboardOverviewResponse.RevenuePoint> revenueSeries = buildRevenueSeries(
                settled.paymentsByInvoiceId(), settled.invoicesById(), from, to, granularity);
        List<DashboardOverviewResponse.PaymentBreakdownRow> paymentBreakdown =
                buildPaymentBreakdown(settled.paymentsByInvoiceId().values());
        List<DashboardOverviewResponse.MenuItemStat> topItems = buildTopItems(settled.invoiceIds());
        return new DashboardOverviewResponse(revenue, revenueSeries, paymentBreakdown, topItems);
    }

    /** Invoice-based revenue avoids attributing one split order to multiple completion periods. */
    private DashboardOverviewResponse.Revenue buildRevenue(Collection<Invoice> invoices) {
        BigDecimal grossRevenue = invoices.stream()
                .map(Invoice::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDiscount = invoices.stream()
                .map(i -> i.getDiscountAmount() == null ? BigDecimal.ZERO : i.getDiscountAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netRevenue = invoices.stream()
                .map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        int paidInvoiceCount = invoices.size();
        BigDecimal averageInvoiceValue = paidInvoiceCount == 0
                ? BigDecimal.ZERO
                : netRevenue.divide(BigDecimal.valueOf(paidInvoiceCount), 0, RoundingMode.HALF_UP);
        return new DashboardOverviewResponse.Revenue(
                grossRevenue, totalDiscount, netRevenue, paidInvoiceCount, averageInvoiceValue);
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

    private SettledInvoices loadSettledInvoices(LocalDateTime from, LocalDateTime toExclusive) {
        Map<String, Payment> paymentsByInvoiceId = dedupeToAuthoritativePaymentPerInvoice(
                paymentRepository.findSettledPaidBetween(from, toExclusive)
        );
        List<String> invoiceIds = paymentsByInvoiceId.keySet().stream().sorted().toList();
        Map<String, Invoice> invoicesById = invoiceIds.isEmpty()
                ? Map.of()
                : invoiceRepository.findAllById(invoiceIds).stream()
                        .collect(Collectors.toMap(Invoice::getId, invoice -> invoice));
        return new SettledInvoices(paymentsByInvoiceId, invoiceIds, invoicesById);
    }

    private record SettledInvoices(
            Map<String, Payment> paymentsByInvoiceId,
            List<String> invoiceIds,
            Map<String, Invoice> invoicesById
    ) {}

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

        SettledInvoices settled = loadSettledInvoices(from, to);
        List<Invoice> invoices = List.copyOf(settled.invoicesById().values());
        if (invoices.isEmpty()) return List.of();
        EndOfDayLookup lookup = loadEndOfDayLookup(invoices, settled.paymentsByInvoiceId());
        return invoices.stream()
                .map(invoice -> toRow(invoice, lookup))
                .filter(row -> staffIds == null || staffIds.isEmpty() || staffIds.contains(row.staffId()))
                .filter(row -> paymentMethod == null || paymentMethod == row.paymentMethod())
                .filter(row -> areaName == null || areaName.isBlank() || areaName.equals(row.areaName()))
                .filter(row -> tableName == null || tableName.isBlank() || tableName.equals(row.tableName()))
                .sorted(Comparator.comparing(EndOfDaySalesRow::time))
                .toList();
    }

    private EndOfDayLookup loadEndOfDayLookup(
            List<Invoice> invoices,
            Map<String, Payment> paymentsByInvoiceId
    ) {
        List<String> orderIds = invoices.stream().map(Invoice::getOrderId).distinct().toList();
        List<String> invoiceIds = invoices.stream().map(Invoice::getId).toList();
        Map<String, Order> ordersById = orderRepository.findAllById(orderIds).stream()
                .collect(Collectors.toMap(Order::getId, order -> order));
        Set<String> cashierIds = ordersById.values().stream()
                .map(Order::getCashierId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, String> staffNamesById = userRepository.findAllById(cashierIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        Map<String, RestaurantTable> tablesById = tableRepository.findAll().stream()
                .collect(Collectors.toMap(RestaurantTable::getId, table -> table));
        Map<String, Integer> quantityByInvoiceId = invoiceItemAllocationRepository
                .findAllByInvoiceIds(invoiceIds).stream()
                .filter(InvoiceItemAllocation::isActive)
                .collect(Collectors.groupingBy(InvoiceItemAllocation::getInvoiceId,
                        Collectors.summingInt(InvoiceItemAllocation::getAllocatedQuantity)));
        return new EndOfDayLookup(
                ordersById, staffNamesById, tablesById, quantityByInvoiceId, paymentsByInvoiceId);
    }

    private EndOfDaySalesRow toRow(Invoice invoice, EndOfDayLookup lookup) {
        Order order = lookup.ordersById().get(invoice.getOrderId());
        RestaurantTable table = order != null ? lookup.tablesById().get(order.getTableId()) : null;
        Payment payment = lookup.paymentsByInvoiceId().get(invoice.getId());
        String staffId = order != null ? order.getCashierId() : null;
        BigDecimal discount = invoice.getDiscountAmount() == null ? BigDecimal.ZERO : invoice.getDiscountAmount();

        return new EndOfDaySalesRow(
                invoice.getId(),
                invoice.getCode(),
                payment != null ? payment.getPaidAt() : null,
                table != null ? table.getName() : null,
                table != null ? table.getArea() : null,
                lookup.quantityByInvoiceId().getOrDefault(invoice.getId(), 0),
                invoice.getSubtotal(),
                discount,
                invoice.getTotalAmount(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                payment != null ? payment.getAmount() : BigDecimal.ZERO,
                staffId,
                staffId != null ? lookup.staffNamesById().get(staffId) : null,
                payment != null ? payment.getMethod() : null);
    }

    private record EndOfDayLookup(
            Map<String, Order> ordersById,
            Map<String, String> staffNamesById,
            Map<String, RestaurantTable> tablesById,
            Map<String, Integer> quantityByInvoiceId,
            Map<String, Payment> paymentsByInvoiceId
    ) {}

}
