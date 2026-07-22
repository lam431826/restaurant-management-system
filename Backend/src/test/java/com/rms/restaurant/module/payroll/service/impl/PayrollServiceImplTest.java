package com.rms.restaurant.module.payroll.service.impl;

import com.rms.restaurant.common.utils.enums.*;
import com.rms.restaurant.module.attendance.dto.AttendanceForPayroll;
import com.rms.restaurant.module.attendance.service.AttendanceService;
import com.rms.restaurant.module.cashbook.service.CashbookService;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.model.SalarySetting;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import com.rms.restaurant.module.employee.repository.SalarySettingRepository;
import com.rms.restaurant.module.payroll.dto.CreatePayrollSheetRequest;
import com.rms.restaurant.module.payroll.dto.PayrollSheetResponse;
import com.rms.restaurant.module.payroll.dto.ReloadRequest;
import com.rms.restaurant.module.payroll.mapper.PayrollMapper;
import com.rms.restaurant.module.payroll.model.PayrollSheet;
import com.rms.restaurant.module.payroll.model.Payslip;
import com.rms.restaurant.module.payroll.repository.PayrollSheetRepository;
import com.rms.restaurant.module.payroll.repository.PayslipPaymentRepository;
import com.rms.restaurant.module.payroll.repository.PayslipRepository;
import com.rms.restaurant.module.payroll.service.SalaryCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PayrollServiceImplTest {

    @Mock private PayrollSheetRepository sheetRepository;
    @Mock private PayslipRepository payslipRepository;
    @Mock private PayslipPaymentRepository paymentRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private SalarySettingRepository salarySettingRepository;
    @Mock private AttendanceService attendanceService;
    @Mock private SalaryCalculator salaryCalculator;
    @Mock private PayrollMapper mapper;
    @Mock private CashbookService cashbookService;

    private PayrollServiceImpl service;

    private static final LocalDate START = LocalDate.of(2026, 7, 1);
    private static final LocalDate END = LocalDate.of(2026, 7, 31);

    private final Employee employee = Employee.builder()
            .id("e1").code("NV0001").name("Nguyễn Văn A").status(EmployeeStatus.ACTIVE).build();

    @BeforeEach
    void setUp() {
        service = new PayrollServiceImpl(sheetRepository, payslipRepository, paymentRepository,
                employeeRepository, salarySettingRepository, attendanceService, salaryCalculator, mapper,
                cashbookService);
        lenient().when(sheetRepository.save(any(PayrollSheet.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(sheetRepository.findMaxCode()).thenReturn(Optional.empty());
        lenient().when(payslipRepository.findMaxCode()).thenReturn(Optional.empty());
        lenient().when(payslipRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(payslipRepository.findByPayrollSheetIdOrderByEmployeeCode(anyString())).thenReturn(List.of());
        lenient().when(mapper.toResponse(any(PayrollSheet.class), any()))
                .thenReturn(new PayrollSheetResponse(null, null, null, null, null, null, null, null,
                        null, 0, null, null, null, null, null, null, null, null, null, null));
        lenient().when(salaryCalculator.compute(any(), any())).thenReturn(
                new com.rms.restaurant.module.payroll.service.ComputedPayslip(
                        SalaryType.SHIFT, BigDecimal.valueOf(200_000), BigDecimal.ZERO, 1, 480, 0, "[]"));
    }

    private CreatePayrollSheetRequest request() {
        return new CreatePayrollSheetRequest(null, PayrollTerm.CUSTOM, START, END,
                PayrollScope.CUSTOM, List.of("e1"), null);
    }

    @Test
    void createSheetReadsAttendanceByEmployeeIdNotUserId() {
        when(employeeRepository.findByIdIn(List.of("e1"))).thenReturn(List.of(employee));
        when(attendanceService.listForPayroll("e1", START, END)).thenReturn(List.of());
        when(attendanceService.violationTotal("e1", START, END)).thenReturn(BigDecimal.ZERO);

        service.createSheet(request(), "manager01");

        verify(attendanceService).listForPayroll("e1", START, END);
    }

    @Test
    void createSheetSetsDeductionFromViolationTotal() {
        when(employeeRepository.findByIdIn(List.of("e1"))).thenReturn(List.of(employee));
        when(attendanceService.listForPayroll("e1", START, END)).thenReturn(List.of());
        when(attendanceService.violationTotal("e1", START, END)).thenReturn(new BigDecimal("75000"));

        service.createSheet(request(), "manager01");

        ArgumentCaptor<List<Payslip>> captor = ArgumentCaptor.forClass(List.class);
        verify(payslipRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
        assertThat(captor.getValue().get(0).getDeduction()).isEqualByComparingTo("75000");
    }

    @Test
    void reloadFullModeResetsDeductionToViolationTotal() {
        PayrollSheet sheet = PayrollSheet.builder().id("sh1").status(PayrollSheetStatus.DRAFT)
                .periodStart(START).periodEnd(END).build();
        Payslip payslip = Payslip.builder().id("p1").payrollSheetId("sh1").employeeId("e1")
                .status(PayslipStatus.ACTIVE).deduction(new BigDecimal("999")).deductionOverridden(true).build();
        when(sheetRepository.findById("sh1")).thenReturn(Optional.of(sheet));
        when(payslipRepository.findByPayrollSheetIdOrderByEmployeeCode("sh1")).thenReturn(List.of(payslip));
        when(employeeRepository.findByIdIn(List.of("e1"))).thenReturn(List.of(employee));
        when(attendanceService.listForPayroll("e1", START, END)).thenReturn(List.of());
        when(attendanceService.violationTotal("e1", START, END)).thenReturn(new BigDecimal("50000"));
        when(payslipRepository.save(any(Payslip.class))).thenAnswer(inv -> inv.getArgument(0));

        service.reload("sh1", ReloadRequest.ReloadMode.FULL);

        assertThat(payslip.getDeduction()).isEqualByComparingTo("50000");
        assertThat(payslip.isDeductionOverridden()).isFalse();
    }

    @Test
    void reloadByWorkdayModeKeepsManualDeduction() {
        PayrollSheet sheet = PayrollSheet.builder().id("sh1").status(PayrollSheetStatus.DRAFT)
                .periodStart(START).periodEnd(END).build();
        Payslip payslip = Payslip.builder().id("p1").payrollSheetId("sh1").employeeId("e1")
                .status(PayslipStatus.ACTIVE).deduction(new BigDecimal("999")).deductionOverridden(true).build();
        when(sheetRepository.findById("sh1")).thenReturn(Optional.of(sheet));
        when(payslipRepository.findByPayrollSheetIdOrderByEmployeeCode("sh1")).thenReturn(List.of(payslip));
        when(employeeRepository.findByIdIn(List.of("e1"))).thenReturn(List.of(employee));
        when(attendanceService.listForPayroll("e1", START, END)).thenReturn(List.of());
        when(payslipRepository.save(any(Payslip.class))).thenAnswer(inv -> inv.getArgument(0));

        service.reload("sh1", ReloadRequest.ReloadMode.BY_WORKDAY);

        assertThat(payslip.getDeduction()).isEqualByComparingTo("999");
        assertThat(payslip.isDeductionOverridden()).isTrue();
        verify(attendanceService, org.mockito.Mockito.never()).violationTotal(anyString(), any(), any());
    }
}
