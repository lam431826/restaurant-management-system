package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingRequest;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingResponse;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import com.rms.restaurant.module.attendance.repository.AttendanceSettingRepository;
import com.rms.restaurant.module.attendance.service.AttendanceSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** UC-AT-05. Single row seeded by V30 with AttendanceSetting.FIXED_ID; never created here. */
@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceSettingServiceImpl implements AttendanceSettingService {

    private final AttendanceSettingRepository settingRepository;
    private final AttendanceMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public AttendanceSettingResponse get() {
        return mapper.toSettingResponse(current());
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceSetting current() {
        return settingRepository.findById(AttendanceSetting.FIXED_ID)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INTERNAL_ERROR,
                        "Thiết lập chấm công chưa được khởi tạo"));
    }

    @Override
    public AttendanceSettingResponse update(AttendanceSettingRequest request) {
        validate(request);
        AttendanceSetting s = current();
        s.setHalfDayEnabled(request.halfDayEnabled());
        s.setHalfDayMinMinutes(request.halfDayMinMinutes());
        s.setHalfDayMaxMinutes(request.halfDayMaxMinutes());
        s.setLateEnabled(request.lateEnabled());
        s.setLateGraceMinutes(request.lateGraceMinutes());
        s.setEarlyLeaveEnabled(request.earlyLeaveEnabled());
        s.setEarlyLeaveGraceMinutes(request.earlyLeaveGraceMinutes());
        s.setLatePenaltyEnabled(request.latePenaltyEnabled());
        s.setLatePenaltyRoundingMinutes(request.latePenaltyRoundingMinutes());
        s.setOvertimeEnabled(request.overtimeEnabled());
        s.setOtRoundingMinutes(request.otRoundingMinutes());
        s.setMergedShiftEnabled(request.mergedShiftEnabled());
        s.setMergedShiftMaxCount(request.mergedShiftMaxCount());
        s.setMergedShiftMaxBreakMinutes(request.mergedShiftMaxBreakMinutes());
        s.setManualDefaultTimeMode(request.manualDefaultTimeMode());
        return mapper.toSettingResponse(settingRepository.save(s));
    }

    private void validate(AttendanceSettingRequest r) {
        boolean invalid = r.halfDayMinMinutes() < 0 || r.halfDayMaxMinutes() < 0
                || (r.halfDayEnabled() && r.halfDayMinMinutes() >= r.halfDayMaxMinutes())
                || r.lateGraceMinutes() < 0 || r.earlyLeaveGraceMinutes() < 0
                || r.otRoundingMinutes() < 1 || r.latePenaltyRoundingMinutes() < 1
                || (r.mergedShiftEnabled() && (r.mergedShiftMaxCount() < 2 || r.mergedShiftMaxBreakMinutes() < 0));
        if (invalid) {
            throw new ApplicationException(ApplicationError.AT_SETTING_INVALID);
        }
    }
}
