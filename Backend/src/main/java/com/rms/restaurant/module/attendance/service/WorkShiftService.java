package com.rms.restaurant.module.attendance.service;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.module.attendance.dto.ShiftRequest;
import com.rms.restaurant.module.attendance.dto.ShiftResponse;

import java.util.List;

public interface WorkShiftService {

    List<ShiftResponse> list(WorkShiftStatus status);

    ShiftResponse create(ShiftRequest request);

    ShiftResponse update(String id, ShiftRequest request);

    void delete(String id);
}
