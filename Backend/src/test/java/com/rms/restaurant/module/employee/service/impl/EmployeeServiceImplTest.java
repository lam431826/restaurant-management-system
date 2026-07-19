package com.rms.restaurant.module.employee.service.impl;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.employee.dto.*;
import com.rms.restaurant.module.employee.mapper.EmployeeMapper;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import com.rms.restaurant.module.employee.repository.SalarySettingRepository;
import com.rms.restaurant.module.user.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceImplTest {

    private static final String[] HEADERS = {
            "code", "name", "phone", "status", "startDate",
            "timekeepCode", "idNumber", "birthday", "gender", "address", "email", "note"
    };

    @Mock EmployeeRepository employeeRepository;
    @Mock SalarySettingRepository salarySettingRepository;
    @Mock EmployeeMapper employeeMapper;
    @Mock UserRepository userRepository;
    @Mock AuditService auditService;

    private EmployeeServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new EmployeeServiceImpl(employeeRepository, salarySettingRepository, employeeMapper, userRepository, auditService);

        // lenient: not every test exercises the happy path that reaches mapping/saving
        lenient().when(employeeMapper.toResponse(any(Employee.class))).thenAnswer(inv -> {
            Employee e = inv.getArgument(0);
            return new EmployeeResponse(e.getId(), e.getCode(), e.getName(), e.getPhone(), e.getStatus(),
                    e.getAvatarUrl(), e.getStartDate(), e.getTimekeepCode(), e.getNote(), e.getIdNumber(),
                    e.getBirthday(), e.getGender(), e.getAddress(), e.getEmail(), e.getUserId(),
                    e.getCreatedAt(), e.getUpdatedAt());
        });
        lenient().when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    /** Builds one CSV data row with exactly {@link #HEADERS}.length columns; unspecified trailing columns are blank. */
    private static String csvRow(String code, String name, String phone, String status) {
        String[] cols = new String[HEADERS.length];
        cols[0] = code == null ? "" : code;
        cols[1] = name == null ? "" : name;
        cols[2] = phone == null ? "" : phone;
        cols[3] = status == null ? "" : status;
        for (int i = 4; i < cols.length; i++) cols[i] = "";
        return String.join(",", cols);
    }

    private static MultipartFile csvFile(String... dataRows) {
        StringBuilder sb = new StringBuilder(String.join(",", HEADERS)).append('\n');
        for (String row : dataRows) sb.append(row).append('\n');
        return new MockMultipartFile("file", "employees.csv", "text/csv",
                sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void create_generatesNextCode_whenCodeBlank() {
        when(employeeRepository.existsByPhone("0912345678")).thenReturn(false);
        when(employeeRepository.findAll()).thenReturn(List.of(
                Employee.builder().code("NV000005").build(),
                Employee.builder().code("NV000012").build()));

        CreateEmployeeRequest req = new CreateEmployeeRequest(
                null, "Nguyen Van A", "0912345678", null, null, null, null,
                null, null, null, null, null, null);

        EmployeeResponse result = service.create(req);

        assertThat(result.code()).isEqualTo("NV000013");
        verify(employeeRepository).save(any(Employee.class));
    }

    @Test
    void create_rejectsDuplicateCode() {
        when(employeeRepository.existsByCode("NV000001")).thenReturn(true);

        CreateEmployeeRequest req = new CreateEmployeeRequest(
                "NV000001", "Nguyen Van A", "0912345678", null, null, null, null,
                null, null, null, null, null, null);

        assertThatThrownBy(() -> service.create(req)).isInstanceOf(ConflictException.class);
        verify(employeeRepository, never()).save(any());
    }

    @Test
    void create_rejectsDuplicatePhone() {
        when(employeeRepository.existsByPhone("0912345678")).thenReturn(true);

        CreateEmployeeRequest req = new CreateEmployeeRequest(
                "NV000001", "Nguyen Van A", "0912345678", null, null, null, null,
                null, null, null, null, null, null);

        assertThatThrownBy(() -> service.create(req)).isInstanceOf(ConflictException.class);
        verify(employeeRepository, never()).save(any());
    }

    @Test
    void deactivate_setsInactiveStatus_onlyOnThatEmployee() {
        Employee employee = Employee.builder().id("e1").code("NV000001").status(EmployeeStatus.ACTIVE).build();
        when(employeeRepository.findById("e1")).thenReturn(Optional.of(employee));

        service.deactivate("e1");

        assertThat(employee.getStatus()).isEqualTo(EmployeeStatus.INACTIVE);
        verify(employeeRepository).save(employee);
        verifyNoInteractions(salarySettingRepository);
    }

    @Test
    void importCsv_stopOnError_persistsNothing_whenAnyRowInvalid() {
        when(employeeRepository.findAll()).thenReturn(List.of());
        when(employeeRepository.existsByPhone("0912345678")).thenReturn(false);
        MultipartFile file = csvFile(
                csvRow("NV000001", "Nguyen Van A", "0912345678", "ACTIVE"),
                csvRow("NV000002", null, "0912345679", "ACTIVE") // missing name -> invalid row
        );

        EmployeeImportResultResponse result = service.importCsv(file, ImportStrategy.STOP_ON_ERROR);

        assertThat(result.created()).isZero();
        assertThat(result.updated()).isZero();
        assertThat(result.failed()).isEqualTo(1);
        verify(employeeRepository, never()).save(any());
    }

    @Test
    void importCsv_skipAndContinue_persistsValidRows_andReportsInvalidOnes() {
        when(employeeRepository.findAll()).thenReturn(List.of());
        when(employeeRepository.existsByPhone("0912345678")).thenReturn(false);
        MultipartFile file = csvFile(
                csvRow("NV000001", "Nguyen Van A", "0912345678", "ACTIVE"),
                csvRow("NV000002", null, "0912345679", "ACTIVE") // missing name -> invalid row
        );

        EmployeeImportResultResponse result = service.importCsv(file, ImportStrategy.SKIP_AND_CONTINUE);

        assertThat(result.created()).isEqualTo(1);
        assertThat(result.failed()).isEqualTo(1);
        verify(employeeRepository, times(1)).save(any(Employee.class));
    }

    @Test
    void importCsv_rejectsFileOverRowLimit() {
        String[] rows = new String[501];
        for (int i = 0; i < rows.length; i++) {
            rows[i] = csvRow(String.format("NV%06d", i), "Name " + i, "0912345678", "ACTIVE");
        }
        MultipartFile file = csvFile(rows);

        assertThatThrownBy(() -> service.importCsv(file, ImportStrategy.SKIP_AND_CONTINUE))
                .isInstanceOf(ApplicationException.class);
        verify(employeeRepository, never()).save(any());
    }
}
