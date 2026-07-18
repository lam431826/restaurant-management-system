package com.rms.restaurant.module.attendance.service;

import com.rms.restaurant.module.attendance.dto.ScheduleCreateRequest;
import com.rms.restaurant.module.attendance.dto.ScheduleResponse;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleService {

    List<ScheduleResponse> listRange(LocalDate start, LocalDate end, String employeeId);

    List<ScheduleResponse> create(ScheduleCreateRequest request);

    void deleteOccurrence(String scheduleId);

    void cancelRule(String ruleId);

    /** BR-AT-04: extend endless repeat rules to today+93d. Invoked nightly and after rule creation. */
    void extendRollingWindow();
}
