package com.rms.restaurant.module.roster.service.impl;

import com.rms.restaurant.common.utils.enums.AttendanceStatus;
import com.rms.restaurant.common.utils.enums.ShiftRequestStatus;
import com.rms.restaurant.common.utils.enums.ShiftRequestType;
import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.enums.WeekStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.roster.dto.*;
import com.rms.restaurant.module.roster.mapper.RosterMapper;
import com.rms.restaurant.module.roster.model.RosterAssignment;
import com.rms.restaurant.module.roster.model.RosterAttendance;
import com.rms.restaurant.module.roster.model.RosterRequest;
import com.rms.restaurant.module.roster.model.ShiftTemplate;
import com.rms.restaurant.module.roster.model.WeekPublication;
import com.rms.restaurant.module.roster.repository.RosterAssignmentRepository;
import com.rms.restaurant.module.roster.repository.RosterAttendanceRepository;
import com.rms.restaurant.module.roster.repository.RosterRequestRepository;
import com.rms.restaurant.module.roster.repository.ShiftTemplateRepository;
import com.rms.restaurant.module.roster.repository.WeekPublicationRepository;
import com.rms.restaurant.module.roster.service.RosterService;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RosterServiceImpl implements RosterService {

    // BR-WS-05
    private static final int MIN_REST_MINUTES = 8 * 60;
    // BR-WS-06
    private static final int SWAP_FREEZE_HOURS = 12;
    // BR-WS-07
    private static final int CLOCK_IN_EARLY_MINUTES = 30;
    private static final int CLOCK_IN_LATE_WINDOW_MINUTES = 60;
    private static final int CLOCK_IN_GRACE_MINUTES = 15;
    // BR-WS-14: a CHECKED_IN record with no clock-out past end + this grace is flagged
    // MISSING_CLOCKOUT (never auto-filled; a manager resolves the actual out time).
    private static final int AUTO_CLOCKOUT_GRACE_MINUTES = 2 * 60;

    private final ShiftTemplateRepository templateRepo;
    private final RosterAssignmentRepository assignmentRepo;
    private final RosterAttendanceRepository attendanceRepo;
    private final RosterRequestRepository requestRepo;
    private final WeekPublicationRepository weekPubRepo;
    private final UserRepository userRepo;
    private final ShiftRepository cashShiftRepo;
    private final RosterMapper mapper;

    // ─────────────────────────── Templates (WS-01) ───────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ShiftTemplateResponse> listTemplates() {
        return templateRepo.findAll().stream().map(mapper::toTemplateResponse).toList();
    }

    @Override
    public ShiftTemplateResponse createTemplate(ShiftTemplateRequest request) {
        validateTemplateTimes(request.startTime(), request.endTime(), request.breakMinutes());
        if (templateRepo.existsByNameIgnoreCase(request.name())) {
            throw new ConflictException(ApplicationError.DUPLICATE_TEMPLATE_NAME);
        }
        ShiftTemplate saved = templateRepo.save(ShiftTemplate.builder()
                .name(request.name())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .breakMinutes(request.breakMinutes())
                .headcountTarget(request.headcountTarget())
                .wage(request.wage())
                .build());
        return mapper.toTemplateResponse(saved);
    }

    @Override
    public ShiftTemplateResponse updateTemplate(String id, ShiftTemplateRequest request) {
        ShiftTemplate template = templateRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.TEMPLATE_NOT_FOUND));
        validateTemplateTimes(request.startTime(), request.endTime(), request.breakMinutes());
        if (templateRepo.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new ConflictException(ApplicationError.DUPLICATE_TEMPLATE_NAME);
        }
        template.setName(request.name());
        template.setStartTime(request.startTime());
        template.setEndTime(request.endTime());
        template.setBreakMinutes(request.breakMinutes());
        template.setHeadcountTarget(request.headcountTarget());
        template.setWage(request.wage());
        return mapper.toTemplateResponse(templateRepo.save(template));
    }

    @Override
    public void deleteTemplate(String id) {
        if (!templateRepo.existsById(id)) {
            throw new ResourceNotFoundException(ApplicationError.TEMPLATE_NOT_FOUND);
        }
        if (assignmentRepo.existsByShiftTemplateId(id)) {
            throw new ConflictException(ApplicationError.TEMPLATE_IN_USE);
        }
        templateRepo.deleteById(id);
    }

    // BR-WS-01 / BR-WS-13: break shorter than total shift length. end <= start is
    // permitted and denotes an overnight shift that ends on the next calendar day;
    // its duration is measured across midnight. All downstream math (worked hours,
    // overlap, no-show) already rolls the end +1 day, so overnight is fully supported.
    private void validateTemplateTimes(LocalTime start, LocalTime end, int breakMinutes) {
        int spanMinutes = (end.toSecondOfDay() - start.toSecondOfDay()) / 60;
        int durationMinutes = end.isAfter(start) ? spanMinutes : spanMinutes + 24 * 60; // crosses midnight
        if (durationMinutes <= 0) {
            throw new ApplicationException(ApplicationError.TEMPLATE_INVALID_TIME_RANGE);
        }
        if (breakMinutes >= durationMinutes) {
            throw new ApplicationException(ApplicationError.TEMPLATE_BREAK_TOO_LONG);
        }
    }

    // ─────────────────────── Assignments (WS-03, BR-WS-02/05) ────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentResponse> listAssignments() {
        return assignmentRepo.findAll().stream().map(mapper::toAssignmentResponse).toList();
    }

    @Override
    public List<AssignmentResponse> createAssignments(AssignmentCreateRequest request) {
        // Use the full template lookup (not just the requested ids) since validateOccurrences
        // also needs to resolve each employee's pre-existing occurrences in the window.
        Map<String, ShiftTemplate> templatesById = allTemplatesById();
        for (String id : request.shiftTemplateIds()) {
            if (!templatesById.containsKey(id)) throw new ResourceNotFoundException(ApplicationError.TEMPLATE_NOT_FOUND);
        }
        List<Occurrence> incoming = request.shiftTemplateIds().stream()
                .map(id -> new Occurrence(request.date(), id))
                .toList();
        List<Integer> repeatDays = request.repeatWeekly() && request.repeatDays() != null ? request.repeatDays() : List.of();

        List<RosterAssignment> created = new ArrayList<>();
        for (String employeeId : request.employeeIds()) {
            User employee = requireUser(employeeId);
            List<Occurrence> existing = occurrencesInRange(employeeId,
                    request.date().minusDays(1), request.date().plusDays(1), null);
            validateOccurrences(existing, incoming, templatesById, employee.getFullName());

            for (String templateId : request.shiftTemplateIds()) {
                RosterAssignment assignment = RosterAssignment.builder()
                        .employeeId(employeeId)
                        .shiftTemplateId(templateId)
                        .startDate(request.date())
                        .repeatWeekly(request.repeatWeekly())
                        .repeatEnd(request.repeatWeekly() ? request.repeatEnd() : null)
                        .holidayWork(request.holidayWork())
                        .build();
                assignment.setRepeatDays(repeatDays);
                created.add(assignmentRepo.save(assignment));
            }
        }
        return created.stream().map(mapper::toAssignmentResponse).toList();
    }

    @Override
    public AssignmentResponse updateAssignment(String id, AssignmentUpdateRequest request) {
        RosterAssignment assignment = assignmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ASSIGNMENT_NOT_FOUND));

        if (request.repeatWeekly()) {
            LocalDate anchor = assignment.getStartDate();
            List<Occurrence> existing = occurrencesInRange(assignment.getEmployeeId(),
                    anchor.minusDays(1), anchor.plusDays(7), assignment.getId());
            List<Occurrence> incoming = List.of(new Occurrence(anchor, assignment.getShiftTemplateId()));
            User employee = requireUser(assignment.getEmployeeId());
            validateOccurrences(existing, incoming, allTemplatesById(), employee.getFullName());
        }

        assignment.setRepeatWeekly(request.repeatWeekly());
        assignment.setRepeatDays(request.repeatWeekly() && request.repeatDays() != null ? request.repeatDays() : List.of());
        assignment.setRepeatEnd(request.repeatWeekly() ? request.repeatEnd() : null);
        assignment.setHolidayWork(request.holidayWork());
        return mapper.toAssignmentResponse(assignmentRepo.save(assignment));
    }

    @Override
    public void deleteAssignment(String id) {
        if (!assignmentRepo.existsById(id)) {
            throw new ResourceNotFoundException(ApplicationError.ASSIGNMENT_NOT_FOUND);
        }
        assignmentRepo.deleteById(id);
    }

    // ───────────────────── Publish workflow (WS-02, BR-WS-03/04) ─────────────

    @Override
    @Transactional(readOnly = true)
    public WeekStatusResponse getWeekStatus(LocalDate weekStart) {
        LocalDate monday = toMonday(weekStart);
        return weekPubRepo.findById(monday)
                .map(mapper::toWeekStatus)
                .orElse(new WeekStatusResponse(monday, WeekStatus.DRAFT, 0, null));
    }

    @Override
    public WeekStatusResponse publishWeek(LocalDate weekStart) {
        LocalDate monday = toMonday(weekStart);
        WeekPublication pub = weekPubRepo.findById(monday)
                .orElse(WeekPublication.builder().weekStart(monday).version(0).build());
        pub.setStatus(WeekStatus.PUBLISHED);
        pub.setVersion(pub.getVersion() + 1);
        pub.setPublishedAt(LocalDateTime.now());
        // BR-WS-02/04: staff-facing visibility is enforced in listMyAttendance (BR-WS-03).
        // Staff notification on publish/re-publish is intentionally deferred — the only
        // channel available is email, and an in-app channel is preferred before blasting
        // every assigned staff member. Re-enable here once that channel exists.
        return mapper.toWeekStatus(weekPubRepo.save(pub));
    }

    private LocalDate toMonday(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    // ────────────────── Attendance / clock in-out (WS-07/08/09) ──────────────

    @Override
    @Transactional
    public List<AttendanceResponse> listAttendanceForEmployee(String employeeId, LocalDate from, LocalDate to) {
        List<RosterAssignment> assignments = assignmentRepo.findByEmployeeId(employeeId);
        Map<String, ShiftTemplate> templatesById = allTemplatesById();
        List<RosterAttendance> existingList = attendanceRepo.findByEmployeeIdAndWorkDateBetween(employeeId, from, to);
        Map<String, RosterAttendance> existingByKey = existingList.stream()
                .collect(Collectors.toMap(a -> a.getWorkDate() + "|" + a.getShiftTemplateId(), a -> a));

        List<RosterAttendance> result = new ArrayList<>();
        java.util.Set<String> coveredKeys = new java.util.HashSet<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            for (RosterAssignment a : assignments) {
                if (!occursOn(a, d)) continue;
                ShiftTemplate template = templatesById.get(a.getShiftTemplateId());
                if (template == null) continue;
                String key = d + "|" + a.getShiftTemplateId();
                coveredKeys.add(key);
                RosterAttendance record = existingByKey.getOrDefault(key, virtualAttendance(employeeId, d, a));
                result.add(finalizeIfElapsed(record, template, d));
            }
        }
        // A request approval (e.g. LEAVE) excludes the date from the assignment's recurrence,
        // so occursOn() above no longer surfaces it — but the persisted attendance row (status
        // LEAVE) for that date must still appear in the schedule/report.
        for (RosterAttendance record : existingList) {
            String key = record.getWorkDate() + "|" + record.getShiftTemplateId();
            if (coveredKeys.add(key)) result.add(record);
        }
        return result.stream()
                .sorted(Comparator.comparing(RosterAttendance::getWorkDate))
                .map(mapper::toAttendanceResponse)
                .toList();
    }

    @Override
    @Transactional
    public List<AttendanceResponse> listMyAttendance(String username, LocalDate from, LocalDate to) {
        // BR-WS-03: a staff member only sees dates whose week is PUBLISHED. Enforced on the
        // backend (not just the frontend) so a direct API call cannot reveal a DRAFT schedule.
        // The manager report path (listAttendanceForEmployee) stays ungated.
        List<AttendanceResponse> all = listAttendanceForEmployee(requireUserByUsername(username).getId(), from, to);
        Map<LocalDate, Boolean> publishedByWeek = new java.util.HashMap<>();
        return all.stream()
                .filter(a -> publishedByWeek.computeIfAbsent(toMonday(a.date()), monday ->
                        weekPubRepo.findById(monday)
                                .map(p -> p.getStatus() == WeekStatus.PUBLISHED)
                                .orElse(false)))
                .toList();
    }

    @Override
    public AttendanceResponse clockIn(String username, ClockActionRequest request) {
        String employeeId = requireUserByUsername(username).getId();
        ShiftTemplate template = loadTemplate(request.shiftTemplateId());
        LocalDateTime start = LocalDateTime.of(request.date(), template.getStartTime());
        long minutesFromStart = Duration.between(start, LocalDateTime.now()).toMinutes();
        if (minutesFromStart < -CLOCK_IN_EARLY_MINUTES || minutesFromStart > CLOCK_IN_LATE_WINDOW_MINUTES) {
            throw new ApplicationException(ApplicationError.CLOCK_ACTION_OUT_OF_WINDOW,
                    "Clock-in is only allowed within " + CLOCK_IN_EARLY_MINUTES + " minutes before to "
                            + CLOCK_IN_LATE_WINDOW_MINUTES + " minutes after shift start.");
        }
        RosterAttendance record = attendanceRepo
                .findByEmployeeIdAndWorkDateAndShiftTemplateId(employeeId, request.date(), request.shiftTemplateId())
                .orElseGet(() -> RosterAttendance.builder()
                        .employeeId(employeeId).workDate(request.date()).shiftTemplateId(request.shiftTemplateId())
                        .status(AttendanceStatus.SCHEDULED).late(false).build());
        record.setStatus(AttendanceStatus.CHECKED_IN);
        record.setCheckInAt(LocalDateTime.now());
        record.setLate(minutesFromStart > CLOCK_IN_GRACE_MINUTES);
        return mapper.toAttendanceResponse(attendanceRepo.save(record));
    }

    @Override
    public AttendanceResponse clockOut(String username, ClockActionRequest request) {
        String employeeId = requireUserByUsername(username).getId();
        ShiftTemplate template = loadTemplate(request.shiftTemplateId());
        RosterAttendance record = attendanceRepo
                .findByEmployeeIdAndWorkDateAndShiftTemplateId(employeeId, request.date(), request.shiftTemplateId())
                .filter(a -> a.getStatus() == AttendanceStatus.CHECKED_IN && a.getCheckInAt() != null)
                .orElseThrow(() -> new ApplicationException(ApplicationError.ATTENDANCE_NOT_CHECKED_IN));

        // BR-X-02: cashier must close their cash shift before clocking out
        if (cashShiftRepo.findByCashierIdAndStatus(employeeId, "OPEN").isPresent()) {
            throw new ApplicationException(ApplicationError.CLOCK_OUT_OPEN_SHIFT);
        }

        LocalDateTime shiftStart = LocalDateTime.of(request.date(), template.getStartTime());
        LocalDateTime shiftEndRaw = LocalDateTime.of(request.date(), template.getEndTime());
        LocalDateTime shiftEnd = !shiftEndRaw.isAfter(shiftStart) ? shiftEndRaw.plusDays(1) : shiftEndRaw;
        LocalDateTime now = LocalDateTime.now();

        // BR-WS-11: clocking out before the scheduled end is an EARLY_LEAVE and requires
        // a reason (LEAVE_APPROVED / LEAVE_UNAPPROVED / INCIDENT, optional free note).
        boolean earlyLeave = now.isBefore(shiftEnd);
        if (earlyLeave && (request.reason() == null || request.reason().isBlank())) {
            throw new ApplicationException(ApplicationError.EARLY_LEAVE_REASON_REQUIRED);
        }

        // BR-WS-08: paid from scheduled start (not early check-in), capped at scheduled end.
        LocalDateTime effectiveStart = record.getCheckInAt().isAfter(shiftStart) ? record.getCheckInAt() : shiftStart;
        LocalDateTime effectiveEnd = now.isBefore(shiftEnd) ? now : shiftEnd;
        long workedMinutes = Math.max(0, Duration.between(effectiveStart, effectiveEnd).toMinutes());

        record.setStatus(earlyLeave ? AttendanceStatus.EARLY_LEAVE : AttendanceStatus.CHECKED_OUT);
        record.setCheckOutAt(now);
        record.setWorkedMinutes((int) workedMinutes);
        record.setClockOutReason(earlyLeave ? request.reason().trim() : null);
        return mapper.toAttendanceResponse(attendanceRepo.save(record));
    }

    private RosterAttendance virtualAttendance(String employeeId, LocalDate date, RosterAssignment assignment) {
        return RosterAttendance.builder()
                .employeeId(employeeId).workDate(date).shiftTemplateId(assignment.getShiftTemplateId())
                .assignmentId(assignment.getId()).status(AttendanceStatus.SCHEDULED).late(false).build();
    }

    // BR-WS-09: a SCHEDULED shift whose window has fully elapsed is finalized as NO_SHOW.
    // BR-WS-14: a CHECKED_IN shift still open past end + grace is flagged MISSING_CLOCKOUT
    // (not auto-filled — worked hours stay null until a manager enters the actual out time).
    private RosterAttendance finalizeIfElapsed(RosterAttendance record, ShiftTemplate template, LocalDate date) {
        LocalDateTime start = LocalDateTime.of(date, template.getStartTime());
        LocalDateTime endRaw = LocalDateTime.of(date, template.getEndTime());
        LocalDateTime end = !endRaw.isAfter(start) ? endRaw.plusDays(1) : endRaw;
        LocalDateTime now = LocalDateTime.now();

        if (record.getStatus() == AttendanceStatus.SCHEDULED && now.isAfter(end)) {
            record.setStatus(AttendanceStatus.NO_SHOW);
            return attendanceRepo.save(record);
        }
        if (record.getStatus() == AttendanceStatus.CHECKED_IN
                && now.isAfter(end.plusMinutes(AUTO_CLOCKOUT_GRACE_MINUTES))) {
            record.setStatus(AttendanceStatus.MISSING_CLOCKOUT);
            return attendanceRepo.save(record);
        }
        return record;
    }

    // ───────────────────── Swap / leave requests (WS-05/06) ──────────────────

    @Override
    public RequestResponse createRequest(String requesterUsername, RequestCreateRequest request) {
        String requesterId = requireUserByUsername(requesterUsername).getId();
        ShiftTemplate template = loadTemplate(request.shiftTemplateId());
        RosterAssignment assignment = findOccurringAssignment(requesterId, request.date(), request.shiftTemplateId());

        LocalDateTime start = LocalDateTime.of(request.date(), template.getStartTime());
        double hoursUntilStart = Duration.between(LocalDateTime.now(), start).toMinutes() / 60.0;
        if (hoursUntilStart < SWAP_FREEZE_HOURS) {
            throw new ApplicationException(ApplicationError.ROSTER_REQUEST_FREEZE_WINDOW,
                    "Cannot submit a request within " + SWAP_FREEZE_HOURS + " hours of shift start. Please contact your manager directly.");
        }
        if (requestRepo.existsByRequesterIdAndWorkDateAndShiftTemplateIdAndStatus(
                requesterId, request.date(), request.shiftTemplateId(), ShiftRequestStatus.PENDING)) {
            throw new ConflictException(ApplicationError.ROSTER_REQUEST_DUPLICATE_PENDING);
        }
        if (request.type() == ShiftRequestType.SWAP && request.targetEmployeeId() == null) {
            throw new ApplicationException(ApplicationError.ASSIGNMENT_NOT_FOUND, "targetEmployeeId is required for SWAP requests.");
        }

        RosterRequest created = requestRepo.save(RosterRequest.builder()
                .type(request.type())
                .requesterId(requesterId)
                .workDate(request.date())
                .shiftTemplateId(request.shiftTemplateId())
                .assignmentId(assignment.getId())
                .targetEmployeeId(request.type() == ShiftRequestType.SWAP ? request.targetEmployeeId() : null)
                .reason(request.reason())
                .status(ShiftRequestStatus.PENDING)
                .build());
        return mapper.toRequestResponse(created);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RequestResponse> listRequests() {
        return requestRepo.findAllByOrderByCreatedAtDesc().stream().map(mapper::toRequestResponse).toList();
    }

    @Override
    public RequestResponse approveRequest(String id, RequestDecisionRequest request) {
        RosterRequest shiftRequest = requireRequest(id);

        if (shiftRequest.getType() == ShiftRequestType.SWAP && shiftRequest.getTargetEmployeeId() != null) {
            User target = requireUser(shiftRequest.getTargetEmployeeId());
            List<Occurrence> existing = occurrencesInRange(shiftRequest.getTargetEmployeeId(),
                    shiftRequest.getWorkDate().minusDays(1), shiftRequest.getWorkDate().plusDays(1), null);
            validateOccurrences(existing, List.of(new Occurrence(shiftRequest.getWorkDate(), shiftRequest.getShiftTemplateId())),
                    allTemplatesById(), target.getFullName());
        }

        RosterAssignment source = assignmentRepo.findById(shiftRequest.getAssignmentId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ASSIGNMENT_NOT_FOUND));
        source.addExcludedDate(shiftRequest.getWorkDate());
        assignmentRepo.save(source);

        if (shiftRequest.getType() == ShiftRequestType.SWAP && shiftRequest.getTargetEmployeeId() != null) {
            assignmentRepo.save(RosterAssignment.builder()
                    .employeeId(shiftRequest.getTargetEmployeeId())
                    .shiftTemplateId(shiftRequest.getShiftTemplateId())
                    .startDate(shiftRequest.getWorkDate())
                    .repeatWeekly(false)
                    .holidayWork(false)
                    .build());
        } else {
            RosterAttendance attendance = attendanceRepo
                    .findByEmployeeIdAndWorkDateAndShiftTemplateId(shiftRequest.getRequesterId(), shiftRequest.getWorkDate(), shiftRequest.getShiftTemplateId())
                    .orElseGet(() -> RosterAttendance.builder()
                            .employeeId(shiftRequest.getRequesterId()).workDate(shiftRequest.getWorkDate())
                            .shiftTemplateId(shiftRequest.getShiftTemplateId()).assignmentId(shiftRequest.getAssignmentId())
                            .late(false).build());
            attendance.setStatus(AttendanceStatus.LEAVE);
            attendanceRepo.save(attendance);
        }

        shiftRequest.setStatus(ShiftRequestStatus.APPROVED);
        shiftRequest.setManagerNote(request.managerNote());
        return mapper.toRequestResponse(requestRepo.save(shiftRequest));
    }

    @Override
    public RequestResponse rejectRequest(String id, RequestDecisionRequest request) {
        RosterRequest shiftRequest = requireRequest(id);
        shiftRequest.setStatus(ShiftRequestStatus.REJECTED);
        shiftRequest.setManagerNote(request.managerNote());
        return mapper.toRequestResponse(requestRepo.save(shiftRequest));
    }

    private RosterRequest requireRequest(String id) {
        RosterRequest shiftRequest = requestRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ROSTER_REQUEST_NOT_FOUND));
        if (shiftRequest.getStatus() != ShiftRequestStatus.PENDING) {
            throw new ConflictException(ApplicationError.ROSTER_REQUEST_NOT_PENDING);
        }
        return shiftRequest;
    }

    private RosterAssignment findOccurringAssignment(String employeeId, LocalDate date, String shiftTemplateId) {
        return assignmentRepo.findByEmployeeId(employeeId).stream()
                .filter(a -> a.getShiftTemplateId().equals(shiftTemplateId) && occursOn(a, date))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ASSIGNMENT_NOT_FOUND,
                        "No matching shift assignment found for this employee/date/shift."));
    }

    // ───────────────────────── Report (WS-09, BR-WS-10) ──────────────────────

    @Override
    @Transactional
    public List<AttendanceReportRow> getAttendanceReport(LocalDate from, LocalDate to) {
        List<User> staff = userRepo.findAll().stream().filter(u -> u.getRole() != UserRole.ADMIN).toList();
        List<AttendanceReportRow> rows = new ArrayList<>();
        for (User user : staff) {
            List<AttendanceResponse> records = listAttendanceForEmployee(user.getId(), from, to);
            int shiftCount = records.size();
            int workedMinutes = records.stream()
                    .filter(r -> r.workedMinutes() != null)
                    .mapToInt(AttendanceResponse::workedMinutes)
                    .sum();
            int lateCount = (int) records.stream().filter(AttendanceResponse::late).count();
            int noShowCount = (int) records.stream().filter(r -> r.status() == AttendanceStatus.NO_SHOW).count();
            double workedHours = Math.round(workedMinutes / 60.0 * 10) / 10.0;
            rows.add(new AttendanceReportRow(user.getId(), user.getFullName(), shiftCount, workedHours, lateCount, noShowCount));
        }
        return rows;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffSummaryResponse> listStaff() {
        return userRepo.findAll().stream()
                .filter(u -> u.getRole() != UserRole.ADMIN)
                .map(u -> new StaffSummaryResponse(u.getId(), u.getFullName(), u.getRole()))
                .toList();
    }

    // ──────────────────────────── Shared helpers ─────────────────────────────

    private record Occurrence(LocalDate date, String shiftTemplateId) {}
    private record ShiftWindow(LocalDateTime start, LocalDateTime end, String name) {}

    /** Whether `assignment`'s recurrence rule produces a concrete occurrence on `date`. */
    private boolean occursOn(RosterAssignment assignment, LocalDate date) {
        if (date.isBefore(assignment.getStartDate())) return false;
        if (assignment.getExcludedDates().contains(date)) return false;
        if (!assignment.isRepeatWeekly()) return date.equals(assignment.getStartDate());
        if (assignment.getRepeatEnd() != null && date.isAfter(assignment.getRepeatEnd())) return false;
        return assignment.getRepeatDays().contains(date.getDayOfWeek().getValue());
    }

    private List<Occurrence> occurrencesInRange(String employeeId, LocalDate from, LocalDate to, String excludeAssignmentId) {
        List<RosterAssignment> assignments = assignmentRepo.findByEmployeeId(employeeId);
        List<Occurrence> result = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            for (RosterAssignment a : assignments) {
                if (excludeAssignmentId != null && excludeAssignmentId.equals(a.getId())) continue;
                if (occursOn(a, d)) result.add(new Occurrence(d, a.getShiftTemplateId()));
            }
        }
        return result;
    }

    /**
     * BR-WS-02 (no overlapping shift times) and BR-WS-05 (min rest between consecutive shifts),
     * evaluated across the union of `existing` + `incoming` occurrences for one employee.
     */
    private void validateOccurrences(List<Occurrence> existing, List<Occurrence> incoming,
                                      Map<String, ShiftTemplate> templatesById, String employeeName) {
        List<ShiftWindow> windows = new ArrayList<>();
        for (Occurrence o : existing) windows.add(toWindow(o, templatesById));
        for (Occurrence o : incoming) windows.add(toWindow(o, templatesById));
        windows.sort(Comparator.comparing(ShiftWindow::start));

        for (int i = 0; i < windows.size(); i++) {
            for (int j = i + 1; j < windows.size(); j++) {
                ShiftWindow a = windows.get(i);
                ShiftWindow b = windows.get(j);
                if (b.start().isBefore(a.end())) {
                    throw new ConflictException(ApplicationError.SHIFT_OVERLAP,
                            employeeName + ": shift \"" + a.name() + "\" and \"" + b.name() + "\" overlap.");
                }
                long gapMinutes = Duration.between(a.end(), b.start()).toMinutes();
                if (gapMinutes < MIN_REST_MINUTES) {
                    throw new ConflictException(ApplicationError.MIN_REST_VIOLATION,
                            employeeName + ": minimum rest of " + (MIN_REST_MINUTES / 60) + "h is required between \""
                                    + a.name() + "\" and \"" + b.name() + "\".");
                }
            }
        }
    }

    private ShiftWindow toWindow(Occurrence o, Map<String, ShiftTemplate> templatesById) {
        ShiftTemplate template = templatesById.get(o.shiftTemplateId());
        LocalDateTime start = LocalDateTime.of(o.date(), template.getStartTime());
        LocalDateTime endRaw = LocalDateTime.of(o.date(), template.getEndTime());
        LocalDateTime end = !endRaw.isAfter(start) ? endRaw.plusDays(1) : endRaw;
        return new ShiftWindow(start, end, template.getName());
    }

    private Map<String, ShiftTemplate> allTemplatesById() {
        return templateRepo.findAll().stream().collect(Collectors.toMap(ShiftTemplate::getId, t -> t));
    }

    private ShiftTemplate loadTemplate(String id) {
        return templateRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.TEMPLATE_NOT_FOUND));
    }

    private User requireUser(String id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
    }

    private User requireUserByUsername(String username) {
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
    }
}
