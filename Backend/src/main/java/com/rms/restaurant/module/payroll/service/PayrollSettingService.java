package com.rms.restaurant.module.payroll.service;

import com.rms.restaurant.module.payroll.dto.PayrollSettingRequest;
import com.rms.restaurant.module.payroll.dto.PayrollSettingResponse;

public interface PayrollSettingService {

    PayrollSettingResponse get();

    PayrollSettingResponse update(PayrollSettingRequest request);
}
