package com.rms.restaurant.module.roster.mapper;

import com.rms.restaurant.module.roster.dto.*;
import com.rms.restaurant.module.roster.model.RosterAssignment;
import com.rms.restaurant.module.roster.model.RosterAttendance;
import com.rms.restaurant.module.roster.model.RosterRequest;
import com.rms.restaurant.module.roster.model.ShiftTemplate;
import com.rms.restaurant.module.roster.model.WeekPublication;
import org.springframework.stereotype.Component;

@Component
public class RosterMapper {

    public ShiftTemplateResponse toTemplateResponse(ShiftTemplate t) {
        return new ShiftTemplateResponse(t.getId(), t.getName(), t.getStartTime(), t.getEndTime(),
                t.getBreakMinutes(), t.getHeadcountTarget(), t.getWage());
    }

    public AssignmentResponse toAssignmentResponse(RosterAssignment a) {
        return new AssignmentResponse(a.getId(), a.getEmployeeId(), a.getShiftTemplateId(), a.getStartDate(),
                a.isRepeatWeekly(), a.getRepeatDays(), a.getRepeatEnd(), a.isHolidayWork(), a.getExcludedDates());
    }

    public WeekStatusResponse toWeekStatus(WeekPublication w) {
        return new WeekStatusResponse(w.getWeekStart(), w.getStatus(), w.getVersion(), w.getPublishedAt());
    }

    public AttendanceResponse toAttendanceResponse(RosterAttendance a) {
        return new AttendanceResponse(a.getId(), a.getEmployeeId(), a.getWorkDate(), a.getShiftTemplateId(),
                a.getAssignmentId(), a.getStatus(), a.getCheckInAt(), a.getCheckOutAt(), a.getWorkedMinutes(),
                a.isLate(), a.getClockOutReason());
    }

    public RequestResponse toRequestResponse(RosterRequest r) {
        return new RequestResponse(r.getId(), r.getType(), r.getRequesterId(), r.getWorkDate(), r.getShiftTemplateId(),
                r.getTargetEmployeeId(), r.getReason(), r.getStatus(), r.getManagerNote(), r.getCreatedAt());
    }
}
