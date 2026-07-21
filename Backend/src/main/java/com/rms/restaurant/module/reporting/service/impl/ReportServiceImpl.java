package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.FinancialGranularity;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.enums.PayslipStatus;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payroll.model.PayrollSheet;
import com.rms.restaurant.module.payroll.model.Payslip;
import com.rms.restaurant.module.payroll.repository.PayrollSheetRepository;
import com.rms.restaurant.module.payroll.repository.PayslipRepository;
import com.rms.restaurant.module.reporting.dto.EndOfDaySalesRow;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineAmountDto;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineDto;
import com.rms.restaurant.module.reporting.dto.FinancialPeriodResponse;
import com.rms.restaurant.module.reporting.dto.MenuPerformanceResponse;
import com.rms.restaurant.module.reporting.dto.TrafficReportResponse;
import com.rms.restaurant.common.utils.enums.FinancialLineGroup;
import com.rms.restaurant.module.reporting.service.FinancialCustomLineService;
import com.rms.restaurant.module.reporting.service.ReportService;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
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
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final TableRepository tableRepository;
    private final MenuItemRepository menuItemRepository;
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

        accumulateRevenueAndCogs(byMonth, yearStart.atStartOfDay(), yearEnd.atTime(23, 59, 59));
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

    @Override public TrafficReportResponse getTrafficReport(LocalDate from, LocalDate to) { return null; }
    @Override public MenuPerformanceResponse getMenuPerformance(LocalDate from, LocalDate to) { return null; }

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
                invoice.getId(),
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
