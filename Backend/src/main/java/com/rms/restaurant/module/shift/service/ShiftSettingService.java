package com.rms.restaurant.module.shift.service;

import com.rms.restaurant.module.shift.dto.ShiftSettingRequest;
import com.rms.restaurant.module.shift.dto.ShiftSettingResponse;
import com.rms.restaurant.module.shift.model.ShiftSetting;

public interface ShiftSettingService {

    ShiftSettingResponse get();

    ShiftSettingResponse update(ShiftSettingRequest request);

    /** Current settings entity for internal use by ShiftServiceImpl/PaymentServiceImpl. */
    ShiftSetting current();
}
