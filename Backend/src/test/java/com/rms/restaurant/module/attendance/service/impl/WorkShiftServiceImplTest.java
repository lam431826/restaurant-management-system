package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.dto.ShiftRequest;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.attendance.repository.AttendanceRecordRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRuleRepository;
import com.rms.restaurant.module.attendance.repository.WorkShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkShiftServiceImplTest {

    @Mock private WorkShiftRepository workShiftRepository;
    @Mock private WorkScheduleRepository workScheduleRepository;
    @Mock private WorkScheduleRuleRepository workScheduleRuleRepository;
    @Mock private AttendanceRecordRepository attendanceRecordRepository;

    private WorkShiftServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new WorkShiftServiceImpl(workShiftRepository, workScheduleRepository,
                workScheduleRuleRepository, attendanceRecordRepository, new AttendanceMapper());
    }

    private ShiftRequest request(String name) {
        return new ShiftRequest(name, LocalTime.of(8, 0), LocalTime.of(16, 0),
                null, null, null, null);
    }

    @Test
    void createRejectsDuplicateName() {
        when(workShiftRepository.existsByNameIgnoreCase("Ca sáng")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request("Ca sáng")))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SHIFT_NAME_DUPLICATE);
    }

    @Test
    void deleteBlockedWhenShiftHasAttendance() {
        WorkShift shift = WorkShift.builder().id("sh1").name("Ca sáng").build();
        when(workShiftRepository.findById("sh1")).thenReturn(Optional.of(shift));
        when(attendanceRecordRepository.existsForShift("sh1")).thenReturn(true);

        assertThatThrownBy(() -> service.delete("sh1"))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SHIFT_HAS_ATTENDANCE);
        verify(workShiftRepository, never()).delete(any(WorkShift.class));
    }

    @Test
    void deleteCleanShiftRemovesRulesAndSchedules() {
        WorkShift shift = WorkShift.builder().id("sh1").name("Ca sáng").build();
        when(workShiftRepository.findById("sh1")).thenReturn(Optional.of(shift));
        when(attendanceRecordRepository.existsForShift("sh1")).thenReturn(false);
        when(workScheduleRuleRepository.findByShiftId("sh1")).thenReturn(List.of());

        service.delete("sh1");

        verify(workScheduleRepository).deleteByShiftId("sh1");
        verify(workShiftRepository).delete(shift);
    }

    @Test
    void updateRejectsDuplicateNameOfOtherShift() {
        WorkShift shift = WorkShift.builder().id("sh1").name("Ca sáng")
                .status(WorkShiftStatus.ACTIVE).build();
        when(workShiftRepository.findById("sh1")).thenReturn(Optional.of(shift));
        when(workShiftRepository.existsByNameIgnoreCaseAndIdNot(anyString(), anyString())).thenReturn(true);

        assertThatThrownBy(() -> service.update("sh1", request("Ca chiều")))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SHIFT_NAME_DUPLICATE);
    }
}
