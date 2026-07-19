package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.enums.ManualTimeMode;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingRequest;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingResponse;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import com.rms.restaurant.module.attendance.repository.AttendanceSettingRepository;
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
class AttendanceSettingServiceImplTest {

    @Mock private AttendanceSettingRepository settingRepository;

    private AttendanceSettingServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AttendanceSettingServiceImpl(settingRepository, new AttendanceMapper());
        lenient().when(settingRepository.findById(AttendanceSetting.FIXED_ID))
                .thenReturn(Optional.of(AttendanceSetting.builder().id(AttendanceSetting.FIXED_ID).build()));
        lenient().when(settingRepository.save(any(AttendanceSetting.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private AttendanceSettingRequest request(int halfMin, int halfMax, boolean halfEnabled) {
        return new AttendanceSettingRequest(480, halfEnabled, halfMin, halfMax,
                true, 15, true, 15, true, 30, true, 30, true, 3, 60, ManualTimeMode.SHIFT_TIME);
    }

    @Test
    void getReturnsSeededSingleton() {
        AttendanceSettingResponse response = service.get();
        assertThat(response.standardWorkdayMinutes()).isEqualTo(480);
        assertThat(response.manualDefaultTimeMode()).isEqualTo(ManualTimeMode.SHIFT_TIME);
    }

    @Test
    void updatePersistsAllFields() {
        AttendanceSettingResponse response = service.update(request(60, 270, true));
        assertThat(response.halfDayEnabled()).isTrue();
        assertThat(response.halfDayMinMinutes()).isEqualTo(60);
        assertThat(response.lateGraceMinutes()).isEqualTo(15);
        assertThat(response.mergedShiftMaxCount()).isEqualTo(3);
    }

    @Test
    void updateRejectsHalfDayMinNotBelowMax() {
        assertThatThrownBy(() -> service.update(request(270, 270, true)))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SETTING_INVALID);
    }
}
