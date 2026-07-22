package com.rms.restaurant.module.employee.service.impl;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.employee.dto.*;
import com.rms.restaurant.module.employee.mapper.EmployeeMapper;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.model.SalarySetting;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import com.rms.restaurant.module.employee.repository.SalarySettingRepository;
import com.rms.restaurant.module.employee.service.EmployeeService;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeServiceImpl implements EmployeeService {

    private static final String CODE_PREFIX = "NV";
    private static final int MAX_IMPORT_ROWS = 500; // BR-IMP-02
    private static final String[] CSV_HEADERS = {
            "code", "name", "phone", "status", "startDate",
            "timekeepCode", "idNumber", "birthday", "gender", "address", "email", "note"
    };

    private final EmployeeRepository employeeRepository;
    private final SalarySettingRepository salarySettingRepository;
    private final EmployeeMapper employeeMapper;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ── CRUD (UC-EMP-01..04) ─────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponse<EmployeeResponse> list(String code, String name, String phone, EmployeeStatus status, Pageable pageable) {
        return PageResponse.of(employeeRepository
                .search(trimToNull(code), trimToNull(name), trimToNull(phone), status, pageable)
                .map(employeeMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponse get(String id) {
        return employeeMapper.toResponse(findEmployeeById(id));
    }

    @Override
    public EmployeeResponse create(CreateEmployeeRequest request) {
        String code = StringUtils.hasText(request.code()) ? request.code().trim() : null;
        if (code != null) {
            if (employeeRepository.existsByCode(code)) {
                throw new ConflictException(ApplicationError.DUPLICATE_EMPLOYEE_CODE);
            }
        } else {
            code = generateNextCode();
        }
        if (employeeRepository.existsByPhone(request.phone())) {
            throw new ConflictException(ApplicationError.DUPLICATE_EMPLOYEE_PHONE);
        }
        String userId = trimToNull(request.userId());
        if (userId != null) {
            linkUser(userId);
        }

        Employee employee = Employee.builder()
                .code(code)
                .name(request.name().trim())
                .phone(request.phone().trim())
                .status(EmployeeStatus.ACTIVE)
                .avatarUrl(trimToNull(request.avatarUrl()))
                .startDate(request.startDate())
                .timekeepCode(trimToNull(request.timekeepCode()))
                .note(trimToNull(request.note()))
                .idNumber(trimToNull(request.idNumber()))
                .birthday(request.birthday())
                .gender(trimToNull(request.gender()))
                .address(trimToNull(request.address()))
                .email(trimToNull(request.email()))
                .userId(userId)
                .build();

        Employee saved = employeeRepository.save(employee);
        log.info("Created employee '{}' [{}]", saved.getCode(), saved.getName());
        audit("EMPLOYEE_CREATE", saved);
        return employeeMapper.toResponse(saved);
    }

    @Override
    public EmployeeResponse update(String id, UpdateEmployeeRequest request) {
        Employee employee = findEmployeeById(id);

        if (StringUtils.hasText(request.name())) {
            employee.setName(request.name().trim());
        }
        if (StringUtils.hasText(request.phone())) {
            String phone = request.phone().trim();
            if (employeeRepository.existsByPhoneAndIdNot(phone, id)) {
                throw new ConflictException(ApplicationError.DUPLICATE_EMPLOYEE_PHONE);
            }
            employee.setPhone(phone);
        }
        if (request.status() != null) {
            employee.setStatus(request.status());
        }
        if (request.startDate() != null) {
            employee.setStartDate(request.startDate());
        }
        if (request.timekeepCode() != null) {
            employee.setTimekeepCode(trimToNull(request.timekeepCode()));
        }
        if (request.note() != null) {
            employee.setNote(trimToNull(request.note()));
        }
        if (request.idNumber() != null) {
            employee.setIdNumber(trimToNull(request.idNumber()));
        }
        if (request.birthday() != null) {
            employee.setBirthday(request.birthday());
        }
        if (request.gender() != null) {
            employee.setGender(trimToNull(request.gender()));
        }
        if (request.address() != null) {
            employee.setAddress(trimToNull(request.address()));
        }
        if (request.email() != null) {
            employee.setEmail(trimToNull(request.email()));
        }
        if (request.avatarUrl() != null) {
            employee.setAvatarUrl(trimToNull(request.avatarUrl()));
        }
        if (request.userId() != null) {
            String userId = trimToNull(request.userId());
            if (userId != null && !userId.equals(employee.getUserId())) {
                linkUser(userId);
            }
            employee.setUserId(userId);
        }

        Employee saved = employeeRepository.save(employee);
        syncLinkedUser(saved, request);
        audit("EMPLOYEE_UPDATE", saved);
        return employeeMapper.toResponse(saved);
    }

    /**
     * Manager/Admin editing an Employee via this screen is the mirror image of
     * UserServiceImpl.syncLinkedEmployee() (User→Employee, for the admin-edit-user screen) —
     * this propagates the other direction, Employee→User, so the two rows don't drift apart
     * regardless of which screen the edit came from. Only touches an ALREADY-linked User —
     * never creates one (linking a new User is a separate, explicit action via
     * request.userId()). Partial-update discipline matches update() above: a blank/omitted
     * field must not blank out the user's existing value.
     */
    private void syncLinkedUser(Employee employee, UpdateEmployeeRequest request) {
        if (!StringUtils.hasText(request.name())
                && !StringUtils.hasText(request.phone())
                && !StringUtils.hasText(request.email())) {
            return;
        }
        String userId = employee.getUserId();
        if (userId == null) {
            return;
        }
        userRepository.findById(userId).ifPresent(user -> {
            if (StringUtils.hasText(request.name())) {
                user.setFullName(request.name().trim());
            }
            if (StringUtils.hasText(request.phone())) {
                String phone = request.phone().trim();
                if (!phone.equals(user.getPhone()) && userRepository.existsByPhoneAndIdNot(phone, user.getId())) {
                    throw new ConflictException(ApplicationError.DUPLICATE_PHONE);
                }
                user.setPhone(phone);
            }
            if (StringUtils.hasText(request.email())) {
                String email = request.email().trim();
                if (!email.equals(user.getEmail()) && userRepository.existsByEmailAndIdNot(email, user.getId())) {
                    throw new ConflictException(ApplicationError.DUPLICATE_EMAIL);
                }
                user.setEmail(email);
            }
            userRepository.save(user);
        });
    }

    @Override
    public void deactivate(String id) {
        Employee employee = findEmployeeById(id);
        // NOTE: SRS §9 gap #2 (blocking conditions e.g. an open shift) is deferred until
        // SRS_AT_Attendance_Shift.md exists; no such check is implemented here.
        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);
        log.info("Deactivated employee '{}'", employee.getCode());
        audit("EMPLOYEE_DEACTIVATE", employee);
    }

    // ── Self-service profile ("Hồ sơ của tôi") ────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponse getMyProfile(String username) {
        User user = findUserByUsername(username);
        return employeeRepository.findByUserId(user.getId())
                .map(employeeMapper::toResponse)
                .orElseGet(() -> new EmployeeResponse(
                        null, null, user.getFullName(), user.getPhone(), null, null,
                        null, null, null, null, null, null, null,
                        user.getEmail(), null, null, null));
    }

    @Override
    public EmployeeResponse saveMyProfile(String username, SelfEmployeeProfileRequest request) {
        User user = findUserByUsername(username);
        syncUserProfile(user, request);

        Employee employee = employeeRepository.findByUserId(user.getId()).orElse(null);
        if (employee != null) {
            if (!request.phone().trim().equals(employee.getPhone())
                    && employeeRepository.existsByPhoneAndIdNot(request.phone().trim(), employee.getId())) {
                throw new ConflictException(ApplicationError.DUPLICATE_EMPLOYEE_PHONE);
            }
            applyProfileFields(employee, request);
            Employee saved = employeeRepository.save(employee);
            audit("EMPLOYEE_SELF_UPDATE", saved);
            return employeeMapper.toResponse(saved);
        }

        if (employeeRepository.existsByPhone(request.phone().trim())) {
            throw new ConflictException(ApplicationError.DUPLICATE_EMPLOYEE_PHONE);
        }
        Employee newEmployee = Employee.builder()
                .code(generateNextCode())
                .status(EmployeeStatus.ACTIVE)
                .userId(user.getId())
                .build();
        applyProfileFields(newEmployee, request);

        Employee saved;
        try {
            saved = employeeRepository.save(newEmployee);
        } catch (DataIntegrityViolationException e) {
            // Two concurrent first-saves for the same user both missed the findByUserId check above —
            // the DB-level filtered unique index (uq_employees_user_id, V29) is the real guard.
            throw new ConflictException(ApplicationError.EMPLOYEE_USER_ALREADY_LINKED);
        }
        log.info("Self-created employee '{}' [{}] for user '{}'", saved.getCode(), saved.getName(), username);
        audit("EMPLOYEE_SELF_CREATE", saved);
        return employeeMapper.toResponse(saved);
    }

    private void applyProfileFields(Employee employee, SelfEmployeeProfileRequest request) {
        employee.setName(request.name().trim());
        employee.setPhone(request.phone().trim());
        employee.setStartDate(request.startDate());
        employee.setNote(trimToNull(request.note()));
        employee.setIdNumber(trimToNull(request.idNumber()));
        employee.setBirthday(request.birthday());
        employee.setGender(trimToNull(request.gender()));
        employee.setAddress(trimToNull(request.address()));
        employee.setEmail(trimToNull(request.email()));
    }

    /**
     * Self-service is the one path that writes name/phone/email back onto User too, so an
     * employee editing their own profile doesn't fork the two rows out of sync over time.
     * Validated against BOTH tables' uniqueness since the two are independent constraints.
     */
    private void syncUserProfile(User user, SelfEmployeeProfileRequest request) {
        String phone = request.phone().trim();
        if (!phone.equals(user.getPhone()) && userRepository.existsByPhoneAndIdNot(phone, user.getId())) {
            throw new ConflictException(ApplicationError.DUPLICATE_PHONE);
        }
        String newEmail = trimToNull(request.email());
        if (newEmail != null && !newEmail.equals(user.getEmail())
                && userRepository.existsByEmailAndIdNot(newEmail, user.getId())) {
            throw new ConflictException(ApplicationError.DUPLICATE_EMAIL);
        }
        user.setFullName(request.name().trim());
        user.setPhone(phone);
        if (newEmail != null) user.setEmail(newEmail); // never clear an already-verified email from a blank form field
        userRepository.save(user);
    }

    private User findUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
    }

    // ── Salary settings (UC-EMP-07 / BR-SAL-01/02) ───────────────────────

    @Override
    @Transactional(readOnly = true)
    public SalarySettingResponse getSalarySetting(String employeeId) {
        findEmployeeById(employeeId);
        return salarySettingRepository.findByEmployeeId(employeeId)
                .map(employeeMapper::toResponse)
                .orElseGet(() -> employeeMapper.toResponse(
                        SalarySetting.builder().employeeId(employeeId).build()));
    }

    @Override
    public SalarySettingResponse upsertSalarySetting(String employeeId, SalarySettingRequest request) {
        findEmployeeById(employeeId);
        SalarySetting setting = salarySettingRepository.findByEmployeeId(employeeId)
                .orElseGet(() -> SalarySetting.builder().employeeId(employeeId).build());

        setting.setMainSalaryType(request.mainSalaryType());
        setting.setMainBaseWage(request.mainBaseWage());
        setting.setMainAdvancedRates(request.mainAdvancedRatesJson());
        setting.setOvertimeEnabled(request.overtimeEnabled());
        setting.setOvertimeRates(request.overtimeRatesJson());
        setting.setSalaryTemplate(trimToNull(request.salaryTemplate()));

        SalarySetting saved = salarySettingRepository.save(setting);
        audit("EMPLOYEE_SALARY_SETTING_SAVE", employeeId, "{}");
        return employeeMapper.toResponse(saved);
    }

    // ── Import / Export (UC-EMP-05/06) ───────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(String code, String name, String phone, EmployeeStatus status, List<String> ids) {
        List<Employee> employees = (ids != null && !ids.isEmpty())
                ? employeeRepository.findByIdIn(ids)
                : employeeRepository.search(trimToNull(code), trimToNull(name), trimToNull(phone), status);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // UTF-8 BOM so Excel renders Vietnamese characters correctly
        out.write(0xEF);
        out.write(0xBB);
        out.write(0xBF);
        try (CSVPrinter printer = new CSVPrinter(
                new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader(CSV_HEADERS).build())) {
            for (Employee e : employees) {
                printer.printRecord(
                        e.getCode(),
                        e.getName(),
                        e.getPhone(),
                        e.getStatus(),
                        e.getStartDate() == null ? "" : e.getStartDate().toString(),
                        nullSafe(e.getTimekeepCode()),
                        nullSafe(e.getIdNumber()),
                        e.getBirthday() == null ? "" : e.getBirthday().toString(),
                        nullSafe(e.getGender()),
                        nullSafe(e.getAddress()),
                        nullSafe(e.getEmail()),
                        nullSafe(e.getNote())
                );
            }
            printer.flush();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    @Override
    public EmployeeImportResultResponse importCsv(MultipartFile file, ImportStrategy strategy) {
        if (file == null || file.isEmpty()) {
            throw new ConflictException(ApplicationError.EMPLOYEE_IMPORT_INVALID);
        }

        List<EmployeeImportResultResponse.RowError> errors = new ArrayList<>();
        List<Employee> toCreate = new ArrayList<>();
        List<Employee> toUpdate = new ArrayList<>();
        Set<String> codesInBatch = new HashSet<>();
        Set<String> phonesInBatch = new HashSet<>();

        List<Employee> existingEmployees = employeeRepository.findAll();
        Map<String, Employee> byCode = existingEmployees.stream()
                .filter(e -> StringUtils.hasText(e.getCode()))
                .collect(Collectors.toMap(Employee::getCode, Function.identity(), (a, b) -> a));
        long maxCodeNumber = existingEmployees.stream()
                .map(Employee::getCode)
                .filter(StringUtils::hasText)
                .mapToLong(EmployeeServiceImpl::numericCode)
                .max().orElse(0);

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader().setSkipHeaderRecord(true).setTrim(true).setIgnoreEmptyLines(true).build()
                     .parse(reader)) {

            List<CSVRecord> records = parser.getRecords();
            if (records.size() > MAX_IMPORT_ROWS) {
                throw new ConflictException(ApplicationError.EMPLOYEE_IMPORT_TOO_MANY_ROWS);
            }

            for (CSVRecord record : records) {
                long rowNumber = record.getRecordNumber() + 1; // +1 to account for header row
                try {
                    String name = column(record, "name");
                    if (!StringUtils.hasText(name)) {
                        errors.add(new EmployeeImportResultResponse.RowError((int) rowNumber, "Name is required"));
                        continue;
                    }
                    String phone = column(record, "phone");
                    if (!StringUtils.hasText(phone) || !phone.trim().matches("^0\\d{9,10}$")) {
                        errors.add(new EmployeeImportResultResponse.RowError((int) rowNumber, "Phone is required and must match 0xxxxxxxxx"));
                        continue;
                    }
                    phone = phone.trim();

                    String code = trimToNull(column(record, "code"));
                    Employee existing = code != null ? byCode.get(code) : null;

                    if (code != null && codesInBatch.contains(code)) {
                        errors.add(new EmployeeImportResultResponse.RowError((int) rowNumber, "Duplicate code within file: " + code));
                        continue;
                    }
                    boolean phoneTakenByOther = existing != null
                            ? employeeRepository.existsByPhoneAndIdNot(phone, existing.getId())
                            : employeeRepository.existsByPhone(phone);
                    // phonesInBatch must be checked regardless of new-vs-update: an update row
                    // (existing != null) was previously exempt, so it was never compared against
                    // phones claimed earlier in the SAME file — two rows could both "validate"
                    // with the same phone and only collide later at save() time, against the
                    // DB-level UNIQUE constraint, surfacing as a raw 500 instead of a clean
                    // per-row import error.
                    if (phoneTakenByOther || phonesInBatch.contains(phone)) {
                        errors.add(new EmployeeImportResultResponse.RowError((int) rowNumber, "Phone already in use: " + phone));
                        continue;
                    }

                    EmployeeStatus status = parseStatus(column(record, "status"));
                    if (status == null) {
                        errors.add(new EmployeeImportResultResponse.RowError((int) rowNumber, "Status must be ACTIVE or INACTIVE"));
                        continue;
                    }

                    LocalDate startDate = parseDate(column(record, "startDate"));
                    LocalDate birthday = parseDate(column(record, "birthday"));

                    Employee employee = existing != null ? existing : Employee.builder().status(EmployeeStatus.ACTIVE).build();
                    if (existing == null) {
                        if (code == null) {
                            maxCodeNumber++;
                            code = CODE_PREFIX + String.format("%06d", maxCodeNumber);
                        }
                        employee.setCode(code);
                    }
                    employee.setName(name.trim());
                    employee.setPhone(phone);
                    employee.setStatus(status);
                    employee.setStartDate(startDate);
                    employee.setTimekeepCode(trimToNull(column(record, "timekeepCode")));
                    employee.setIdNumber(trimToNull(column(record, "idNumber")));
                    employee.setBirthday(birthday);
                    employee.setGender(trimToNull(column(record, "gender")));
                    employee.setAddress(trimToNull(column(record, "address")));
                    employee.setEmail(trimToNull(column(record, "email")));
                    employee.setNote(trimToNull(column(record, "note")));

                    if (code != null) codesInBatch.add(code);
                    phonesInBatch.add(phone);
                    if (existing != null) toUpdate.add(employee); else toCreate.add(employee);
                } catch (Exception rowEx) {
                    errors.add(new EmployeeImportResultResponse.RowError((int) rowNumber, "Could not process row: " + rowEx.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new ConflictException(ApplicationError.EMPLOYEE_IMPORT_INVALID);
        }

        if (strategy == ImportStrategy.STOP_ON_ERROR && !errors.isEmpty()) {
            return new EmployeeImportResultResponse(0, 0, errors.size(), errors);
        }

        toCreate.forEach(employeeRepository::save);
        toUpdate.forEach(employeeRepository::save);
        log.info("Employee import ({}): {} created, {} updated, {} failed", strategy, toCreate.size(), toUpdate.size(), errors.size());
        return new EmployeeImportResultResponse(toCreate.size(), toUpdate.size(), errors.size(), errors);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Employee findEmployeeById(String id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.EMPLOYEE_NOT_FOUND));
    }

    /** Caller must first confirm userId differs from the employee's current link, if any. */
    private void linkUser(String userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
        if (employeeRepository.existsByUserId(userId)) {
            throw new ConflictException(ApplicationError.EMPLOYEE_USER_ALREADY_LINKED);
        }
    }

    private void audit(String action, Employee employee) {
        audit(action, employee.getId(), "{\"code\":\"" + employee.getCode() + "\",\"name\":\"" + employee.getName() + "\"}");
    }

    private void audit(String action, String targetId, String detail) {
        try {
            auditService.log(action, "Employee", targetId, detail);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }
    }

    private String column(CSVRecord record, String name) {
        return record.isMapped(name) ? record.get(name) : null;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    /** Returns null when the value isn't ACTIVE/INACTIVE; blank defaults to ACTIVE. */
    private EmployeeStatus parseStatus(String status) {
        if (!StringUtils.hasText(status)) return EmployeeStatus.ACTIVE;
        try {
            return EmployeeStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    /** Numeric part of an employee code ("NV000026" → 26); 0 when absent or unparseable. */
    private static long numericCode(String code) {
        String digits = code.replaceAll("\\D", "");
        if (digits.isEmpty()) return 0;
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private String generateNextCode() {
        long max = employeeRepository.findAll().stream()
                .map(Employee::getCode)
                .filter(StringUtils::hasText)
                .mapToLong(EmployeeServiceImpl::numericCode)
                .max().orElse(0);
        return CODE_PREFIX + String.format("%06d", max + 1);
    }
}
