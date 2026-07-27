package com.rms.restaurant.module.employee.service.impl;

import com.rms.restaurant.module.attendance.model.AttendanceRecord;
import com.rms.restaurant.module.attendance.model.WorkSchedule;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.attendance.repository.AttendanceRecordRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRepository;
import com.rms.restaurant.module.attendance.repository.WorkShiftRepository;
import com.rms.restaurant.module.employee.dto.EmployeeDeactivationCheckResponse;
import com.rms.restaurant.module.employee.dto.EmployeeDeactivationCheckResponse.FutureScheduleItem;
import com.rms.restaurant.module.employee.dto.EmployeeDeactivationCheckResponse.OpenAttendanceInfo;
import com.rms.restaurant.module.employee.dto.EmployeeDeactivationCheckResponse.OpenPosShiftInfo;
import com.rms.restaurant.module.employee.dto.EmployeeDeactivationCheckResponse.UnfinalizedPayslipItem;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.payroll.model.PayrollSheet;
import com.rms.restaurant.module.payroll.model.Payslip;
import com.rms.restaurant.module.payroll.repository.PayrollSheetRepository;
import com.rms.restaurant.module.payroll.repository.PayslipRepository;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Deactivation-eligibility check for an employee (SRS §9 gap #2): hard blockers (future work
 * schedules, payslips on an unfinalized sheet) plus soft warnings (an open cash-register shift,
 * an unfinished attendance record today) that {@code EmployeeServiceImpl.deactivate} enforces.
 */
@Service
@RequiredArgsConstructor
public class EmployeeDeactivationCheckService {

    private static final String SHIFT_STATUS_OPEN = "OPEN"; // Shift.status is a free-text column, not an enum

    private final WorkScheduleRepository workScheduleRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final WorkShiftRepository workShiftRepository;
    private final ShiftRepository shiftRepository;
    private final PayslipRepository payslipRepository;
    private final PayrollSheetRepository payrollSheetRepository;

    @Transactional(readOnly = true)
    public EmployeeDeactivationCheckResponse check(Employee employee) {
        LocalDate today = LocalDate.now();

        List<WorkSchedule> future = workScheduleRepository
                .findByEmployeeIdAndWorkDateGreaterThanEqualOrderByWorkDateAsc(employee.getId(), today);
        List<Payslip> unfinalized = payslipRepository.findActiveOnUnfinalizedSheetsByEmployee(employee.getId());

        boolean hasOpenPosShift = false;
        OpenPosShiftInfo openPosShiftInfo = null;
        if (employee.getUserId() != null) {
            Shift openShift = shiftRepository
                    .findByCashierIdAndStatus(employee.getUserId(), SHIFT_STATUS_OPEN)
                    .orElse(null);
            if (openShift != null) {
                hasOpenPosShift = true;
                openPosShiftInfo = new OpenPosShiftInfo(openShift.getId(), openShift.getOpenedAt());
            }
        }

        List<WorkSchedule> todaySchedules = workScheduleRepository.findByEmployeeIdAndWorkDate(employee.getId(), today);
        Map<String, WorkSchedule> todaySchedulesById = todaySchedules.stream()
                .collect(Collectors.toMap(WorkSchedule::getId, Function.identity()));
        List<AttendanceRecord> todayRecords = attendanceRecordRepository.findByScheduleIdIn(todaySchedulesById.keySet());
        AttendanceRecord openAttendance = todayRecords.stream()
                .filter(r -> r.getActualCheckIn() != null && r.getActualCheckOut() == null)
                .findFirst().orElse(null);

        boolean hasOpenAttendanceToday = openAttendance != null;
        OpenAttendanceInfo openAttendanceInfo = null;
        if (openAttendance != null) {
            WorkSchedule schedule = todaySchedulesById.get(openAttendance.getScheduleId());
            String shiftName = resolveShiftName(schedule == null ? null : schedule.getShiftId());
            openAttendanceInfo = new OpenAttendanceInfo(openAttendance.getScheduleId(), shiftName, openAttendance.getActualCheckIn());
        }

        Map<String, WorkShift> shiftsById = workShiftRepository
                .findAllById(future.stream().map(WorkSchedule::getShiftId).distinct().toList())
                .stream().collect(Collectors.toMap(WorkShift::getId, Function.identity()));
        List<FutureScheduleItem> futureItems = future.stream()
                .map(s -> new FutureScheduleItem(s.getId(), s.getWorkDate(), s.getShiftId(),
                        shiftsById.containsKey(s.getShiftId()) ? shiftsById.get(s.getShiftId()).getName() : null))
                .toList();

        Map<String, PayrollSheet> sheetsById = payrollSheetRepository
                .findAllById(unfinalized.stream().map(Payslip::getPayrollSheetId).distinct().toList())
                .stream().collect(Collectors.toMap(PayrollSheet::getId, Function.identity()));
        List<UnfinalizedPayslipItem> unfinalizedItems = unfinalized.stream()
                .map(p -> {
                    PayrollSheet sheet = sheetsById.get(p.getPayrollSheetId());
                    return new UnfinalizedPayslipItem(p.getId(), p.getCode(), p.getPayrollSheetId(),
                            sheet == null ? null : sheet.getCode(),
                            sheet == null ? null : sheet.getName(),
                            sheet == null ? null : sheet.getStatus().name());
                })
                .toList();

        boolean blocked = !futureItems.isEmpty() || !unfinalizedItems.isEmpty();

        return new EmployeeDeactivationCheckResponse(
                blocked, futureItems, unfinalizedItems,
                hasOpenPosShift, openPosShiftInfo,
                hasOpenAttendanceToday, openAttendanceInfo);
    }

    private String resolveShiftName(String shiftId) {
        if (shiftId == null) return null;
        return workShiftRepository.findById(shiftId).map(WorkShift::getName).orElse(null);
    }
}
