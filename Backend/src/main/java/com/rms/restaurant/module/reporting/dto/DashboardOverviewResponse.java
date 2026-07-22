package com.rms.restaurant.module.reporting.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Aggregated snapshot backing {@code /manager/dashboard} for one reporting period. Every figure is
 * derived server-side from invoices resolved through {@code PaymentRepository.findSettledPaidBetween}
 * — i.e. anchored on the authoritative SETTLEMENT instant (Payment.paidAt), not invoice creation
 * time, so a VNPAY invoice created on one day but only reconciled successfully the next lands in
 * the period the money actually arrived in. This intentionally diverges from the Financial (P&L)
 * and End-of-day reports, which bucket by invoice.createdAt (pre-existing, unaudited-here behavior
 * of those two reports, left unchanged). Unsuccessful/PENDING/FAILED/CANCELLED/EXPIRED payment
 * attempts never contribute. Live table occupancy is intentionally NOT here: it is point-in-time,
 * not period-bound, and the frontend reads it straight from the existing tables listing.
 */
public record DashboardOverviewResponse(
        Revenue revenue,
        List<RevenuePoint> revenueSeries,
        List<PaymentBreakdownRow> paymentBreakdown,
        List<MenuItemStat> topItems
) {
    /**
     * grossRevenue = Σ invoice.subtotal, totalDiscount = Σ invoice.discountAmount, netRevenue =
     * Σ invoice.totalAmount (the final settled amount). paidInvoiceCount is the number of
     * distinct invoices with one authoritative PAID payment settled in [from, to) — the
     * denominator for "Giá trị trung bình hóa đơn". averageInvoiceValue = netRevenue /
     * paidInvoiceCount (0 when none).
     *
     * <p>Deliberately exact-settlement-based, with no order-level "completed" count: an Order has
     * no authoritative closedAt timestamp, and OrderStatus is a current, mutable field — a split
     * order whose invoice A settles on day 1 and invoice B settles (closing the order) on day 2
     * would otherwise show as "completed" in BOTH periods once its status is CLOSED, since each
     * period independently finds one settled invoice for it. Reporting on invoices settled in the
     * period, rather than orders currently in a given status, avoids that double-attribution.
     */
    public record Revenue(
            BigDecimal grossRevenue,
            BigDecimal totalDiscount,
            BigDecimal netRevenue,
            int paidInvoiceCount,
            BigDecimal averageInvoiceValue
    ) {}

    /** One continuous time bucket. Buckets span the whole selected range so the axis stays
     *  continuous; a genuinely empty bucket carries a real zero, never a fabricated value. */
    public record RevenuePoint(LocalDateTime bucketStart, BigDecimal revenue, int invoiceCount) {}

    public record PaymentBreakdownRow(PaymentMethod method, BigDecimal amount, int count) {}

    /** Best-selling menu items by settled revenue. name is the denormalized order-item name, so a
     *  later-deleted menu item still reads correctly. */
    public record MenuItemStat(String menuItemId, String name, int quantity, BigDecimal revenue) {}
}
