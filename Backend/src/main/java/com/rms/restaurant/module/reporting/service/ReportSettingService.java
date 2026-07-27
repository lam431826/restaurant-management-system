package com.rms.restaurant.module.reporting.service;

import com.rms.restaurant.module.reporting.dto.ReportSettingRequest;
import com.rms.restaurant.module.reporting.dto.ReportSettingResponse;

public interface ReportSettingService {

    ReportSettingResponse get();

    ReportSettingResponse update(ReportSettingRequest request);
}
