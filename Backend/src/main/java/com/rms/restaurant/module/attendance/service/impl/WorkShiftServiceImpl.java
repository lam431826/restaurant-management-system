package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.dto.ShiftRequest;
import com.rms.restaurant.module.attendance.dto.ShiftResponse;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.attendance.model.WorkScheduleRule;
import com.rms.restaurant.module.attendance.repository.AttendanceRecordRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRuleRepository;
import com.rms.restaurant.module.attendance.repository.WorkShiftRepository;
import com.rms.restaurant.module.attendance.service.WorkShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** UC-AT-01. Deletion follows BR-AT-02: blocked once any attendance references the shift. */
@Service
@RequiredArgsConstructor
@Transactional
public class WorkShiftServiceImpl implements WorkShiftService {

    private final WorkShiftRepository workShiftRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final WorkScheduleRuleRepository workScheduleRuleRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public List<ShiftResponse> list(WorkShiftStatus status) {
        List<WorkShift> shifts = status == null
                ? workShiftRepository.findAllByOrderByStartTime()
                : workShiftRepository.findByStatusOrderByStartTime(status);
        return shifts.stream().map(mapper::toShiftResponse).toList();
    }

    @Override
    public ShiftResponse create(ShiftRequest request) {
        if (workShiftRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw new ApplicationException(ApplicationError.AT_SHIFT_NAME_DUPLICATE);
        }
        WorkShift shift = WorkShift.builder()
                .name(request.name().trim())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .checkInWindowStart(request.checkInWindowStart())
                .checkInWindowEnd(request.checkInWindowEnd())
                .applyScope(request.applyScope())
                .status(request.status() != null ? request.status() : WorkShiftStatus.ACTIVE)
                .build();
        return mapper.toShiftResponse(workShiftRepository.save(shift));
    }

    @Override
    public ShiftResponse update(String id, ShiftRequest request) {
        WorkShift shift = workShiftRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_SHIFT_NOT_FOUND));
        if (workShiftRepository.existsByNameIgnoreCaseAndIdNot(request.name().trim(), id)) {
            throw new ApplicationException(ApplicationError.AT_SHIFT_NAME_DUPLICATE);
        }
        shift.setName(request.name().trim());
        shift.setStartTime(request.startTime());
        shift.setEndTime(request.endTime());
        shift.setCheckInWindowStart(request.checkInWindowStart());
        shift.setCheckInWindowEnd(request.checkInWindowEnd());
        shift.setApplyScope(request.applyScope());
        if (request.status() != null) {
            shift.setStatus(request.status());
        }
        return mapper.toShiftResponse(workShiftRepository.save(shift));
    }

    @Override
    public void delete(String id) {
        WorkShift shift = workShiftRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.AT_SHIFT_NOT_FOUND));
        if (attendanceRecordRepository.existsForShift(id)) {
            throw new ApplicationException(ApplicationError.AT_SHIFT_HAS_ATTENDANCE);
        }
        List<WorkScheduleRule> rules = workScheduleRuleRepository.findByShiftId(id);
        workScheduleRepository.deleteByShiftId(id);
        workScheduleRuleRepository.deleteAll(rules);
        workShiftRepository.delete(shift);
    }
}
