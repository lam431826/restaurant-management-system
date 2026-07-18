package com.rms.restaurant.module.attendance.service;

import com.rms.restaurant.module.attendance.dto.AttendanceSettingRequest;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingResponse;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;

public interface AttendanceSettingService {

    AttendanceSettingResponse get();

    AttendanceSettingResponse update(AttendanceSettingRequest request);

    /** Current settings entity for internal calculations (UC-AT-03). */
    AttendanceSetting current();
}
