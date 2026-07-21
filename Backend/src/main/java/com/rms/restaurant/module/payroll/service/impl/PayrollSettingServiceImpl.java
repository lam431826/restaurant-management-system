package com.rms.restaurant.module.payroll.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.payroll.dto.PayrollSettingRequest;
import com.rms.restaurant.module.payroll.dto.PayrollSettingResponse;
import com.rms.restaurant.module.payroll.mapper.PayrollMapper;
import com.rms.restaurant.module.payroll.model.PayrollSetting;
import com.rms.restaurant.module.payroll.repository.PayrollSettingRepository;
import com.rms.restaurant.module.payroll.service.PayrollSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Single row seeded by V48 with PayrollSetting.FIXED_ID; never created here. */
@Service
@RequiredArgsConstructor
@Transactional
public class PayrollSettingServiceImpl implements PayrollSettingService {

    private final PayrollSettingRepository settingRepository;
    private final PayrollMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public PayrollSettingResponse get() {
        return mapper.toSettingResponse(current());
    }

    @Override
    public PayrollSettingResponse update(PayrollSettingRequest request) {
        validate(request);
        PayrollSetting s = current();
        s.setPayrollCutoffDay(request.payrollCutoffDay());
        s.setAutoCreateEnabled(request.autoCreateEnabled());
        s.setAutoUpdateEnabled(request.autoUpdateEnabled());
        s.setPersonalIncomeTaxEnabled(request.personalIncomeTaxEnabled());
        return mapper.toSettingResponse(settingRepository.save(s));
    }

    private PayrollSetting current() {
        return settingRepository.findById(PayrollSetting.FIXED_ID)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INTERNAL_ERROR,
                        "Thiết lập tính lương chưa được khởi tạo"));
    }

    private void validate(PayrollSettingRequest r) {
        if (r.payrollCutoffDay() < 1 || r.payrollCutoffDay() > 28) {
            throw new ApplicationException(ApplicationError.PAYROLL_SETTING_INVALID);
        }
    }
}
