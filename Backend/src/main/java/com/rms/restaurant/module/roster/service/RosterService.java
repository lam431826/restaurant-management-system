package com.rms.restaurant.module.roster.service;

import com.rms.restaurant.module.roster.dto.*;

import java.time.LocalDate;
import java.util.List;

public interface RosterService {

    // WS-01
    List<ShiftTemplateResponse> listTemplates();
    ShiftTemplateResponse createTemplate(ShiftTemplateRequest request);
    ShiftTemplateResponse updateTemplate(String id, ShiftTemplateRequest request);
    void deleteTemplate(String id);

    // WS-03, BR-WS-02/05
    List<AssignmentResponse> listAssignments();
    List<AssignmentResponse> createAssignments(AssignmentCreateRequest request);
    AssignmentResponse updateAssignment(String id, AssignmentUpdateRequest request);
    void deleteAssignment(String id);

    // WS-02, BR-WS-03/04
    WeekStatusResponse getWeekStatus(LocalDate weekStart);
    WeekStatusResponse publishWeek(LocalDate weekStart);

    // WS-07/08/09, BR-WS-07/08/09
    List<AttendanceResponse> listAttendanceForEmployee(String employeeId, LocalDate from, LocalDate to);
    List<AttendanceResponse> listMyAttendance(String username, LocalDate from, LocalDate to);
    AttendanceResponse clockIn(String username, ClockActionRequest request);
    AttendanceResponse clockOut(String username, ClockActionRequest request);

    // WS-05/06, BR-WS-06
    RequestResponse createRequest(String requesterUsername, RequestCreateRequest request);
    List<RequestResponse> listRequests();
    RequestResponse approveRequest(String id, RequestDecisionRequest request);
    RequestResponse rejectRequest(String id, RequestDecisionRequest request);

    // WS-09, BR-WS-10
    List<AttendanceReportRow> getAttendanceReport(LocalDate from, LocalDate to);

    // BR-WS-14: manager lists and resolves MISSING_CLOCKOUT records
    List<AttendanceResponse> listMissingClockouts(LocalDate from, LocalDate to);
    AttendanceResponse resolveMissingClockout(String attendanceId, ResolveClockoutRequest request);

    List<StaffSummaryResponse> listStaff();
}
