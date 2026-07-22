package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.enums.AttendanceType;
import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.attendance.dto.*;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.AttendanceRecord;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import com.rms.restaurant.module.attendance.model.Violation;
import com.rms.restaurant.module.attendance.model.ViolationType;
import com.rms.restaurant.module.attendance.model.WorkSchedule;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.attendance.repository.AttendanceRecordRepository;
import com.rms.restaurant.module.attendance.repository.ViolationRepository;
import com.rms.restaurant.module.attendance.repository.ViolationTypeRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRepository;
import com.rms.restaurant.module.attendance.repository.WorkShiftRepository;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.CalcInput;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.CalcResult;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.MergedShiftInput;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator.MergedSlot;
import com.rms.restaurant.module.attendance.service.AttendanceService;
import com.rms.restaurant.module.attendance.service.AttendanceSettingService;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * UC-AT-03/04/06/07. Derived metrics are computed once at marking time with the settings
 * in force (UC-AT-05 step 6) and persisted on the record; re-saving a record recomputes
 * them (UC-AT-03 A2). Violations snapshot their unit penalty (BR-AT-12).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRecordRepository recordRepository;
    private final WorkScheduleRepository scheduleRepository;
    private final WorkShiftRepository shiftRepository;
    private final ViolationRepository violationRepository;
    private final ViolationTypeRepository violationTypeRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AttendanceSettingService settingService;
    private final AttendanceCalculator calculator;
    private final AttendanceMapper mapper;

    // ---- Timesheet (UC-AT-07) ----

    @Override
    @Transactional(readOnly = true)
    public List<TimesheetCellResponse> timesheet(LocalDate start, LocalDate end) {
        return buildCells(scheduleRepository.findByWorkDateBetween(start, end));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TimesheetCellResponse> myTimesheet(String username, LocalDate start, LocalDate end) {
        Employee self = requireSelfEmployee(username);
        return buildCells(scheduleRepository.findByEmployeeIdAndWorkDateBetween(self.getId(), start, end));
    }

    private List<TimesheetCellResponse> buildCells(List<WorkSchedule> schedules) {
        Map<String, AttendanceRecord> recordsByScheduleId = recordRepository
                .findByScheduleIdIn(schedules.stream().map(WorkSchedule::getId).toList())
                .stream().collect(Collectors.toMap(AttendanceRecord::getScheduleId, Function.identity()));
        Map<String, List<ViolationResponse>> violationsByRecordId = violationsByRecord(recordsByScheduleId.values());
        Map<String, Employee> employeesById = employeesFor(schedules);
        Map<String, WorkShift> shiftsById = shiftsFor(schedules);
        LocalDate today = LocalDate.now();

        return schedules.stream()
                .sorted(Comparator.comparing(WorkSchedule::getWorkDate))
                .map(s -> {
                    AttendanceRecord record = recordsByScheduleId.get(s.getId());
                    Employee employee = employeesById.get(s.getEmployeeId());
                    Employee substitute = s.getSubstituteEmployeeId() == null
                            ? null : employeesById.get(s.getSubstituteEmployeeId());
                    WorkShift shift = shiftsById.get(s.getShiftId());
                    List<ViolationResponse> violations = record != null
                            ? violationsByRecordId.getOrDefault(record.getId(), List.of()) : List.of();
                    BigDecimal penaltyTotal = violations.stream()
                            .map(v -> v.appliedPenalty().multiply(BigDecimal.valueOf(v.count())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new TimesheetCellResponse(
                            s.getId(), s.getEmployeeId(),
                            employee != null ? employee.getCode() : null,
                            employee != null ? employee.getName() : null,
                            s.getShiftId(),
                            shift != null ? shift.getName() : null,
                            shift != null ? shift.getStartTime() : null,
                            shift != null ? shift.getEndTime() : null,
                            s.getWorkDate(),
                            displayStatus(s, record, today),
                            record != null ? mapper.toRecordResponse(record) : null,
                            violations,
                            penaltyTotal,
                            s.getSubstituteEmployeeId(),
                            substitute != null ? substitute.getName() : null);
                })
                .toList();
    }

    private TimesheetStatus displayStatus(WorkSchedule schedule, AttendanceRecord record, LocalDate today) {
        if (record == null) {
            return schedule.getWorkDate().isAfter(today) ? TimesheetStatus.SCHEDULED : TimesheetStatus.UNMARKED;
        }
        if (record.getType() != AttendanceType.PRESENT) {
            return TimesheetStatus.OFF;
        }
        if (record.getActualCheckIn() == null || record.getActualCheckOut() == null) {
            return TimesheetStatus.MISSING;
        }
        return record.getLateMinutes() + record.getEarlyLeaveMinutes() > 0
                ? TimesheetStatus.LATE_EARLY : TimesheetStatus.ON_TIME;
    }

    // ---- Marking (UC-AT-03/04) ----

    @Override
    @Transactional(readOnly = true)
    public AttendanceRecordResponse getRecord(String recordId) {
        return mapper.toRecordResponse(requireRecord(recordId));
    }

    @Override
    public AttendanceRecordResponse upsert(String scheduleId, AttendanceUpsertRequest request, String username) {
        WorkSchedule schedule = requireSchedule(scheduleId);
        applySubstitute(schedule, request.substituteEmployeeId(), request.type());
        AttendanceRecord saved = mark(schedule, request.type(),
                request.checkInDate(), request.checkInTime(), request.checkOutDate(), request.checkOutTime(),
                request.note(), false, username,
                request.otBeforeMinutes(), request.otAfterMinutes());
        return mapper.toRecordResponse(saved);
    }

    // ---- Self-service clock in/out ("Lịch làm việc") ────────────────────────

    @Override
    public AttendanceRecordResponse checkIn(String scheduleId, String username) {
        WorkSchedule schedule = requireOwnSchedule(scheduleId, username);
        if (!schedule.getWorkDate().equals(LocalDate.now())) {
            throw new ApplicationException(ApplicationError.AT_RECORD_DATE_INVALID,
                    "Chỉ có thể chấm công cho ca làm hôm nay");
        }
        AttendanceRecord existing = recordRepository.findByScheduleId(scheduleId).orElse(null);
        if (existing != null && existing.getActualCheckIn() != null) {
            throw new ApplicationException(ApplicationError.AT_RECORD_TIME_INVALID, "Đã chấm công vào ca này");
        }
        LocalDateTime now = LocalDateTime.now();
        AttendanceRecord saved = mark(schedule, AttendanceType.PRESENT,
                now.toLocalDate(), now.toLocalTime(), null, null, null, false, username, null, null);
        return mapper.toRecordResponse(saved);
    }

    @Override
    public AttendanceRecordResponse checkOut(String scheduleId, String username) {
        WorkSchedule schedule = requireOwnSchedule(scheduleId, username);
        AttendanceRecord existing = recordRepository.findByScheduleId(scheduleId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_RECORD_TIME_INVALID, "Chưa chấm công vào ca"));
        if (existing.getActualCheckIn() == null) {
            throw new ApplicationException(ApplicationError.AT_RECORD_TIME_INVALID, "Chưa chấm công vào ca");
        }
        if (existing.getActualCheckOut() != null) {
            throw new ApplicationException(ApplicationError.AT_RECORD_TIME_INVALID, "Đã chấm công ra ca này");
        }
        LocalDateTime in = existing.getActualCheckIn();
        LocalDateTime now = LocalDateTime.now();
        AttendanceRecord saved = mark(schedule, AttendanceType.PRESENT,
                in.toLocalDate(), in.toLocalTime(), now.toLocalDate(), now.toLocalTime(),
                existing.getNote(), false, username, null, null);
        return mapper.toRecordResponse(saved);
    }

    /** Resolves the schedule and rejects it unless it belongs to the calling user's own employee record. */
    private WorkSchedule requireOwnSchedule(String scheduleId, String username) {
        WorkSchedule schedule = requireSchedule(scheduleId);
        Employee self = requireSelfEmployee(username);
        if (!schedule.getEmployeeId().equals(self.getId())) {
            throw new ApplicationException(ApplicationError.AT_SCHEDULE_NOT_FOUND);
        }
        return schedule;
    }

    private Employee requireSelfEmployee(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
        return employeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ApplicationException(ApplicationError.EMPLOYEE_NOT_FOUND));
    }

    @Override
    public List<AttendanceRecordResponse> bulkMark(BulkAttendanceRequest request, String username) {
        if (request.substituteEmployeeId() != null && request.scheduleIds().size() != 1) {
            throw new ApplicationException(ApplicationError.AT_SUBSTITUTE_SINGLE_ONLY);
        }
        List<WorkSchedule> schedules = request.scheduleIds().stream()
                .map(this::requireSchedule).toList();

        if (request.merged()) {
            return markMerged(schedules, request, username);
        }
        List<AttendanceRecordResponse> results = new ArrayList<>();
        for (WorkSchedule schedule : schedules) {
            applySubstitute(schedule, request.substituteEmployeeId(), request.type());
            results.add(mapper.toRecordResponse(mark(schedule, request.type(),
                    null, request.checkInTime(), null, request.checkOutTime(),
                    request.note(), false, username, null, null)));
        }
        return results;
    }

    /** BR-AT-11: one Vào–Ra punch over consecutive shifts of one employee on one day. */
    private List<AttendanceRecordResponse> markMerged(List<WorkSchedule> schedules,
                                                      BulkAttendanceRequest request, String username) {
        AttendanceSetting settings = settingService.current();
        if (!settings.isMergedShiftEnabled()) {
            throw new ApplicationException(ApplicationError.AT_MERGE_DISABLED);
        }
        if (request.type() != AttendanceType.PRESENT
                || request.checkInTime() == null || request.checkOutTime() == null) {
            throw new ApplicationException(ApplicationError.AT_RECORD_TIME_INVALID,
                    "Chấm gộp ca cần đủ giờ vào và giờ ra");
        }
        boolean sameEmployeeAndDay = schedules.stream()
                .map(s -> s.getEmployeeId() + "|" + s.getWorkDate()).distinct().count() == 1;
        if (schedules.size() < 2 || !sameEmployeeAndDay) {
            throw new ApplicationException(ApplicationError.AT_MERGE_LIMIT_EXCEEDED,
                    "Chấm gộp chỉ áp dụng cho nhiều ca của cùng một nhân viên trong một ngày");
        }
        Map<String, WorkShift> shiftsById = shiftsFor(schedules);
        Map<String, WorkSchedule> schedulesById = schedules.stream()
                .collect(Collectors.toMap(WorkSchedule::getId, Function.identity()));
        List<MergedShiftInput> inputs = schedules.stream().map(s -> {
            WorkShift shift = shiftsById.get(s.getShiftId());
            return new MergedShiftInput(s.getId(), s.getWorkDate(), shift.getStartTime(), shift.getEndTime());
        }).toList();

        LocalDate day = schedules.get(0).getWorkDate();
        LocalDateTime firstIn = day.atTime(request.checkInTime());
        LocalDateTime lastOut = request.checkOutTime().isAfter(request.checkInTime())
                ? day.atTime(request.checkOutTime())
                : day.plusDays(1).atTime(request.checkOutTime());

        List<MergedSlot> slots = calculator.splitMergedPunch(inputs, firstIn, lastOut, settings);
        List<AttendanceRecordResponse> results = new ArrayList<>();
        for (MergedSlot slot : slots) {
            WorkSchedule schedule = schedulesById.get(slot.scheduleId());
            WorkShift shift = shiftsById.get(schedule.getShiftId());
            results.add(mapper.toRecordResponse(saveComputed(schedule, shift, AttendanceType.PRESENT,
                    slot.in(), slot.out(), request.note(), slot.autoFilled(), username, settings)));
        }
        return results;
    }

    /**
     * Anchors HH:mm times to a calendar date and persists the computed record. checkInDate/
     * checkOutDate, when supplied, pin that side to an explicit day (must be the schedule's
     * work date or the day after — UI only ever offers those two); when null, falls back to
     * the legacy heuristic (check-in on the work date, check-out rolled to the next day only
     * if its time isn't after check-in's).
     */
    private AttendanceRecord mark(WorkSchedule schedule, AttendanceType type,
                                  LocalDate checkInDate, LocalTime checkInTime,
                                  LocalDate checkOutDate, LocalTime checkOutTime,
                                  String note, boolean autoFilled, String username,
                                  Integer otBeforeOverride, Integer otAfterOverride) {
        AttendanceSetting settings = settingService.current();
        WorkShift shift = shiftRepository.findById(schedule.getShiftId())
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_SHIFT_NOT_FOUND));
        requireWithinRange(checkInDate, schedule);
        requireWithinRange(checkOutDate, schedule);
        LocalDateTime in = null;
        LocalDateTime out = null;
        if (type == AttendanceType.PRESENT) {
            LocalDate inDate = checkInDate != null ? checkInDate : schedule.getWorkDate();
            in = checkInTime == null ? null : inDate.atTime(checkInTime);
            if (checkOutTime != null) {
                LocalDate outDate;
                if (checkOutDate != null) {
                    outDate = checkOutDate;
                } else if (checkInTime != null && !checkOutTime.isAfter(checkInTime)) {
                    outDate = schedule.getWorkDate().plusDays(1); // legacy overnight heuristic
                } else {
                    outDate = schedule.getWorkDate();
                }
                out = outDate.atTime(checkOutTime);
                if (in != null && !out.isAfter(in)) {
                    throw new ApplicationException(ApplicationError.AT_RECORD_TIME_INVALID);
                }
            }
        }
        Integer otOverride = (otBeforeOverride == null && otAfterOverride == null) ? null
                : Math.max(0, otBeforeOverride != null ? otBeforeOverride : 0)
                        + Math.max(0, otAfterOverride != null ? otAfterOverride : 0);
        return saveComputed(schedule, shift, type, in, out, note, autoFilled, username, settings, otOverride);
    }

    /** UI only ever offers the schedule's work date or the following day for either side. */
    private void requireWithinRange(LocalDate date, WorkSchedule schedule) {
        if (date == null) return;
        if (date.isBefore(schedule.getWorkDate()) || date.isAfter(schedule.getWorkDate().plusDays(1))) {
            throw new ApplicationException(ApplicationError.AT_RECORD_DATE_INVALID);
        }
    }

    private AttendanceRecord saveComputed(WorkSchedule schedule, WorkShift shift, AttendanceType type,
                                          LocalDateTime in, LocalDateTime out, String note,
                                          boolean autoFilled, String username, AttendanceSetting settings) {
        return saveComputed(schedule, shift, type, in, out, note, autoFilled, username, settings, null);
    }

    /** otOverrideMinutes lets a manual mark (UC-AT-03) replace the auto-computed OT (BR-AT-10). */
    private AttendanceRecord saveComputed(WorkSchedule schedule, WorkShift shift, AttendanceType type,
                                          LocalDateTime in, LocalDateTime out, String note,
                                          boolean autoFilled, String username, AttendanceSetting settings,
                                          Integer otOverrideMinutes) {
        CalcResult metrics = type == AttendanceType.PRESENT
                ? calculator.compute(new CalcInput(schedule.getWorkDate(),
                        shift.getStartTime(), shift.getEndTime(), in, out, settings))
                : new CalcResult(0, 0, 0, 0, BigDecimal.ZERO, false);

        AttendanceRecord record = recordRepository.findByScheduleId(schedule.getId())
                .orElseGet(() -> AttendanceRecord.builder()
                        .scheduleId(schedule.getId())
                        .createdBy(username)
                        .build());
        record.setType(type);
        record.setActualCheckIn(type == AttendanceType.PRESENT ? in : null);
        record.setActualCheckOut(type == AttendanceType.PRESENT ? out : null);
        record.setWorkedMinutes(metrics.workedMinutes());
        record.setLateMinutes(metrics.lateMinutes());
        record.setEarlyLeaveMinutes(metrics.earlyLeaveMinutes());
        record.setOtMinutes(otOverrideMinutes != null ? otOverrideMinutes : metrics.otMinutes());
        record.setWorkCredit(metrics.workCredit());
        record.setAutoFilled(autoFilled);
        record.setNote(note);
        return recordRepository.save(record);
    }

    /** BR-AT-07: substitute only on leave marks, must differ from the scheduled employee. */
    private void applySubstitute(WorkSchedule schedule, String substituteEmployeeId, AttendanceType type) {
        if (substituteEmployeeId == null) {
            if (type == AttendanceType.PRESENT && schedule.getSubstituteEmployeeId() != null) {
                schedule.setSubstituteEmployeeId(null);
                scheduleRepository.save(schedule);
            }
            return;
        }
        if (type == AttendanceType.PRESENT) {
            throw new ApplicationException(ApplicationError.AT_SUBSTITUTE_SINGLE_ONLY,
                    "Chỉ định người làm thay chỉ áp dụng khi ghi nhận nghỉ làm");
        }
        if (substituteEmployeeId.equals(schedule.getEmployeeId())) {
            throw new ApplicationException(ApplicationError.AT_SUBSTITUTE_SELF);
        }
        Employee substitute = employeeRepository.findById(substituteEmployeeId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.EMPLOYEE_NOT_FOUND));
        if (substitute.getStatus() != EmployeeStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.AT_EMPLOYEE_INACTIVE);
        }
        schedule.setSubstituteEmployeeId(substituteEmployeeId);
        scheduleRepository.save(schedule);
    }

    @Override
    public void deleteRecord(String recordId) {
        AttendanceRecord record = requireRecord(recordId);
        violationRepository.deleteByAttendanceRecordId(recordId);
        recordRepository.delete(record);
    }

    // ---- Violations (UC-AT-06) ----

    @Override
    @Transactional(readOnly = true)
    public List<ViolationResponse> listViolations(String recordId) {
        requireRecord(recordId);
        return toViolationResponses(violationRepository.findByAttendanceRecordId(recordId));
    }

    @Override
    public List<ViolationResponse> replaceViolations(String recordId, List<ViolationRequest> rows) {
        requireRecord(recordId);
        Map<String, ViolationType> typesById = violationTypeRepository
                .findAllById(rows.stream().map(ViolationRequest::violationTypeId).toList())
                .stream().collect(Collectors.toMap(ViolationType::getId, Function.identity()));

        violationRepository.deleteByAttendanceRecordId(recordId);
        List<Violation> saved = new ArrayList<>();
        for (ViolationRequest row : rows) {
            ViolationType type = typesById.get(row.violationTypeId());
            if (type == null) {
                throw new ApplicationException(ApplicationError.AT_VIOLATION_TYPE_NOT_FOUND);
            }
            BigDecimal penalty = row.appliedPenalty() != null ? row.appliedPenalty() : type.getPenaltyAmount();
            saved.add(violationRepository.save(Violation.builder()
                    .attendanceRecordId(recordId)
                    .violationTypeId(type.getId())
                    .count(row.count())
                    .appliedPenalty(penalty)
                    .build()));
        }
        return toViolationResponses(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ViolationTypeResponse> listViolationTypes() {
        return violationTypeRepository.findByDeletedFalseOrderByName().stream()
                .map(mapper::toViolationTypeResponse).toList();
    }

    @Override
    public ViolationTypeResponse createViolationType(ViolationTypeRequest request) {
        ViolationType type = ViolationType.builder()
                .name(request.name().trim())
                .penaltyAmount(request.penaltyAmount())
                .build();
        return mapper.toViolationTypeResponse(violationTypeRepository.save(type));
    }

    @Override
    public ViolationTypeResponse updateViolationType(String id, ViolationTypeRequest request) {
        ViolationType type = requireViolationType(id);
        type.setName(request.name().trim());
        type.setPenaltyAmount(request.penaltyAmount());
        return mapper.toViolationTypeResponse(violationTypeRepository.save(type));
    }

    @Override
    public void deleteViolationType(String id) {
        ViolationType type = requireViolationType(id);
        if (violationRepository.existsByViolationTypeId(id)) {
            type.setDeleted(true); // referenced by history — soft delete keeps totals valid
            violationTypeRepository.save(type);
        } else {
            violationTypeRepository.delete(type);
        }
    }

    // ---- Aggregation (UC-AT-07, BR-AT-12/13) ----

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceSummaryRow> summary(LocalDate start, LocalDate end) {
        List<WorkSchedule> schedules = scheduleRepository.findByWorkDateBetween(start, end);
        Map<String, AttendanceRecord> recordsByScheduleId = recordRepository
                .findByScheduleIdIn(schedules.stream().map(WorkSchedule::getId).toList())
                .stream().collect(Collectors.toMap(AttendanceRecord::getScheduleId, Function.identity()));
        Map<String, BigDecimal> penaltyByRecordId = penaltyTotals(recordsByScheduleId.values());
        Map<String, Employee> employeesById = employeesFor(schedules);

        Map<String, List<WorkSchedule>> byEmployee = schedules.stream()
                .collect(Collectors.groupingBy(WorkSchedule::getEmployeeId, LinkedHashMap::new,
                        Collectors.toList()));

        List<AttendanceSummaryRow> rows = new ArrayList<>();
        byEmployee.forEach((employeeId, empSchedules) -> {
            Employee employee = employeesById.get(employeeId);
            int present = 0, leaveApproved = 0, leaveUnapproved = 0;
            int late = 0, early = 0, ot = 0;
            BigDecimal credit = BigDecimal.ZERO;
            BigDecimal penalty = BigDecimal.ZERO;
            for (WorkSchedule s : empSchedules) {
                AttendanceRecord r = recordsByScheduleId.get(s.getId());
                if (r == null) continue;
                switch (r.getType()) {
                    case PRESENT -> present++;
                    case LEAVE_APPROVED -> leaveApproved++;
                    case LEAVE_UNAPPROVED -> leaveUnapproved++;
                }
                late += r.getLateMinutes();
                early += r.getEarlyLeaveMinutes();
                ot += r.getOtMinutes();
                credit = credit.add(r.getWorkCredit());
                penalty = penalty.add(penaltyByRecordId.getOrDefault(r.getId(), BigDecimal.ZERO));
            }
            rows.add(new AttendanceSummaryRow(employeeId,
                    employee != null ? employee.getCode() : null,
                    employee != null ? employee.getName() : null,
                    empSchedules.size(), present, leaveApproved, leaveUnapproved,
                    credit, late, early, ot, penalty));
        });
        rows.sort(Comparator.comparing(r -> r.employeeCode() != null ? r.employeeCode() : ""));
        return rows;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceForPayroll> listForPayroll(String employeeId, LocalDate start, LocalDate end) {
        List<Object[]> rows = recordRepository.findWithScheduleForEmployee(employeeId, start, end);
        Set<String> shiftIds = rows.stream()
                .map(row -> ((WorkSchedule) row[1]).getShiftId())
                .collect(Collectors.toSet());
        Map<String, WorkShift> shiftsById = shiftRepository.findAllById(shiftIds).stream()
                .collect(Collectors.toMap(WorkShift::getId, Function.identity()));
        return rows.stream().map(row -> {
            AttendanceRecord r = (AttendanceRecord) row[0];
            WorkSchedule s = (WorkSchedule) row[1];
            WorkShift shift = shiftsById.get(s.getShiftId());
            return new AttendanceForPayroll(s.getWorkDate(), s.getShiftId(),
                    shift != null ? shift.getName() : null,
                    shift != null ? shift.getStartTime() : null,
                    shift != null ? shift.getEndTime() : null,
                    r.getType(), r.getActualCheckIn(), r.getActualCheckOut(),
                    r.getWorkedMinutes(), r.getOtMinutes(),
                    r.getLateMinutes(), r.getEarlyLeaveMinutes(), r.getWorkCredit());
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal violationTotal(String employeeId, LocalDate start, LocalDate end) {
        BigDecimal total = violationRepository.totalPenaltyForEmployee(employeeId, start, end);
        return total != null ? total : BigDecimal.ZERO;
    }

    // ---- helpers ----

    private Map<String, List<ViolationResponse>> violationsByRecord(java.util.Collection<AttendanceRecord> records) {
        List<Violation> violations = violationRepository.findByAttendanceRecordIdIn(
                records.stream().map(AttendanceRecord::getId).toList());
        Map<String, ViolationType> typesById = violationTypeRepository
                .findAllById(violations.stream().map(Violation::getViolationTypeId).distinct().toList())
                .stream().collect(Collectors.toMap(ViolationType::getId, Function.identity()));
        Map<String, List<ViolationResponse>> byRecord = new HashMap<>();
        for (Violation v : violations) {
            byRecord.computeIfAbsent(v.getAttendanceRecordId(), k -> new ArrayList<>())
                    .add(mapper.toViolationResponse(v, typesById));
        }
        return byRecord;
    }

    private Map<String, BigDecimal> penaltyTotals(java.util.Collection<AttendanceRecord> records) {
        List<Violation> violations = violationRepository.findByAttendanceRecordIdIn(
                records.stream().map(AttendanceRecord::getId).toList());
        Map<String, BigDecimal> totals = new HashMap<>();
        for (Violation v : violations) {
            totals.merge(v.getAttendanceRecordId(),
                    v.getAppliedPenalty().multiply(BigDecimal.valueOf(v.getCount())),
                    BigDecimal::add);
        }
        return totals;
    }

    private Map<String, Employee> employeesFor(List<WorkSchedule> schedules) {
        List<String> ids = schedules.stream()
                .flatMap(s -> Stream.of(s.getEmployeeId(), s.getSubstituteEmployeeId()))
                .filter(id -> id != null)
                .distinct().toList();
        return employeeRepository.findByIdIn(ids).stream()
                .collect(Collectors.toMap(Employee::getId, Function.identity()));
    }

    private Map<String, WorkShift> shiftsFor(List<WorkSchedule> schedules) {
        Set<String> ids = schedules.stream().map(WorkSchedule::getShiftId).collect(Collectors.toSet());
        return shiftRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(WorkShift::getId, Function.identity()));
    }

    private WorkSchedule requireSchedule(String scheduleId) {
        return scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_SCHEDULE_NOT_FOUND));
    }

    private AttendanceRecord requireRecord(String recordId) {
        return recordRepository.findById(recordId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_RECORD_NOT_FOUND));
    }

    private ViolationType requireViolationType(String id) {
        return violationTypeRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_VIOLATION_TYPE_NOT_FOUND));
    }

    private List<ViolationResponse> toViolationResponses(List<Violation> violations) {
        Map<String, ViolationType> typesById = violationTypeRepository
                .findAllById(violations.stream().map(Violation::getViolationTypeId).distinct().toList())
                .stream().collect(Collectors.toMap(ViolationType::getId, Function.identity()));
        return violations.stream().map(v -> mapper.toViolationResponse(v, typesById)).toList();
    }
}
