package com.rms.restaurant.module.attendance.mapper;

import com.rms.restaurant.module.attendance.dto.AttendanceRecordResponse;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingResponse;
import com.rms.restaurant.module.attendance.dto.ScheduleResponse;
import com.rms.restaurant.module.attendance.dto.ShiftResponse;
import com.rms.restaurant.module.attendance.dto.ViolationResponse;
import com.rms.restaurant.module.attendance.dto.ViolationTypeResponse;
import com.rms.restaurant.module.attendance.model.AttendanceRecord;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import com.rms.restaurant.module.attendance.model.Violation;
import com.rms.restaurant.module.attendance.model.ViolationType;
import com.rms.restaurant.module.attendance.model.WorkSchedule;
import com.rms.restaurant.module.attendance.model.WorkScheduleRule;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.employee.model.Employee;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AttendanceMapper {

    public ShiftResponse toShiftResponse(WorkShift shift) {
        return new ShiftResponse(shift.getId(), shift.getName(), shift.getStartTime(), shift.getEndTime(),
                shift.getCheckInWindowStart(), shift.getCheckInWindowEnd(),
                shift.getApplyScope(), shift.getStatus());
    }

    public AttendanceSettingResponse toSettingResponse(AttendanceSetting s) {
        return new AttendanceSettingResponse(
                s.getStandardWorkdayMinutes(),
                s.isHalfDayEnabled(), s.getHalfDayMinMinutes(), s.getHalfDayMaxMinutes(),
                s.isLateEnabled(), s.getLateGraceMinutes(),
                s.isEarlyLeaveEnabled(), s.getEarlyLeaveGraceMinutes(),
                s.isOtBeforeEnabled(), s.getOtBeforeMinMinutes(),
                s.isOtAfterEnabled(), s.getOtAfterMinMinutes(),
                s.isMergedShiftEnabled(), s.getMergedShiftMaxCount(), s.getMergedShiftMaxBreakMinutes(),
                s.getManualDefaultTimeMode());
    }

    public ScheduleResponse toScheduleResponse(WorkSchedule schedule,
                                               Map<String, Employee> employeesById,
                                               Map<String, WorkShift> shiftsById,
                                               Map<String, WorkScheduleRule> rulesById) {
        Employee employee = employeesById.get(schedule.getEmployeeId());
        Employee substitute = schedule.getSubstituteEmployeeId() == null
                ? null : employeesById.get(schedule.getSubstituteEmployeeId());
        WorkShift shift = shiftsById.get(schedule.getShiftId());
        WorkScheduleRule rule = schedule.getRuleId() == null ? null : rulesById.get(schedule.getRuleId());
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getEmployeeId(),
                employee != null ? employee.getCode() : null,
                employee != null ? employee.getName() : null,
                schedule.getShiftId(),
                shift != null ? shift.getName() : null,
                shift != null ? shift.getStartTime() : null,
                shift != null ? shift.getEndTime() : null,
                schedule.getWorkDate(),
                schedule.getRuleId(),
                rule != null ? rule.getStartDate() : null,
                rule != null ? rule.getEndDate() : null,
                schedule.getSubstituteEmployeeId(),
                substitute != null ? substitute.getName() : null);
    }

    public AttendanceRecordResponse toRecordResponse(AttendanceRecord r) {
        return new AttendanceRecordResponse(r.getId(), r.getScheduleId(), r.getType(),
                r.getActualCheckIn(), r.getActualCheckOut(), r.getWorkedMinutes(),
                r.getLateMinutes(), r.getEarlyLeaveMinutes(), r.getOtMinutes(),
                r.getWorkCredit(), r.isAutoFilled(), r.getNote());
    }

    public ViolationTypeResponse toViolationTypeResponse(ViolationType t) {
        return new ViolationTypeResponse(t.getId(), t.getName(), t.getPenaltyAmount());
    }

    public ViolationResponse toViolationResponse(Violation v, Map<String, ViolationType> typesById) {
        ViolationType type = typesById.get(v.getViolationTypeId());
        return new ViolationResponse(v.getId(), v.getViolationTypeId(),
                type != null ? type.getName() : null, v.getCount(), v.getAppliedPenalty());
    }
}
