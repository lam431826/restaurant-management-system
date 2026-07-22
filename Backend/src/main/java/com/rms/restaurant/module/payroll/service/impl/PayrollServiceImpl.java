package com.rms.restaurant.module.payroll.service.impl;

import com.rms.restaurant.common.utils.enums.*;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.attendance.dto.AttendanceForPayroll;
import com.rms.restaurant.module.attendance.service.AttendanceService;
import com.rms.restaurant.module.cashbook.dto.SystemVoucherRequest;
import com.rms.restaurant.module.cashbook.dto.VoucherResponse;
import com.rms.restaurant.module.cashbook.service.CashbookService;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import com.rms.restaurant.module.employee.repository.SalarySettingRepository;
import com.rms.restaurant.module.payroll.dto.*;
import com.rms.restaurant.module.payroll.mapper.PayrollMapper;
import com.rms.restaurant.module.payroll.model.PayrollSheet;
import com.rms.restaurant.module.payroll.model.Payslip;
import com.rms.restaurant.module.payroll.model.PayslipPayment;
import com.rms.restaurant.module.payroll.repository.PayrollSheetRepository;
import com.rms.restaurant.module.payroll.repository.PayslipPaymentRepository;
import com.rms.restaurant.module.payroll.repository.PayslipRepository;
import com.rms.restaurant.module.payroll.service.ComputedPayslip;
import com.rms.restaurant.module.payroll.service.PayrollService;
import com.rms.restaurant.module.payroll.service.SalaryCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PayrollServiceImpl implements PayrollService {

    private final PayrollSheetRepository sheetRepository;
    private final PayslipRepository payslipRepository;
    private final PayslipPaymentRepository paymentRepository;
    private final EmployeeRepository employeeRepository;
    private final SalarySettingRepository salarySettingRepository;
    // BR-AT-13: attendance rows for payroll come from the attendance module, keyed directly by
    // employees(id) — no more hop through a linked user account.
    private final AttendanceService attendanceService;
    private final SalaryCalculator salaryCalculator;
    private final PayrollMapper mapper;
    // BR-PAY-17: each salary payout mints a Cash Book (Sổ quỹ) voucher — cashbook owns PC%06d numbering.
    private final CashbookService cashbookService;

    // ── UC-PAY-02: list ─────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PayrollSheetResponse> listSheets(String search, PayrollTerm term,
                                                         List<PayrollSheetStatus> statuses, Pageable pageable) {
        List<PayrollSheetStatus> effective = (statuses == null || statuses.isEmpty())
                ? List.of(PayrollSheetStatus.values()) : statuses;
        String q = (search == null || search.isBlank()) ? null : search.trim();
        var page = sheetRepository.search(q, term, effective, pageable);
        Map<String, List<Payslip>> bySheet = payslipsBySheet(page.getContent());
        return PageResponse.of(page.map(s -> mapper.toResponse(s, bySheet.getOrDefault(s.getId(), List.of()))));
    }

    // ── UC-PAY-03: create ───────────────────────────────────────────────────

    @Override
    public PayrollSheetResponse createSheet(CreatePayrollSheetRequest request, String username) {
        validatePeriod(request);
        List<Employee> employees = resolveEmployees(request);

        PayrollSheet sheet = PayrollSheet.builder()
                .code(nextCode(sheetRepository.findMaxCode(), "BL"))
                .name(sheetName(request))
                .payTerm(request.term())
                .periodStart(request.periodStart())
                .periodEnd(request.periodEnd())
                .scope(request.scope())
                .status(PayrollSheetStatus.GENERATING)
                .note(trimToNull(request.note()))
                .createdBy(username)
                .build();
        sheet = sheetRepository.save(sheet);

        generatePayslips(sheet, employees);

        // BR-PAY-09: generation is synchronous — flip to Draft in the same transaction.
        sheet.setStatus(PayrollSheetStatus.DRAFT);
        sheet.setDataRefreshedAt(LocalDateTime.now());
        return toResponse(sheetRepository.save(sheet));
    }

    private void validatePeriod(CreatePayrollSheetRequest request) {
        if (request.periodStart().isAfter(request.periodEnd())) {
            throw new ApplicationException(ApplicationError.PAYROLL_PERIOD_INVALID);
        }
        if (request.term() == PayrollTerm.MONTHLY) {
            LocalDate start = request.periodStart();
            boolean fullMonth = start.getDayOfMonth() == 1
                    && request.periodEnd().equals(start.withDayOfMonth(start.lengthOfMonth()));
            if (!fullMonth) {
                throw new ApplicationException(ApplicationError.PAYROLL_PERIOD_INVALID);
            }
        }
    }

    private List<Employee> resolveEmployees(CreatePayrollSheetRequest request) {
        if (request.scope() == PayrollScope.ALL) {
            return employeeRepository.search(null, null, null, EmployeeStatus.ACTIVE);
        }
        if (request.employeeIds() == null || request.employeeIds().isEmpty()) {
            throw new ApplicationException(ApplicationError.PAYROLL_SCOPE_EMPLOYEES_REQUIRED);
        }
        List<Employee> employees = employeeRepository.findByIdIn(request.employeeIds());
        if (employees.isEmpty()) {
            throw new ApplicationException(ApplicationError.PAYROLL_SCOPE_EMPLOYEES_REQUIRED);
        }
        return employees;
    }

    private String sheetName(CreatePayrollSheetRequest request) {
        String name = trimToNull(request.name());
        if (name != null) return name;
        if (request.term() == PayrollTerm.MONTHLY) {
            return "Bảng lương tháng " + request.periodStart().getMonthValue()
                    + "/" + request.periodStart().getYear();
        }
        return "Bảng lương " + vn(request.periodStart()) + " - " + vn(request.periodEnd());
    }

    private void generatePayslips(PayrollSheet sheet, List<Employee> employees) {
        long nextPayslipNo = numericSuffix(payslipRepository.findMaxCode().orElse(null));
        List<Payslip> payslips = new ArrayList<>();
        for (Employee employee : employees) {
            ComputedPayslip computed = computeFor(employee, sheet);
            Payslip payslip = buildPayslip(sheet, employee, computed, "PL" + String.format("%06d", ++nextPayslipNo));
            payslip.setDeduction(attendanceService.violationTotal(
                    employee.getId(), sheet.getPeriodStart(), sheet.getPeriodEnd())); // BR-AT-12
            payslips.add(payslip);
        }
        payslipRepository.saveAll(payslips);
    }

    private ComputedPayslip computeFor(Employee employee, PayrollSheet sheet) {
        List<AttendanceForPayroll> attendance = attendanceService.listForPayroll(
                employee.getId(), sheet.getPeriodStart(), sheet.getPeriodEnd());
        var setting = salarySettingRepository.findByEmployeeId(employee.getId()).orElse(null);
        return salaryCalculator.compute(setting, attendance);
    }

    private Payslip buildPayslip(PayrollSheet sheet, Employee employee,
                                 ComputedPayslip computed, String code) {
        return Payslip.builder()
                .code(code)
                .payrollSheetId(sheet.getId())
                .employeeId(employee.getId())
                .employeeCode(employee.getCode())
                .employeeName(employee.getName())
                .salaryType(computed.salaryType())
                .mainSalary(computed.mainSalary())
                .overtimeSalary(computed.overtimeSalary())
                .shiftCount(computed.shiftCount())
                .workedMinutes(computed.workedMinutes())
                .otMinutes(computed.otMinutes())
                .attendanceSnapshot(computed.snapshotJson())
                .build();
    }

    // ── UC-PAY-04: view & update draft ──────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PayrollSheetResponse getSheet(String sheetId) {
        return toResponse(requireSheet(sheetId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayslipRowResponse> listPayslips(String sheetId) {
        requireSheet(sheetId);
        return payslipRepository.findByPayrollSheetIdOrderByEmployeeCode(sheetId).stream()
                .map(mapper::toRowResponse)
                .toList();
    }

    @Override
    public void saveDraft(String sheetId, SaveDraftRequest request) {
        PayrollSheet sheet = requireSheet(sheetId);
        requireStatus(sheet, PayrollSheetStatus.DRAFT, ApplicationError.PAYROLL_SHEET_NOT_DRAFT);
        for (SaveDraftRequest.DraftRow row : request.rows()) {
            Payslip payslip = requirePayslipInSheet(row.payslipId(), sheetId);
            requireActive(payslip);
            applyDraftRow(payslip, row);
        }
    }

    private void applyDraftRow(Payslip payslip, SaveDraftRequest.DraftRow row) {
        if (row.mainSalary() != null) {
            payslip.setMainSalary(row.mainSalary());
            payslip.setMainOverridden(true);
        }
        if (row.overtimeSalary() != null) {
            payslip.setOvertimeSalary(row.overtimeSalary());
            payslip.setOvertimeOverridden(true);
        }
        if (row.deduction() != null) {
            payslip.setDeduction(row.deduction());
            payslip.setDeductionOverridden(true);
        }
        payslipRepository.save(payslip);
    }

    @Override
    public PayrollSheetResponse reload(String sheetId, ReloadRequest.ReloadMode mode) {
        PayrollSheet sheet = requireSheet(sheetId);
        if (sheet.getStatus() != PayrollSheetStatus.DRAFT && sheet.getStatus() != PayrollSheetStatus.GENERATING) {
            throw new ApplicationException(ApplicationError.PAYROLL_SHEET_NOT_DRAFT);
        }
        Map<String, Employee> employees = employeeRepository
                .findByIdIn(payslipRepository.findByPayrollSheetIdOrderByEmployeeCode(sheetId).stream()
                        .map(Payslip::getEmployeeId).toList())
                .stream().collect(Collectors.toMap(Employee::getId, Function.identity()));

        for (Payslip payslip : payslipRepository.findByPayrollSheetIdOrderByEmployeeCode(sheetId)) {
            if (payslip.getStatus() == PayslipStatus.CANCELLED) continue;
            Employee employee = employees.get(payslip.getEmployeeId());
            if (employee == null) continue; // hard-deleted employee: keep computed values as-is
            applyRecompute(payslip, employee, sheet, computeFor(employee, sheet), mode);
        }
        sheet.setDataRefreshedAt(LocalDateTime.now());
        return toResponse(sheetRepository.save(sheet));
    }

    /** BR-PAY-12 (D9): FULL clears every override, incl. deduction reset to the violation total. */
    private void applyRecompute(Payslip payslip, Employee employee, PayrollSheet sheet,
                                ComputedPayslip computed, ReloadRequest.ReloadMode mode) {
        payslip.setSalaryType(computed.salaryType());
        payslip.setMainSalary(computed.mainSalary());
        payslip.setOvertimeSalary(computed.overtimeSalary());
        payslip.setMainOverridden(false);
        payslip.setOvertimeOverridden(false);
        payslip.setShiftCount(computed.shiftCount());
        payslip.setWorkedMinutes(computed.workedMinutes());
        payslip.setOtMinutes(computed.otMinutes());
        payslip.setAttendanceSnapshot(computed.snapshotJson());
        if (mode == ReloadRequest.ReloadMode.FULL) {
            payslip.setDeduction(attendanceService.violationTotal(
                    employee.getId(), sheet.getPeriodStart(), sheet.getPeriodEnd())); // BR-AT-12
            payslip.setDeductionOverridden(false);
        }
        payslipRepository.save(payslip);
    }

    // ── UC-PAY-05/06: finalize & cancel ─────────────────────────────────────

    @Override
    public PayrollSheetResponse finalizeSheet(String sheetId, String username) {
        PayrollSheet sheet = requireSheet(sheetId);
        requireStatus(sheet, PayrollSheetStatus.DRAFT, ApplicationError.PAYROLL_SHEET_NOT_DRAFT);
        sheet.setStatus(PayrollSheetStatus.FINALIZED);
        sheet.setFinalizedBy(username);
        sheet.setFinalizedAt(LocalDateTime.now());
        return toResponse(sheetRepository.save(sheet));
    }

    @Override
    public void cancelSheet(String sheetId) {
        PayrollSheet sheet = requireSheet(sheetId);
        requireStatus(sheet, PayrollSheetStatus.DRAFT, ApplicationError.PAYROLL_SHEET_NOT_DRAFT);
        sheet.setStatus(PayrollSheetStatus.CANCELLED);
        sheetRepository.save(sheet);
    }

    // ── UC-PAY-07: pay ──────────────────────────────────────────────────────

    @Override
    public List<PaymentResponse> pay(String sheetId, PayRequest request, String username) {
        PayrollSheet sheet = requireSheet(sheetId);
        requireStatus(sheet, PayrollSheetStatus.FINALIZED, ApplicationError.PAYROLL_SHEET_NOT_FINALIZED);
        List<PaymentResponse> results = new ArrayList<>();
        for (PayRequest.PayItem item : request.items()) {
            Payslip payslip = requirePayslipInSheet(item.payslipId(), sheetId);
            requireActive(payslip);
            validateAmount(item.amount(), payslip);
            PayslipPayment payment = recordPayment(payslip, item.amount(), request, username);
            results.add(mapper.toPaymentResponse(payment, payslip));
        }
        rollUpSheetPaymentStatus(sheet);
        return results;
    }

    private void validateAmount(BigDecimal amount, Payslip payslip) {
        if (amount == null || amount.signum() <= 0) {
            throw new ApplicationException(ApplicationError.SALARY_PAYMENT_AMOUNT_INVALID);
        }
        if (amount.compareTo(payslip.getRemaining()) > 0) {
            throw new ApplicationException(ApplicationError.SALARY_PAYMENT_EXCEEDS_REMAINING);
        }
    }

    /** BR-PAY-17: each payment mints a Cash Book (Sổ quỹ) PAYMENT voucher against the
     * SALARY_PAYMENT system category; cashbook returns the PC%06d code to store here. */
    private PayslipPayment recordPayment(Payslip payslip, BigDecimal amount, PayRequest request, String username) {
        VoucherResponse voucher = cashbookService.createSystemVoucher(new SystemVoucherRequest(
                CashFlowType.PAYMENT, "SALARY_PAYMENT", request.paidAt(),
                request.method() == SalaryPaymentMethod.TRANSFER ? CashFlowMethod.BANK : CashFlowMethod.CASH,
                CashbookPartnerGroup.EMPLOYEE, payslip.getEmployeeId(), payslip.getEmployeeName(),
                amount, trimToNull(request.note()), true,
                CashbookSourceType.PAYROLL, payslip.getId(), username));

        PayslipPayment payment = paymentRepository.save(PayslipPayment.builder()
                .payslipId(payslip.getId())
                .voucherCode(voucher.code())
                .amount(amount)
                .method(request.method())
                .paidAt(request.paidAt())
                .note(trimToNull(request.note()))
                .createdBy(username)
                .build());
        payslip.setPaidAmount(payslip.getPaidAmount().add(amount));
        payslip.setPaymentStatus(payslip.getRemaining().signum() <= 0
                ? SalaryPaymentStatus.PAID : SalaryPaymentStatus.PARTIAL);
        payslipRepository.save(payslip);
        return payment;
    }

    private void rollUpSheetPaymentStatus(PayrollSheet sheet) {
        List<Payslip> active = payslipRepository.findByPayrollSheetIdOrderByEmployeeCode(sheet.getId())
                .stream().filter(p -> p.getStatus() == PayslipStatus.ACTIVE).toList();
        boolean allPaid = !active.isEmpty()
                && active.stream().allMatch(p -> p.getPaymentStatus() == SalaryPaymentStatus.PAID);
        boolean anyPaid = active.stream().anyMatch(p -> p.getPaidAmount().signum() > 0);
        sheet.setPaymentStatus(allPaid ? SalaryPaymentStatus.PAID
                : anyPaid ? SalaryPaymentStatus.PARTIAL : SalaryPaymentStatus.UNPAID);
        sheetRepository.save(sheet);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> listPayments(String sheetId) {
        requireSheet(sheetId);
        List<Payslip> payslips = payslipRepository.findByPayrollSheetIdOrderByEmployeeCode(sheetId);
        Map<String, Payslip> byId = payslips.stream()
                .collect(Collectors.toMap(Payslip::getId, Function.identity()));
        if (payslips.isEmpty()) return List.of();
        return paymentRepository.findByPayslipIdInOrderByPaidAtDesc(payslips.stream().map(Payslip::getId).toList())
                .stream()
                .map(p -> mapper.toPaymentResponse(p, byId.get(p.getPayslipId())))
                .toList();
    }

    // ── UC-PAY-08/09: payslip detail & history ──────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PayslipDetailResponse getPayslip(String payslipId) {
        Payslip payslip = requirePayslip(payslipId);
        PayrollSheet sheet = requireSheet(payslip.getPayrollSheetId());
        return mapper.toDetailResponse(payslip, sheet, paymentsOf(payslip));
    }

    @Override
    public void cancelPayslip(String payslipId) {
        Payslip payslip = requirePayslip(payslipId);
        requireActive(payslip);
        // BR-PAY-18: only unpaid payslips can be cancelled.
        if (payslip.getPaidAmount().signum() > 0 || paymentRepository.existsByPayslipId(payslipId)) {
            throw new ApplicationException(ApplicationError.PAYSLIP_ALREADY_PAID);
        }
        payslip.setStatus(PayslipStatus.CANCELLED);
        payslipRepository.save(payslip);
        rollUpSheetPaymentStatus(requireSheet(payslip.getPayrollSheetId()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayslipDetailResponse> listEmployeePayslips(String employeeId) {
        List<Payslip> payslips = payslipRepository.findFinalizedByEmployee(employeeId);
        Map<String, PayrollSheet> sheets = sheetRepository
                .findAllById(payslips.stream().map(Payslip::getPayrollSheetId).distinct().toList())
                .stream().collect(Collectors.toMap(PayrollSheet::getId, Function.identity()));
        return payslips.stream()
                .map(p -> mapper.toDetailResponse(p, sheets.get(p.getPayrollSheetId()), paymentsOf(p)))
                .toList();
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private List<PaymentResponse> paymentsOf(Payslip payslip) {
        return paymentRepository.findByPayslipIdOrderByPaidAtDesc(payslip.getId()).stream()
                .map(p -> mapper.toPaymentResponse(p, payslip))
                .toList();
    }

    private PayrollSheetResponse toResponse(PayrollSheet sheet) {
        return mapper.toResponse(sheet, payslipRepository.findByPayrollSheetIdOrderByEmployeeCode(sheet.getId()));
    }

    private Map<String, List<Payslip>> payslipsBySheet(List<PayrollSheet> sheets) {
        if (sheets.isEmpty()) return Map.of();
        return payslipRepository.findByPayrollSheetIdIn(sheets.stream().map(PayrollSheet::getId).toList())
                .stream().collect(Collectors.groupingBy(Payslip::getPayrollSheetId));
    }

    private PayrollSheet requireSheet(String sheetId) {
        return sheetRepository.findById(sheetId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.PAYROLL_SHEET_NOT_FOUND));
    }

    private Payslip requirePayslip(String payslipId) {
        return payslipRepository.findById(payslipId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.PAYSLIP_NOT_FOUND));
    }

    private Payslip requirePayslipInSheet(String payslipId, String sheetId) {
        Payslip payslip = requirePayslip(payslipId);
        if (!payslip.getPayrollSheetId().equals(sheetId)) {
            throw new ApplicationException(ApplicationError.PAYSLIP_NOT_FOUND);
        }
        return payslip;
    }

    private void requireStatus(PayrollSheet sheet, PayrollSheetStatus expected, ApplicationError error) {
        if (sheet.getStatus() != expected) {
            throw new ApplicationException(error);
        }
    }

    private void requireActive(Payslip payslip) {
        if (payslip.getStatus() != PayslipStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.PAYSLIP_CANCELLED);
        }
    }

    /** Same max-numeric-suffix code generation as EmployeeServiceImpl.generateNextCode(). */
    private String nextCode(Optional<String> maxCode, String prefix) {
        return prefix + String.format("%06d", numericSuffix(maxCode.orElse(null)) + 1);
    }

    private long numericSuffix(String code) {
        if (code == null) return 0;
        String digits = code.replaceAll("\\D", "");
        return digits.isEmpty() ? 0 : Long.parseLong(digits);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String vn(LocalDate date) {
        return String.format("%02d/%02d/%d", date.getDayOfMonth(), date.getMonthValue(), date.getYear());
    }
}
