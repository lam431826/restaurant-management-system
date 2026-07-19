package com.rms.restaurant.module.attendance.service;

import com.rms.restaurant.module.attendance.dto.AttendanceForPayroll;
import com.rms.restaurant.module.attendance.dto.AttendanceRecordResponse;
import com.rms.restaurant.module.attendance.dto.AttendanceSummaryRow;
import com.rms.restaurant.module.attendance.dto.AttendanceUpsertRequest;
import com.rms.restaurant.module.attendance.dto.BulkAttendanceRequest;
import com.rms.restaurant.module.attendance.dto.TimesheetCellResponse;
import com.rms.restaurant.module.attendance.dto.ViolationRequest;
import com.rms.restaurant.module.attendance.dto.ViolationResponse;
import com.rms.restaurant.module.attendance.dto.ViolationTypeRequest;
import com.rms.restaurant.module.attendance.dto.ViolationTypeResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface AttendanceService {

    List<TimesheetCellResponse> timesheet(LocalDate start, LocalDate end);

    AttendanceRecordResponse getRecord(String recordId);

    AttendanceRecordResponse upsert(String scheduleId, AttendanceUpsertRequest request, String username);

    List<AttendanceRecordResponse> bulkMark(BulkAttendanceRequest request, String username);

    void deleteRecord(String recordId);

    List<ViolationResponse> listViolations(String recordId);

    List<ViolationResponse> replaceViolations(String recordId, List<ViolationRequest> rows);

    List<ViolationTypeResponse> listViolationTypes();

    ViolationTypeResponse createViolationType(ViolationTypeRequest request);

    ViolationTypeResponse updateViolationType(String id, ViolationTypeRequest request);

    void deleteViolationType(String id);

    List<AttendanceSummaryRow> summary(LocalDate start, LocalDate end);

    /** BR-AT-13: attendance rows for the PAY module, keyed directly by employees(id). */
    List<AttendanceForPayroll> listForPayroll(String employeeId, LocalDate start, LocalDate end);

    /** BR-AT-12: total violation penalty of one employee over a period. */
    BigDecimal violationTotal(String employeeId, LocalDate start, LocalDate end);
}
