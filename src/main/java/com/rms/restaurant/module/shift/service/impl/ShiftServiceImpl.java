package com.rms.restaurant.module.shift.service.impl;

import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.shift.dto.*;
import com.rms.restaurant.module.shift.mapper.ShiftMapper;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.model.ShiftCashMovement;
import com.rms.restaurant.module.shift.model.ShiftPaymentReconciliation;
import com.rms.restaurant.module.shift.repository.ShiftCashMovementRepository;
import com.rms.restaurant.module.shift.repository.ShiftPaymentReconciliationRepository;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import com.rms.restaurant.module.shift.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class ShiftServiceImpl implements ShiftService {

    private static final String STATUS_OPEN   = "OPEN";
    private static final String STATUS_CLOSED = "CLOSED";
    private static final List<OrderStatus> ACTIVE_ORDER_STATUSES =
            List.of(OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.SERVED);

    private final ShiftRepository shiftRepo;
    private final ShiftCashMovementRepository cashMovRepo;
    private final ShiftPaymentReconciliationRepository reconciliationRepo;
    private final PaymentRepository paymentRepo;
    private final OrderRepository orderRepo;
    private final UserRepository userRepo;
    private final ShiftMapper shiftMapper;

<<<<<<< HEAD
    // ── SM-01: Open Shift ─────────────────────────────────────────────────────
=======
    // ── Open Shift ────────────────────────────────────────────────────────────
>>>>>>> origin/develop

    @Override
    public ShiftSummaryResponse open(OpenShiftRequest request, String cashierUsername) {
        User cashier = resolveUser(cashierUsername);

        // BR-OPEN-02: only one OPEN shift system-wide
        shiftRepo.findByStatus(STATUS_OPEN).ifPresent(existing -> {
            throw new ApplicationException(ApplicationError.SHIFT_ALREADY_OPEN,
                    "A shift is already open (opened by " + existing.getCashierId()
                            + " at " + existing.getOpenedAt() + ")");
        });

<<<<<<< HEAD
        // BR-OPEN-01, BR-OPEN-03
=======
>>>>>>> origin/develop
        Shift shift = shiftRepo.save(Shift.builder()
                .cashierId(cashier.getId())
                .openedAt(LocalDateTime.now())
                .openingCash(request.openingCash())
                .status(STATUS_OPEN)
                .build());

        return shiftMapper.toSummary(shift, List.of(), List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
    }

<<<<<<< HEAD
    // ── SM-02: Record Cash In / Cash Out ──────────────────────────────────────
=======
    // ── Record Cash In / Out ──────────────────────────────────────────────────
>>>>>>> origin/develop

    @Override
    public void addCashMovement(String shiftId, CashMovementRequest request, String operatorUsername) {
        User operator = resolveUser(operatorUsername);
<<<<<<< HEAD
        Shift shift = requireOpenShift(shiftId);

        // BR-CASH-02: valid type
=======
        Shift shift   = requireOpenShift(shiftId);

>>>>>>> origin/develop
        String type = request.type().toUpperCase();
        if (!type.equals("CASH_IN") && !type.equals("CASH_OUT")) {
            throw new ApplicationException(ApplicationError.INVALID_CASH_MOVEMENT_TYPE);
        }

<<<<<<< HEAD
        // BR-CASH-04: CASH_OUT requires reason
=======
        // BR-CASH-04: CASH_OUT must have reason
>>>>>>> origin/develop
        if ("CASH_OUT".equals(type) && (request.reason() == null || request.reason().isBlank())) {
            throw new ApplicationException(ApplicationError.CASH_MOVEMENT_REASON_REQUIRED);
        }

<<<<<<< HEAD
        // BR-CASH-05: CASH_OUT must not exceed current drawer balance
        if ("CASH_OUT".equals(type)) {
            BigDecimal currentBalance = computeCurrentCashBalance(shift);
            if (currentBalance.subtract(request.amount()).compareTo(BigDecimal.ZERO) < 0) {
                throw new ApplicationException(ApplicationError.CASH_OUT_EXCEEDS_BALANCE,
                        "Current drawer balance is " + currentBalance
                                + "; cannot withdraw " + request.amount());
            }
        }

        // BR-CASH-06: persist full audit record
=======
        // BR-CASH-05: CASH_OUT must not exceed drawer balance
        if ("CASH_OUT".equals(type)) {
            BigDecimal balance = computeCurrentCashBalance(shift);
            if (balance.subtract(request.amount()).compareTo(BigDecimal.ZERO) < 0) {
                throw new ApplicationException(ApplicationError.CASH_OUT_EXCEEDS_BALANCE,
                        "Current drawer balance is " + balance + "; cannot withdraw " + request.amount());
            }
        }

>>>>>>> origin/develop
        cashMovRepo.save(ShiftCashMovement.builder()
                .shiftId(shiftId)
                .operatorId(operator.getId())
                .type(type)
                .amount(request.amount())
                .reason(request.reason())
                .build());
    }

<<<<<<< HEAD
    // ── SM-03: Close Shift ────────────────────────────────────────────────────
=======
    // ── Close Shift ───────────────────────────────────────────────────────────
>>>>>>> origin/develop

    @Override
    public ShiftSummaryResponse close(String shiftId, CloseShiftRequest request, String closingUsername) {
        User closingUser = resolveUser(closingUsername);
        Shift shift = shiftRepo.findById(shiftId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.SHIFT_NOT_FOUND));

<<<<<<< HEAD
        // BR-CLOSE-01: must be OPEN
=======
        // BR-CLOSE-01
>>>>>>> origin/develop
        if (!STATUS_OPEN.equals(shift.getStatus())) {
            throw new ApplicationException(ApplicationError.SHIFT_CLOSED);
        }

<<<<<<< HEAD
        // BR-CLOSE-07: only shift owner or manager/admin may close
=======
        // BR-CLOSE-07: owner or manager/admin only
>>>>>>> origin/develop
        boolean isOwner   = shift.getCashierId().equals(closingUser.getId());
        boolean isManager = closingUser.getRole() == UserRole.MANAGER
                         || closingUser.getRole() == UserRole.ADMIN;
        if (!isOwner && !isManager) {
            throw new ApplicationException(ApplicationError.FORBIDDEN);
        }

<<<<<<< HEAD
        // BR-CLOSE-06: no active (unpaid) orders
=======
        // BR-CLOSE-06: no active orders
>>>>>>> origin/develop
        if (orderRepo.existsByStatusIn(ACTIVE_ORDER_STATUSES)) {
            throw new ApplicationException(ApplicationError.ORDER_NOT_CLOSEABLE,
                    "Cannot close shift: there are unfinished orders");
        }

        LocalDateTime closedAt = LocalDateTime.now();

<<<<<<< HEAD
        // BR-CLOSE-03: revenue per method from PAID payments during shift window
        List<Payment> shiftPayments = paymentRepo.findPaidPaymentsBetween(shift.getOpenedAt(), closedAt);
        Map<PaymentMethod, BigDecimal> salesByMethod = sumSalesByMethod(shiftPayments);

        // Cash drawer cash movements
=======
        List<Payment> shiftPayments = paymentRepo.findPaidPaymentsBetween(shift.getOpenedAt(), closedAt);
        Map<PaymentMethod, BigDecimal> salesByMethod = sumSalesByMethod(shiftPayments);

>>>>>>> origin/develop
        List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shiftId);
        BigDecimal totalCashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal totalCashOut = sumMovements(movements, "CASH_OUT");

<<<<<<< HEAD
        // Expected amounts per method
        Map<PaymentMethod, BigDecimal> expectedAmounts = buildExpectedAmounts(
                shift.getOpeningCash(), salesByMethod, totalCashIn, totalCashOut);

        // Actual amounts supplied by cashier
        Map<PaymentMethod, BigDecimal> actualAmounts = new EnumMap<>(PaymentMethod.class);
        request.actualAmounts().forEach(a -> actualAmounts.put(a.method(), a.amount()));

        // BR-CLOSE-04: variances + reconciliation records
        List<ShiftPaymentReconciliation> reconciliations = new ArrayList<>();
        BigDecimal totalRevenue = salesByMethod.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
=======
        Map<PaymentMethod, BigDecimal> expectedAmounts =
                buildExpectedAmounts(shift.getOpeningCash(), salesByMethod, totalCashIn, totalCashOut);

        Map<PaymentMethod, BigDecimal> actualAmounts = new EnumMap<>(PaymentMethod.class);
        request.actualAmounts().forEach(a -> actualAmounts.put(a.method(), a.amount()));

        // BR-CLOSE-04: compute variances and reconciliation records
        List<ShiftPaymentReconciliation> reconciliations = new ArrayList<>();
        BigDecimal totalRevenue  = salesByMethod.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
>>>>>>> origin/develop
        BigDecimal totalVariance = BigDecimal.ZERO;

        for (PaymentMethod method : PaymentMethod.values()) {
            BigDecimal expected = expectedAmounts.getOrDefault(method, BigDecimal.ZERO);
            BigDecimal actual   = actualAmounts.getOrDefault(method, BigDecimal.ZERO);
            BigDecimal variance = actual.subtract(expected);
            totalVariance = totalVariance.add(variance.abs());

            reconciliations.add(ShiftPaymentReconciliation.builder()
                    .shiftId(shiftId)
                    .paymentMethod(method)
                    .expectedAmount(expected)
                    .actualAmount(actual)
                    .variance(variance)
                    .build());
        }

<<<<<<< HEAD
        // BR-CLOSE-05: closing note required when any variance is non-zero
=======
        // BR-CLOSE-05: closing note required when any variance exists
>>>>>>> origin/develop
        boolean hasVariance = reconciliations.stream()
                .anyMatch(r -> r.getVariance().compareTo(BigDecimal.ZERO) != 0);
        if (hasVariance && (request.closingNote() == null || request.closingNote().isBlank())) {
            throw new ApplicationException(ApplicationError.SHIFT_VARIANCE_NOTE_REQUIRED);
        }

<<<<<<< HEAD
        // BR-CLOSE-08: persist and lock shift
        reconciliationRepo.saveAll(reconciliations);

        BigDecimal actualCash = actualAmounts.getOrDefault(PaymentMethod.CASH, BigDecimal.ZERO);
        shift.setStatus(STATUS_CLOSED);
        shift.setClosedAt(closedAt);
        shift.setClosedBy(closingUser.getId());
        shift.setClosingCash(actualCash);
=======
        // BR-CLOSE-08: persist and lock
        reconciliationRepo.saveAll(reconciliations);

        shift.setStatus(STATUS_CLOSED);
        shift.setClosedAt(closedAt);
        shift.setClosedBy(closingUser.getId());
        shift.setClosingCash(actualAmounts.getOrDefault(PaymentMethod.CASH, BigDecimal.ZERO));
>>>>>>> origin/develop
        shift.setTotalRevenue(totalRevenue);
        shift.setClosingNote(request.closingNote());
        shiftRepo.save(shift);

        return shiftMapper.toSummary(shift, reconciliations, movements, totalCashIn, totalCashOut);
    }

<<<<<<< HEAD
    // ── SM-04: View Shift Summary ─────────────────────────────────────────────
=======
    // ── View Shift Summary ────────────────────────────────────────────────────
>>>>>>> origin/develop

    @Override
    @Transactional(readOnly = true)
    public ShiftSummaryResponse getSummary(String shiftId, String requestingUsername) {
        User user  = resolveUser(requestingUsername);
        Shift shift = shiftRepo.findById(shiftId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.SHIFT_NOT_FOUND));

<<<<<<< HEAD
        // BR-SUM-03: employees see own shifts only; managers see all
=======
        // BR-SUM-03: employees see own; managers see all
>>>>>>> origin/develop
        boolean isManager = user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN;
        if (!isManager && !shift.getCashierId().equals(user.getId())) {
            throw new ApplicationException(ApplicationError.FORBIDDEN);
        }

        List<ShiftCashMovement> movements    = cashMovRepo.findByShiftId(shiftId);
        List<ShiftPaymentReconciliation> recs = reconciliationRepo.findByShiftId(shiftId);
<<<<<<< HEAD

        BigDecimal totalCashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal totalCashOut = sumMovements(movements, "CASH_OUT");

        // For an OPEN shift, build provisional reconciliation from live payments (BR-SUM-02)
        if (recs.isEmpty() && STATUS_OPEN.equals(shift.getStatus())) {
            List<Payment> shiftPayments = paymentRepo.findPaidPaymentsBetween(
                    shift.getOpenedAt(), LocalDateTime.now());
            Map<PaymentMethod, BigDecimal> salesByMethod = sumSalesByMethod(shiftPayments);
            Map<PaymentMethod, BigDecimal> expectedAmounts = buildExpectedAmounts(
                    shift.getOpeningCash(), salesByMethod, totalCashIn, totalCashOut);

            for (PaymentMethod method : PaymentMethod.values()) {
                recs.add(ShiftPaymentReconciliation.builder()
                        .shiftId(shiftId)
                        .paymentMethod(method)
                        .expectedAmount(expectedAmounts.getOrDefault(method, BigDecimal.ZERO))
                        .actualAmount(BigDecimal.ZERO)
                        .variance(BigDecimal.ZERO)
                        .build());
            }
=======
        BigDecimal totalCashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal totalCashOut = sumMovements(movements, "CASH_OUT");

        // For OPEN shifts: build provisional figures (BR-SUM-02)
        if (recs.isEmpty() && STATUS_OPEN.equals(shift.getStatus())) {
            recs = buildProvisionalRecs(shift, totalCashIn, totalCashOut);
>>>>>>> origin/develop
        }

        return shiftMapper.toSummary(shift, recs, movements, totalCashIn, totalCashOut);
    }

    @Override
    @Transactional(readOnly = true)
    public ShiftSummaryResponse getOpenShiftSummary() {
        Shift shift = shiftRepo.findByStatus(STATUS_OPEN)
                .orElseThrow(() -> new ApplicationException(ApplicationError.SHIFT_NOT_OPEN));

        List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shift.getId());
        BigDecimal totalCashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal totalCashOut = sumMovements(movements, "CASH_OUT");

<<<<<<< HEAD
        List<Payment> shiftPayments = paymentRepo.findPaidPaymentsBetween(
                shift.getOpenedAt(), LocalDateTime.now());
        Map<PaymentMethod, BigDecimal> salesByMethod = sumSalesByMethod(shiftPayments);
        Map<PaymentMethod, BigDecimal> expectedAmounts = buildExpectedAmounts(
                shift.getOpeningCash(), salesByMethod, totalCashIn, totalCashOut);

        List<ShiftPaymentReconciliation> provisionalRecs = new ArrayList<>();
        for (PaymentMethod method : PaymentMethod.values()) {
            provisionalRecs.add(ShiftPaymentReconciliation.builder()
                    .shiftId(shift.getId())
                    .paymentMethod(method)
                    .expectedAmount(expectedAmounts.getOrDefault(method, BigDecimal.ZERO))
                    .actualAmount(BigDecimal.ZERO)
                    .variance(BigDecimal.ZERO)
                    .build());
        }

        return shiftMapper.toSummary(shift, provisionalRecs, movements, totalCashIn, totalCashOut);
=======
        return shiftMapper.toSummary(shift,
                buildProvisionalRecs(shift, totalCashIn, totalCashOut),
                movements, totalCashIn, totalCashOut);
>>>>>>> origin/develop
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShiftSummaryResponse> listAll(Pageable pageable, String requestingUsername) {
        User user = resolveUser(requestingUsername);
<<<<<<< HEAD
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
=======
        if (user.getRole() != UserRole.MANAGER && user.getRole() != UserRole.ADMIN) {
            throw new ApplicationException(ApplicationError.FORBIDDEN);
        }
        return shiftRepo.findAllByOrderByOpenedAtDesc(pageable).map(shift -> {
            List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shift.getId());
            List<ShiftPaymentReconciliation> recs = reconciliationRepo.findByShiftId(shift.getId());
            BigDecimal cashIn  = sumMovements(movements, "CASH_IN");
            BigDecimal cashOut = sumMovements(movements, "CASH_OUT");
            return shiftMapper.toSummary(shift, recs, movements, cashIn, cashOut);
        });
>>>>>>> origin/develop
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
<<<<<<< HEAD

        List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shift.getId());
        BigDecimal cashIn  = sumMovements(movements, "CASH_IN");
        BigDecimal cashOut = sumMovements(movements, "CASH_OUT");

        return shift.getOpeningCash().add(cashSales).add(cashIn).subtract(cashOut);
=======
        List<ShiftCashMovement> movements = cashMovRepo.findByShiftId(shift.getId());
        return shift.getOpeningCash()
                .add(cashSales)
                .add(sumMovements(movements, "CASH_IN"))
                .subtract(sumMovements(movements, "CASH_OUT"));
>>>>>>> origin/develop
    }

    private Map<PaymentMethod, BigDecimal> sumSalesByMethod(List<Payment> payments) {
        Map<PaymentMethod, BigDecimal> map = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod m : PaymentMethod.values()) map.put(m, BigDecimal.ZERO);
<<<<<<< HEAD
        for (Payment p : payments) {
            map.merge(p.getMethod(), p.getAmount(), BigDecimal::add);
        }
        return map;
    }

    // BR-CLOSE-03: expected amount per method
=======
        for (Payment p : payments) map.merge(p.getMethod(), p.getAmount(), BigDecimal::add);
        return map;
    }

>>>>>>> origin/develop
    private Map<PaymentMethod, BigDecimal> buildExpectedAmounts(
            BigDecimal openingCash,
            Map<PaymentMethod, BigDecimal> salesByMethod,
            BigDecimal totalCashIn,
            BigDecimal totalCashOut) {

        Map<PaymentMethod, BigDecimal> expected = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod method : PaymentMethod.values()) {
            if (method == PaymentMethod.CASH) {
<<<<<<< HEAD
                // Expected Cash = Opening Float + Cash Sales + CASH_IN − CASH_OUT
=======
>>>>>>> origin/develop
                expected.put(method, openingCash
                        .add(salesByMethod.getOrDefault(PaymentMethod.CASH, BigDecimal.ZERO))
                        .add(totalCashIn)
                        .subtract(totalCashOut));
            } else {
<<<<<<< HEAD
                // Expected non-cash = total revenue by that method
=======
>>>>>>> origin/develop
                expected.put(method, salesByMethod.getOrDefault(method, BigDecimal.ZERO));
            }
        }
        return expected;
    }

<<<<<<< HEAD
=======
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

>>>>>>> origin/develop
    private BigDecimal sumMovements(List<ShiftCashMovement> movements, String type) {
        return movements.stream()
                .filter(m -> type.equals(m.getType()))
                .map(ShiftCashMovement::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
