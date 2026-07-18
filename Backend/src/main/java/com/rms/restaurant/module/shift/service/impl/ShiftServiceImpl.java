package com.rms.restaurant.module.shift.service.impl;

import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.common.utils.enums.AttendanceStatus;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.roster.repository.RosterAttendanceRepository;
import com.rms.restaurant.module.shift.dto.*;
import com.rms.restaurant.module.shift.mapper.ShiftMapper;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.model.ShiftCashMovement;
import com.rms.restaurant.module.shift.model.ShiftPaymentReconciliation;
import com.rms.restaurant.module.shift.repository.ShiftCashMovementRepository;
import com.rms.restaurant.module.shift.repository.ShiftPaymentReconciliationRepository;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import com.rms.restaurant.module.shift.service.ShiftService;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ShiftServiceImpl implements ShiftService {

    private static final String STATUS_OPEN          = "OPEN";
    private static final String STATUS_CLOSED        = "CLOSED";
    private static final String STATUS_PENDING_RECON = "PENDING_RECON";
    private static final List<OrderStatus> ACTIVE_ORDER_STATUSES =
            List.of(OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.SERVED);

    // BR-CS-06: when the restaurant matches online channels against bank/PSP
    // settlement reports, a closed shift sits in PENDING_RECON until a manager
    // finalizes it. When disabled (default), online actuals = recorded and the
    // shift closes straight to CLOSED.
    @Value("${rms.shift.settlement-matching-enabled:false}")
    private boolean settlementMatchingEnabled;

    private final ShiftRepository shiftRepo;
    private final ShiftCashMovementRepository cashMovRepo;
    private final ShiftPaymentReconciliationRepository reconciliationRepo;
    private final PaymentRepository paymentRepo;
    private final OrderRepository orderRepo;
    private final UserRepository userRepo;
    private final RosterAttendanceRepository attendanceRepo;
    private final ShiftMapper shiftMapper;
    private final AuditService auditService;

    // ── SM-01: Open Shift ─────────────────────────────────────────────────────

    @Override
    public ShiftSummaryResponse open(OpenShiftRequest request, String cashierUsername) {
        User cashier = resolveUser(cashierUsername);

        // BR-X-01: cashier must be CHECKED_IN on today's work shift
        boolean isClockedIn = attendanceRepo.existsByEmployeeIdAndWorkDateAndStatus(
                cashier.getId(), LocalDate.now(), AttendanceStatus.CHECKED_IN);
        if (!isClockedIn) {
            throw new ApplicationException(ApplicationError.CASHIER_NOT_CHECKED_IN);
        }

        // BR-CS-01: each cashier may have at most one OPEN shift at a time
        shiftRepo.findByCashierIdAndStatus(cashier.getId(), STATUS_OPEN).ifPresent(existing -> {
            throw new ApplicationException(ApplicationError.SHIFT_ALREADY_OPEN,
                    "You already have an open shift (opened at " + existing.getOpenedAt() + ")");
        });

        Shift shift = shiftRepo.save(Shift.builder()
                .cashierId(cashier.getId())
                .openedAt(LocalDateTime.now())
                .openingCash(request.openingCash())
                .status(STATUS_OPEN)
                .build());

        audit("SHIFT_OPEN", shift.getId(),
                "{\"cashierId\":\"" + esc(cashier.getId()) + "\",\"openingCash\":" + shift.getOpeningCash() + "}");

        return shiftMapper.toSummary(shift, List.of(), List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
    }

    // ── SM-02: Record Cash In / Cash Out ──────────────────────────────────────

    @Override
    public void addCashMovement(String shiftId, CashMovementRequest request, String operatorUsername) {
        User operator = resolveUser(operatorUsername);
        Shift shift = requireOpenShift(shiftId);

        String type = request.type().toUpperCase();
        if (!type.equals("CASH_IN") && !type.equals("CASH_OUT")) {
            throw new ApplicationException(ApplicationError.INVALID_CASH_MOVEMENT_TYPE);
        }

        if ("CASH_OUT".equals(type) && (request.reason() == null || request.reason().isBlank())) {
            throw new ApplicationException(ApplicationError.CASH_MOVEMENT_REASON_REQUIRED);
        }

        if ("CASH_OUT".equals(type)) {
            BigDecimal currentBalance = computeCurrentCashBalance(shift);
            if (currentBalance.subtract(request.amount()).compareTo(BigDecimal.ZERO) < 0) {
                throw new ApplicationException(ApplicationError.CASH_OUT_EXCEEDS_BALANCE,
                        "Current drawer balance is " + currentBalance
                                + "; cannot withdraw " + request.amount());
            }
        }

        cashMovRepo.save(ShiftCashMovement.builder()
                .shiftId(shiftId)
                .operatorId(operator.getId())
                .type(type)
                .amount(request.amount())
                .reason(request.reason())
                .build());

        audit("SHIFT_CASH_MOVEMENT", shiftId,
                "{\"type\":\"" + type + "\",\"amount\":" + request.amount()
                        + ",\"reason\":\"" + esc(request.reason()) + "\"}");
    }

    // ── SM-03: Close Shift ────────────────────────────────────────────────────

    @Override
    public ShiftSummaryResponse close(String shiftId, CloseShiftRequest request, String closingUsername) {
        User closingUser = resolveUser(closingUsername);
        Shift shift = shiftRepo.findById(shiftId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.SHIFT_NOT_FOUND));

        if (!STATUS_OPEN.equals(shift.getStatus())) {
            throw new ApplicationException(ApplicationError.SHIFT_CLOSED);
        }

        // BR-CS-02: only shift owner or manager/admin may close
        boolean isOwner   = shift.getCashierId().equals(closingUser.getId());
        boolean isManager = closingUser.getRole() == UserRole.MANAGER
                         || closingUser.getRole() == UserRole.ADMIN;
        if (!isOwner && !isManager) {
            throw new ApplicationException(ApplicationError.FORBIDDEN);
        }

        // BR-CLOSE-06: no active (unpaid) orders
        if (orderRepo.existsByStatusIn(ACTIVE_ORDER_STATUSES)) {
            throw new ApplicationException(ApplicationError.ORDER_NOT_CLOSEABLE,
                    "Cannot close shift: there are unfinished orders");
        }

        LocalDateTime closedAt = LocalDateTime.now();

        // Revenue per method from PAID payments during shift window
        List<Payment> shiftPayments = paymentRepo.findPaidPaymentsBetween(shift.getOpenedAt(), closedAt);
        Map<PaymentMethod, BigDecimal> salesByMethod = sumSalesByMethod(shiftPayments);

        List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shiftId);
        BigDecimal totalCashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal totalCashOut = sumMovements(movements, "CASH_OUT");

        Map<PaymentMethod, BigDecimal> expectedAmounts = buildExpectedAmounts(
                shift.getOpeningCash(), salesByMethod, totalCashIn, totalCashOut);

        // BR-CS-04 / BR-CS-13: the cashier reconciles CASH only. The three online
        // channels are auto-recorded at close (actual = recorded, zero variance);
        // true reconciliation happens later against settlement reports (BR-CS-06).
        BigDecimal actualCash   = request.cashActual();
        BigDecimal expectedCash = expectedAmounts.getOrDefault(PaymentMethod.CASH, BigDecimal.ZERO);
        BigDecimal cashVariance = actualCash.subtract(expectedCash);

        List<ShiftPaymentReconciliation> reconciliations = new ArrayList<>();
        BigDecimal totalRevenue = salesByMethod.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        for (PaymentMethod method : PaymentMethod.values()) {
            BigDecimal expected = expectedAmounts.getOrDefault(method, BigDecimal.ZERO);
            BigDecimal actual;
            BigDecimal variance;
            if (method == PaymentMethod.CASH) {
                actual   = actualCash;
                variance = cashVariance;
            } else {
                actual   = expected;            // online: actual = recorded
                variance = BigDecimal.ZERO;     // no cashier discrepancy
            }
            reconciliations.add(ShiftPaymentReconciliation.builder()
                    .shiftId(shiftId)
                    .paymentMethod(method)
                    .expectedAmount(expected)
                    .actualAmount(actual)
                    .variance(variance)
                    .build());
        }

        // BR-CS-05: closing note required when the cash variance is non-zero
        if (cashVariance.compareTo(BigDecimal.ZERO) != 0
                && (request.closingNote() == null || request.closingNote().isBlank())) {
            throw new ApplicationException(ApplicationError.SHIFT_VARIANCE_NOTE_REQUIRED);
        }

        // BR-CS-09: handover must not exceed actual cash on hand
        if (request.handoverAmount().compareTo(actualCash) > 0) {
            throw new ApplicationException(ApplicationError.SHIFT_HANDOVER_EXCEEDS_CASH,
                    "Handover " + request.handoverAmount() + " exceeds actual cash " + actualCash);
        }

        reconciliationRepo.saveAll(reconciliations);

        // BR-CS-06: sit in PENDING_RECON only when settlement matching is tracked
        // AND there are online sales to settle; otherwise close straight to CLOSED.
        BigDecimal onlineSales = totalRevenue.subtract(
                salesByMethod.getOrDefault(PaymentMethod.CASH, BigDecimal.ZERO));
        boolean pendingRecon = settlementMatchingEnabled
                && onlineSales.compareTo(BigDecimal.ZERO) > 0;

        shift.setStatus(pendingRecon ? STATUS_PENDING_RECON : STATUS_CLOSED);
        shift.setClosedAt(closedAt);
        shift.setClosedBy(closingUser.getId());
        shift.setClosingCash(actualCash);
        shift.setHandoverAmount(request.handoverAmount());
        shift.setCardBatchTotal(request.cardBatchTotal());     // BR-CS-12
        shift.setTotalRevenue(totalRevenue);
        shift.setClosingNote(request.closingNote());
        shiftRepo.save(shift);

        audit("SHIFT_CLOSE", shift.getId(),
                "{\"status\":\"" + shift.getStatus() + "\",\"closingCash\":" + actualCash
                        + ",\"cashVariance\":" + cashVariance + ",\"totalRevenue\":" + totalRevenue + "}");

        return shiftMapper.toSummary(shift, reconciliations, movements, totalCashIn, totalCashOut);
    }

    // ── SM-04: View Shift Summary ─────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ShiftSummaryResponse getSummary(String shiftId, String requestingUsername) {
        User user  = resolveUser(requestingUsername);
        Shift shift = shiftRepo.findById(shiftId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.SHIFT_NOT_FOUND));

        boolean isManager = user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN;
        if (!isManager && !shift.getCashierId().equals(user.getId())) {
            throw new ApplicationException(ApplicationError.FORBIDDEN);
        }

        List<ShiftCashMovement> movements    = cashMovRepo.findByShiftId(shiftId);
        List<ShiftPaymentReconciliation> recs = reconciliationRepo.findByShiftId(shiftId);

        BigDecimal totalCashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal totalCashOut = sumMovements(movements, "CASH_OUT");

        if (recs.isEmpty() && STATUS_OPEN.equals(shift.getStatus())) {
            recs = buildProvisionalRecs(shift, totalCashIn, totalCashOut);
        }

        return shiftMapper.toSummary(shift, recs, movements, totalCashIn, totalCashOut);
    }

    @Override
    @Transactional(readOnly = true)
    public ShiftSummaryResponse getMyOpenShift(String username) {
        User user = resolveUser(username);
        Shift shift = shiftRepo.findByCashierIdAndStatus(user.getId(), STATUS_OPEN)
                .orElseThrow(() -> new ApplicationException(ApplicationError.SHIFT_NOT_OPEN));

        List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shift.getId());
        BigDecimal totalCashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal totalCashOut = sumMovements(movements, "CASH_OUT");

        return shiftMapper.toSummary(shift,
                buildProvisionalRecs(shift, totalCashIn, totalCashOut),
                movements, totalCashIn, totalCashOut);
    }

    // ── CS-05: Manager Daily Summary ──────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public DailySummaryResponse dailySummary(LocalDate date, String requestingUsername) {
        User user = resolveUser(requestingUsername);
        boolean isManager = user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN;
        if (!isManager) {
            throw new ApplicationException(ApplicationError.FORBIDDEN);
        }

        List<Shift> shifts = shiftRepo.findByOpenedAtBetweenOrderByOpenedAtAsc(
                date.atStartOfDay(), date.plusDays(1).atStartOfDay());

        // Resolve cashier display names in one query
        List<String> cashierIds = shifts.stream().map(Shift::getCashierId).distinct().toList();
        Map<String, String> names = new HashMap<>();
        userRepo.findAllById(cashierIds).forEach(u -> names.put(u.getId(), u.getFullName()));

        Map<PaymentMethod, BigDecimal> dayExpected = new EnumMap<>(PaymentMethod.class);
        Map<PaymentMethod, BigDecimal> dayActual   = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod m : PaymentMethod.values()) {
            dayExpected.put(m, BigDecimal.ZERO);
            dayActual.put(m, BigDecimal.ZERO);
        }

        BigDecimal totalRevenue  = BigDecimal.ZERO;
        BigDecimal totalCashIn   = BigDecimal.ZERO;
        BigDecimal totalCashOut  = BigDecimal.ZERO;
        BigDecimal totalVariance = BigDecimal.ZERO;
        boolean incomplete = false;

        List<DailySummaryResponse.CashierShiftRow> rows = new ArrayList<>();

        for (Shift shift : shifts) {
            List<ShiftCashMovement> movements    = cashMovRepo.findByShiftId(shift.getId());
            List<ShiftPaymentReconciliation> recs = reconciliationRepo.findByShiftId(shift.getId());
            BigDecimal cashIn  = sumMovements(movements, "CASH_IN");
            BigDecimal cashOut = sumMovements(movements, "CASH_OUT");

            if (recs.isEmpty() && STATUS_OPEN.equals(shift.getStatus())) {
                recs = buildProvisionalRecs(shift, cashIn, cashOut);
            }
            // BR-CS-10: any non-CLOSED shift makes the day partial
            if (!STATUS_CLOSED.equals(shift.getStatus())) {
                incomplete = true;
            }

            ShiftSummaryResponse s = shiftMapper.toSummary(shift, recs, movements, cashIn, cashOut);

            rows.add(new DailySummaryResponse.CashierShiftRow(
                    s.id(), s.cashierId(), names.getOrDefault(s.cashierId(), s.cashierId()),
                    s.status(), s.openedAt(), s.closedAt(),
                    s.openingCash(), s.handoverAmount(),
                    s.totalRevenue(), s.totalCashIn(), s.totalCashOut(), s.totalVariance(),
                    s.paymentBreakdown()));

            totalRevenue  = totalRevenue.add(nz(s.totalRevenue()));
            totalCashIn   = totalCashIn.add(nz(s.totalCashIn()));
            totalCashOut  = totalCashOut.add(nz(s.totalCashOut()));
            totalVariance = totalVariance.add(nz(s.totalVariance()));

            for (PaymentMethodBreakdown b : s.paymentBreakdown()) {
                dayExpected.merge(b.method(), nz(b.expectedAmount()), BigDecimal::add);
                dayActual.merge(b.method(), nz(b.actualAmount()), BigDecimal::add);
            }
        }

        List<DailySummaryResponse.MethodTotal> methodTotals = new ArrayList<>();
        for (PaymentMethod m : PaymentMethod.values()) {
            BigDecimal exp = dayExpected.get(m);
            BigDecimal act = dayActual.get(m);
            methodTotals.add(new DailySummaryResponse.MethodTotal(m, exp, act, act.subtract(exp)));
        }

        return new DailySummaryResponse(
                date, incomplete, shifts.size(),
                totalRevenue, totalCashIn, totalCashOut, totalVariance,
                methodTotals, rows);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShiftSummaryResponse> listAll(Pageable pageable, String requestingUsername) {
        User user = resolveUser(requestingUsername);
        boolean isManager = user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN;
        if (!isManager) {
            throw new ApplicationException(ApplicationError.FORBIDDEN);
        }
        return shiftRepo.findAllByOrderByOpenedAtDesc(pageable)
                .map(shift -> {
                    List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shift.getId());
                    List<ShiftPaymentReconciliation> recs = reconciliationRepo.findByShiftId(shift.getId());
                    BigDecimal cashIn  = sumMovements(movements, "CASH_IN");
                    BigDecimal cashOut = sumMovements(movements, "CASH_OUT");
                    return shiftMapper.toSummary(shift, recs, movements, cashIn, cashOut);
                });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User resolveUser(String username) {
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new ApplicationException(ApplicationError.USER_NOT_FOUND));
    }

    private Shift requireOpenShift(String shiftId) {
        Shift shift = shiftRepo.findById(shiftId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.SHIFT_NOT_FOUND));
        if (!STATUS_OPEN.equals(shift.getStatus())) {
            throw new ApplicationException(ApplicationError.SHIFT_CLOSED);
        }
        return shift;
    }

    private BigDecimal computeCurrentCashBalance(Shift shift) {
        List<Payment> payments = paymentRepo.findPaidPaymentsBetween(
                shift.getOpenedAt(), LocalDateTime.now());
        BigDecimal cashSales = payments.stream()
                .filter(p -> p.getMethod() == PaymentMethod.CASH)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shift.getId());
        BigDecimal cashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal cashOut = sumMovements(movements, "CASH_OUT");

        return shift.getOpeningCash().add(cashSales).add(cashIn).subtract(cashOut);
    }

    private Map<PaymentMethod, BigDecimal> sumSalesByMethod(List<Payment> payments) {
        Map<PaymentMethod, BigDecimal> map = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod m : PaymentMethod.values()) map.put(m, BigDecimal.ZERO);
        for (Payment p : payments) {
            map.merge(p.getMethod(), p.getAmount(), BigDecimal::add);
        }
        return map;
    }

    // BR-CS-03: expected cash = opening float + cash sales + cash-in − cash-out
    private Map<PaymentMethod, BigDecimal> buildExpectedAmounts(
            BigDecimal openingCash,
            Map<PaymentMethod, BigDecimal> salesByMethod,
            BigDecimal totalCashIn,
            BigDecimal totalCashOut) {

        Map<PaymentMethod, BigDecimal> expected = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod method : PaymentMethod.values()) {
            if (method == PaymentMethod.CASH) {
                expected.put(method, openingCash
                        .add(salesByMethod.getOrDefault(PaymentMethod.CASH, BigDecimal.ZERO))
                        .add(totalCashIn)
                        .subtract(totalCashOut));
            } else {
                expected.put(method, salesByMethod.getOrDefault(method, BigDecimal.ZERO));
            }
        }
        return expected;
    }

    private List<ShiftPaymentReconciliation> buildProvisionalRecs(
            Shift shift, BigDecimal totalCashIn, BigDecimal totalCashOut) {

        List<Payment> payments = paymentRepo.findPaidPaymentsBetween(
                shift.getOpenedAt(), LocalDateTime.now());
        Map<PaymentMethod, BigDecimal> salesByMethod = sumSalesByMethod(payments);
        Map<PaymentMethod, BigDecimal> expected =
                buildExpectedAmounts(shift.getOpeningCash(), salesByMethod, totalCashIn, totalCashOut);

        List<ShiftPaymentReconciliation> recs = new ArrayList<>();
        for (PaymentMethod method : PaymentMethod.values()) {
            recs.add(ShiftPaymentReconciliation.builder()
                    .shiftId(shift.getId())
                    .paymentMethod(method)
                    .expectedAmount(expected.getOrDefault(method, BigDecimal.ZERO))
                    .actualAmount(BigDecimal.ZERO)
                    .variance(BigDecimal.ZERO)
                    .build());
        }
        return recs;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private BigDecimal sumMovements(List<ShiftCashMovement> movements, String type) {
        return movements.stream()
                .filter(m -> type.equals(m.getType()))
                .map(ShiftCashMovement::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void audit(String action, String id, String detail) {
        try { auditService.log(action, "Shift", id, detail); }
        catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
