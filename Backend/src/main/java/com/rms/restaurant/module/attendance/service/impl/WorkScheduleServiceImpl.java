package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.dto.ScheduleCreateRequest;
import com.rms.restaurant.module.attendance.dto.ScheduleResponse;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.WorkSchedule;
import com.rms.restaurant.module.attendance.model.WorkScheduleRule;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.attendance.repository.AttendanceRecordRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRuleRepository;
import com.rms.restaurant.module.attendance.repository.WorkShiftRepository;
import com.rms.restaurant.module.attendance.service.WorkScheduleService;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * UC-AT-02. Repeat rules are materialized into per-day work_schedules rows over a rolling
 * 93-day window (BR-AT-04); the unique (employee, shift, date) constraint makes both the
 * initial materialization and the nightly extension idempotent.
 *
 * BR-AT-03 is interpreted as: the total pairwise overlapping minutes among one employee's
 * shifts on one work date (overnight-normalized) must not exceed 12h (720 minutes).
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class WorkScheduleServiceImpl implements WorkScheduleService {

    static final int WINDOW_DAYS = 93;
    static final int MAX_OVERLAP_MINUTES = 12 * 60;

    private final WorkScheduleRepository workScheduleRepository;
    private final WorkScheduleRuleRepository workScheduleRuleRepository;
    private final WorkShiftRepository workShiftRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public List<ScheduleResponse> listRange(LocalDate start, LocalDate end, String employeeId) {
        List<WorkSchedule> schedules = employeeId == null
                ? workScheduleRepository.findByWorkDateBetween(start, end)
                : workScheduleRepository.findByEmployeeIdAndWorkDateBetween(employeeId, start, end);
        return toResponses(schedules);
    }

    @Override
    public List<ScheduleResponse> create(ScheduleCreateRequest request) {
        List<Integer> repeatDays = request.repeatWeekly() ? sanitizeRepeatDays(request.repeatDays()) : List.of();
        List<WorkShift> shifts = request.shiftIds().stream().map(this::activeShift).toList();
        List<Employee> employees = request.employeeIds().stream().map(this::activeEmployee).toList();

        List<WorkSchedule> created = new ArrayList<>();
        for (Employee employee : employees) {
            for (WorkShift shift : shifts) {
                if (request.repeatWeekly()) {
                    WorkScheduleRule rule = workScheduleRuleRepository.save(WorkScheduleRule.builder()
                            .employeeId(employee.getId())
                            .shiftId(shift.getId())
                            .daysOfWeek(repeatDays.stream().map(String::valueOf).collect(Collectors.joining(",")))
                            .startDate(request.date())
                            .endDate(request.repeatEnd())
                            .workOnHolidays(request.workOnHolidays())
                            .generatedUntil(request.date().minusDays(1))
                            .build());
                    created.addAll(materialize(rule, shift, true));
                } else {
                    created.add(createOccurrence(employee.getId(), shift, request.date(), null, true));
                }
            }
        }
        return toResponses(created);
    }

    @Override
    public void deleteOccurrence(String scheduleId) {
        WorkSchedule schedule = workScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_SCHEDULE_NOT_FOUND));
        if (attendanceRecordRepository.findByScheduleId(scheduleId).isPresent()) {
            throw new ApplicationException(ApplicationError.AT_SCHEDULE_HAS_ATTENDANCE);
        }
        workScheduleRepository.delete(schedule);
    }

    @Override
    public void cancelRule(String ruleId) {
        WorkScheduleRule rule = workScheduleRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_SCHEDULE_RULE_NOT_FOUND));
        LocalDate yesterday = LocalDate.now().minusDays(1);
        List<WorkSchedule> removable = workScheduleRepository.findUnattendedByRuleAfter(ruleId, yesterday);
        workScheduleRepository.deleteAll(removable);
        rule.setEndDate(yesterday);
        rule.setGeneratedUntil(yesterday);
        workScheduleRuleRepository.save(rule);
    }

    @Override
    public void extendRollingWindow() {
        LocalDate horizon = LocalDate.now().plusDays(WINDOW_DAYS);
        List<WorkScheduleRule> rules = workScheduleRuleRepository
                .findByEndDateIsNullAndGeneratedUntilBefore(horizon);
        for (WorkScheduleRule rule : rules) {
            // BR-EMP-04: stop generating new occurrences for employees no longer working.
            boolean employeeActive = employeeRepository.findById(rule.getEmployeeId())
                    .map(e -> e.getStatus() == EmployeeStatus.ACTIVE).orElse(false);
            if (!employeeActive) continue;
            workShiftRepository.findById(rule.getShiftId())
                    .ifPresent(shift -> materialize(rule, shift, false));
        }
    }

    /**
     * Generates missing occurrences from the rule's watermark up to min(endDate, today+93d).
     * failOnConflict=true (interactive create) rejects the whole request on a BR-AT-03
     * violation; false (nightly job) skips the conflicting day and keeps going.
     */
    private List<WorkSchedule> materialize(WorkScheduleRule rule, WorkShift shift, boolean failOnConflict) {
        LocalDate horizon = LocalDate.now().plusDays(WINDOW_DAYS);
        if (rule.getEndDate() != null && rule.getEndDate().isBefore(horizon)) {
            horizon = rule.getEndDate();
        }
        Set<Integer> days = Stream.of(rule.getDaysOfWeek().split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).map(Integer::valueOf)
                .collect(Collectors.toSet());

        List<WorkSchedule> created = new ArrayList<>();
        LocalDate from = rule.getGeneratedUntil().isBefore(rule.getStartDate())
                ? rule.getStartDate() : rule.getGeneratedUntil().plusDays(1);
        for (LocalDate date = from; !date.isAfter(horizon); date = date.plusDays(1)) {
            if (!days.contains(date.getDayOfWeek().getValue())) continue;
            if (workScheduleRepository.existsByEmployeeIdAndShiftIdAndWorkDate(
                    rule.getEmployeeId(), shift.getId(), date)) continue;
            try {
                created.add(createOccurrence(rule.getEmployeeId(), shift, date, rule.getId(), failOnConflict));
            } catch (ApplicationException e) {
                if (failOnConflict) throw e;
                log.warn("Skipping schedule {} {} on {}: {}",
                        rule.getEmployeeId(), shift.getName(), date, e.getMessage());
            }
        }
        rule.setGeneratedUntil(horizon);
        workScheduleRuleRepository.save(rule);
        return created;
    }

    /** Inserts one occurrence after the duplicate and BR-AT-03 overlap checks. */
    private WorkSchedule createOccurrence(String employeeId, WorkShift shift, LocalDate date,
                                          String ruleId, boolean duplicateIsError) {
        if (workScheduleRepository.existsByEmployeeIdAndShiftIdAndWorkDate(employeeId, shift.getId(), date)) {
            if (duplicateIsError && ruleId == null) {
                throw new ApplicationException(ApplicationError.AT_SCHEDULE_DUPLICATE);
            }
            return null;
        }
        checkOverlapLimit(employeeId, shift, date);
        return workScheduleRepository.save(WorkSchedule.builder()
                .employeeId(employeeId)
                .shiftId(shift.getId())
                .workDate(date)
                .ruleId(ruleId)
                .build());
    }

    /** BR-AT-03: total pairwise overlap of the employee's shifts that day must stay <= 12h. */
    private void checkOverlapLimit(String employeeId, WorkShift candidate, LocalDate date) {
        List<WorkSchedule> existing = workScheduleRepository.findByEmployeeIdAndWorkDate(employeeId, date);
        if (existing.isEmpty()) return;
        Map<String, WorkShift> shiftsById = shiftsById(existing);
        List<LocalDateTime[]> intervals = new ArrayList<>();
        for (WorkSchedule s : existing) {
            WorkShift shift = shiftsById.get(s.getShiftId());
            if (shift != null) intervals.add(interval(date, shift));
        }
        intervals.add(interval(date, candidate));

        long totalOverlap = 0;
        for (int i = 0; i < intervals.size(); i++) {
            for (int j = i + 1; j < intervals.size(); j++) {
                LocalDateTime start = intervals.get(i)[0].isAfter(intervals.get(j)[0])
                        ? intervals.get(i)[0] : intervals.get(j)[0];
                LocalDateTime end = intervals.get(i)[1].isBefore(intervals.get(j)[1])
                        ? intervals.get(i)[1] : intervals.get(j)[1];
                if (end.isAfter(start)) {
                    totalOverlap += Duration.between(start, end).toMinutes();
                }
            }
        }
        if (totalOverlap > MAX_OVERLAP_MINUTES) {
            throw new ApplicationException(ApplicationError.AT_SCHEDULE_OVERLAP_LIMIT);
        }
    }

    /** Overnight-normalized scheduled window: end <= start rolls to the next day. */
    private LocalDateTime[] interval(LocalDate date, WorkShift shift) {
        LocalDateTime start = date.atTime(shift.getStartTime());
        LocalDateTime end = shift.getEndTime().isAfter(shift.getStartTime())
                ? date.atTime(shift.getEndTime())
                : date.plusDays(1).atTime(shift.getEndTime());
        return new LocalDateTime[]{start, end};
    }

    private WorkShift activeShift(String shiftId) {
        WorkShift shift = workShiftRepository.findById(shiftId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_SHIFT_NOT_FOUND));
        if (shift.getStatus() != WorkShiftStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.AT_SHIFT_INACTIVE);
        }
        return shift;
    }

    private Employee activeEmployee(String employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApplicationException(ApplicationError.EMPLOYEE_NOT_FOUND));
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.AT_EMPLOYEE_INACTIVE);
        }
        return employee;
    }

    private List<Integer> sanitizeRepeatDays(List<Integer> repeatDays) {
        if (repeatDays == null || repeatDays.isEmpty()) {
            throw new ApplicationException(ApplicationError.AT_SETTING_INVALID,
                    "Vui lòng chọn các thứ trong tuần để lặp lịch");
        }
        List<Integer> days = new ArrayList<>(new LinkedHashSet<>(repeatDays));
        if (days.stream().anyMatch(d -> d == null || d < 1 || d > 7)) {
            throw new ApplicationException(ApplicationError.AT_SETTING_INVALID,
                    "Thứ trong tuần không hợp lệ");
        }
        return days;
    }

    private List<ScheduleResponse> toResponses(List<WorkSchedule> schedules) {
        List<WorkSchedule> nonNull = schedules.stream().filter(s -> s != null).toList();
        Map<String, WorkShift> shiftsById = shiftsById(nonNull);
        Set<String> employeeIds = nonNull.stream()
                .flatMap(s -> Stream.of(s.getEmployeeId(), s.getSubstituteEmployeeId()))
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<String, Employee> employeesById = employeeRepository.findByIdIn(new ArrayList<>(employeeIds))
                .stream().collect(Collectors.toMap(Employee::getId, Function.identity()));
        return nonNull.stream()
                .sorted((a, b) -> a.getWorkDate().compareTo(b.getWorkDate()))
                .map(s -> mapper.toScheduleResponse(s, employeesById, shiftsById))
                .toList();
    }

    private Map<String, WorkShift> shiftsById(List<WorkSchedule> schedules) {
        Set<String> ids = schedules.stream().map(WorkSchedule::getShiftId).collect(Collectors.toSet());
        return workShiftRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(WorkShift::getId, Function.identity()));
    }
}
