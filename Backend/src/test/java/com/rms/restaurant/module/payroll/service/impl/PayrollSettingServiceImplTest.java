package com.rms.restaurant.module.payroll.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.payroll.dto.PayrollSettingRequest;
import com.rms.restaurant.module.payroll.dto.PayrollSettingResponse;
import com.rms.restaurant.module.payroll.mapper.PayrollMapper;
import com.rms.restaurant.module.payroll.model.PayrollSetting;
import com.rms.restaurant.module.payroll.repository.PayrollSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class PayrollSettingServiceImplTest {

    @Mock private PayrollSettingRepository settingRepository;

    private PayrollSettingServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PayrollSettingServiceImpl(settingRepository, new PayrollMapper(new ObjectMapper()));
        lenient().when(settingRepository.findById(PayrollSetting.FIXED_ID))
                .thenReturn(Optional.of(PayrollSetting.builder().id(PayrollSetting.FIXED_ID).build()));
        lenient().when(settingRepository.save(any(PayrollSetting.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void getReturnsSeededSingleton() {
        PayrollSettingResponse response = service.get();
        assertThat(response.payrollCutoffDay()).isEqualTo(1);
        assertThat(response.autoCreateEnabled()).isTrue();
    }

    @Test
    void updatePersistsAllFields() {
        PayrollSettingResponse response = service.update(
                new PayrollSettingRequest(15, false, false, true));
        assertThat(response.payrollCutoffDay()).isEqualTo(15);
        assertThat(response.autoCreateEnabled()).isFalse();
        assertThat(response.autoUpdateEnabled()).isFalse();
        assertThat(response.personalIncomeTaxEnabled()).isTrue();
    }

    @Test
    void updateRejectsCutoffDayOutOfRange() {
        assertThatThrownBy(() -> service.update(new PayrollSettingRequest(29, true, true, false)))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.PAYROLL_SETTING_INVALID);
    }
}
