package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.reporting.dto.ReportSettingRequest;
import com.rms.restaurant.module.reporting.dto.ReportSettingResponse;
import com.rms.restaurant.module.reporting.model.ReportSetting;
import com.rms.restaurant.module.reporting.repository.ReportSettingRepository;
import com.rms.restaurant.module.reporting.service.ReportSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Single row seeded by V59 with ReportSetting.FIXED_ID; never created here. */
@Service
@RequiredArgsConstructor
@Transactional
public class ReportSettingServiceImpl implements ReportSettingService {

    private final ReportSettingRepository settingRepository;

    @Override
    @Transactional(readOnly = true)
    public ReportSettingResponse get() {
        return toResponse(current());
    }

    @Override
    public ReportSettingResponse update(ReportSettingRequest request) {
        ReportSetting s = current();
        s.setCustomRevenueWindowEnabled(request.customRevenueWindowEnabled());
        s.setRevenueCutoffTime(request.revenueCutoffTime());
        return toResponse(settingRepository.save(s));
    }

    private ReportSetting current() {
        return settingRepository.findById(ReportSetting.FIXED_ID)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INTERNAL_ERROR,
                        "Thiết lập báo cáo chưa được khởi tạo"));
    }

    private ReportSettingResponse toResponse(ReportSetting s) {
        return new ReportSettingResponse(s.isCustomRevenueWindowEnabled(), s.getRevenueCutoffTime(), s.getUpdatedAt());
    }
}
