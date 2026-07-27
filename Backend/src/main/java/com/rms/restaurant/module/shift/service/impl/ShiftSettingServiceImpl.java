package com.rms.restaurant.module.shift.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.shift.dto.ShiftSettingRequest;
import com.rms.restaurant.module.shift.dto.ShiftSettingResponse;
import com.rms.restaurant.module.shift.model.ShiftSetting;
import com.rms.restaurant.module.shift.repository.ShiftSettingRepository;
import com.rms.restaurant.module.shift.service.ShiftSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Single row seeded by V57 with ShiftSetting.FIXED_ID; never created here. */
@Service
@RequiredArgsConstructor
@Transactional
public class ShiftSettingServiceImpl implements ShiftSettingService {

    private final ShiftSettingRepository settingRepository;

    @Override
    @Transactional(readOnly = true)
    public ShiftSettingResponse get() {
        return toResponse(current());
    }

    @Override
    @Transactional(readOnly = true)
    public ShiftSetting current() {
        return settingRepository.findById(ShiftSetting.FIXED_ID)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INTERNAL_ERROR,
                        "Thiết lập kết ca chưa được khởi tạo"));
    }

    @Override
    public ShiftSettingResponse update(ShiftSettingRequest request) {
        ShiftSetting s = current();
        s.setShiftClosingRequired(request.shiftClosingRequired());
        s.setManagerConfirmClosing(request.managerConfirmClosing());
        return toResponse(settingRepository.save(s));
    }

    private ShiftSettingResponse toResponse(ShiftSetting s) {
        return new ShiftSettingResponse(s.isShiftClosingRequired(), s.isManagerConfirmClosing(), s.getUpdatedAt());
    }
}
