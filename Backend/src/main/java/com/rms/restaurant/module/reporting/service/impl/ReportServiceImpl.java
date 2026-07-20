package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.reporting.dto.EndOfDaySalesRow;
import com.rms.restaurant.module.reporting.dto.FinancialReportResponse;
import com.rms.restaurant.module.reporting.dto.MenuPerformanceResponse;
import com.rms.restaurant.module.reporting.dto.TrafficReportResponse;
import com.rms.restaurant.module.reporting.service.ReportService;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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

    @Override public FinancialReportResponse getFinancialReport(LocalDate from, LocalDate to) { return null; }
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
