package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.dto.ScheduleCreateRequest;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.WorkSchedule;
import com.rms.restaurant.module.attendance.model.WorkScheduleRule;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.attendance.repository.AttendanceRecordRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRuleRepository;
import com.rms.restaurant.module.attendance.repository.WorkShiftRepository;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkScheduleServiceImplTest {

    @Mock private WorkScheduleRepository workScheduleRepository;
    @Mock private WorkScheduleRuleRepository workScheduleRuleRepository;
    @Mock private WorkShiftRepository workShiftRepository;
    @Mock private AttendanceRecordRepository attendanceRecordRepository;
    @Mock private EmployeeRepository employeeRepository;

    private WorkScheduleServiceImpl service;

    private static final LocalDate DAY = LocalDate.now().plusDays(1);

    private final Employee employee = Employee.builder()
            .id("e1").code("NV0001").name("Nguyễn Văn A").status(EmployeeStatus.ACTIVE).build();
    private final WorkShift morning = WorkShift.builder()
            .id("sh1").name("Ca sáng").startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
            .status(WorkShiftStatus.ACTIVE).build();

    @BeforeEach
    void setUp() {
        service = new WorkScheduleServiceImpl(workScheduleRepository, workScheduleRuleRepository,
                workShiftRepository, attendanceRecordRepository, employeeRepository, new AttendanceMapper());
        lenient().when(workScheduleRepository.save(any(WorkSchedule.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(workScheduleRuleRepository.save(any(WorkScheduleRule.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(employeeRepository.findById("e1")).thenReturn(Optional.of(employee));
        lenient().when(workShiftRepository.findById("sh1")).thenReturn(Optional.of(morning));
        lenient().when(employeeRepository.findByIdIn(anyList())).thenReturn(List.of(employee));
        lenient().when(workShiftRepository.findAllById(any())).thenReturn(List.of(morning));
        lenient().when(workScheduleRepository.existsByEmployeeIdAndShiftIdAndWorkDate(any(), any(), any()))
                .thenReturn(false);
        lenient().when(workScheduleRepository.findByEmployeeIdAndWorkDate(any(), any()))
                .thenReturn(List.of());
    }

    private ScheduleCreateRequest oneOff() {
        return new ScheduleCreateRequest(List.of("e1"), List.of("sh1"), DAY, false, null, null, false);
    }

    @Test
    void createRejectsInactiveShift() {
        morning.setStatus(WorkShiftStatus.INACTIVE);
        assertThatThrownBy(() -> service.create(oneOff()))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SHIFT_INACTIVE);
        morning.setStatus(WorkShiftStatus.ACTIVE);
    }

    @Test
    void createRejectsInactiveEmployee() {
        Employee inactive = Employee.builder().id("e1").status(EmployeeStatus.INACTIVE).build();
        when(employeeRepository.findById("e1")).thenReturn(Optional.of(inactive));
        assertThatThrownBy(() -> service.create(oneOff()))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_EMPLOYEE_INACTIVE);
    }

    @Test
    void createRejectsExactDuplicateOneOff() {
        when(workScheduleRepository.existsByEmployeeIdAndShiftIdAndWorkDate("e1", "sh1", DAY))
                .thenReturn(true);
        assertThatThrownBy(() -> service.create(oneOff()))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SCHEDULE_DUPLICATE);
    }

    @Test
    void twoFullyOverlappingShiftsAreAllowed() {
        // Existing 8h shift + fully-overlapping candidate: 480 minutes overlap <= 720 (BR-AT-03).
        WorkShift other = WorkShift.builder().id("sh2").name("Ca phụ")
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                .status(WorkShiftStatus.ACTIVE).build();
        when(workScheduleRepository.findByEmployeeIdAndWorkDate("e1", DAY)).thenReturn(List.of(
                WorkSchedule.builder().employeeId("e1").shiftId("sh2").workDate(DAY).build()));
        when(workShiftRepository.findAllById(any())).thenReturn(List.of(morning, other));

        List<?> created = service.create(oneOff());
        assertThat(created).hasSize(1);
    }

    @Test
    void threeOverlappingShiftsExceedTwelveHourLimit() {
        // Two existing 8h shifts + candidate all 08–16: 3 pairs x 480m = 1440 > 720 (BR-AT-03).
        WorkShift s2 = WorkShift.builder().id("sh2").name("P1")
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                .status(WorkShiftStatus.ACTIVE).build();
        WorkShift s3 = WorkShift.builder().id("sh3").name("P2")
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                .status(WorkShiftStatus.ACTIVE).build();
        when(workScheduleRepository.findByEmployeeIdAndWorkDate("e1", DAY)).thenReturn(List.of(
                WorkSchedule.builder().employeeId("e1").shiftId("sh2").workDate(DAY).build(),
                WorkSchedule.builder().employeeId("e1").shiftId("sh3").workDate(DAY).build()));
        when(workShiftRepository.findAllById(any())).thenReturn(List.of(morning, s2, s3));

        assertThatThrownBy(() -> service.create(oneOff()))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SCHEDULE_OVERLAP_LIMIT);
    }

    @Test
    void endlessRuleMaterializesThroughTheRollingWindow() {
        int weekday = DAY.getDayOfWeek().getValue();
        ScheduleCreateRequest request = new ScheduleCreateRequest(
                List.of("e1"), List.of("sh1"), DAY, true, List.of(weekday), null, false);

        List<?> created = service.create(request);

        // Expected: every matching weekday from DAY through today+93.
        LocalDate horizon = LocalDate.now().plusDays(93);
        int expected = 0;
        for (LocalDate d = DAY; !d.isAfter(horizon); d = d.plusDays(1)) {
            if (d.getDayOfWeek().getValue() == weekday) expected++;
        }
        assertThat(created).hasSize(expected);
        verify(workScheduleRepository, times(expected)).save(any(WorkSchedule.class));
    }

    @Test
    void extendRollingWindowSkipsInactiveEmployees() {
        WorkScheduleRule rule = WorkScheduleRule.builder()
                .id("r1").employeeId("e1").shiftId("sh1").daysOfWeek("1,2,3,4,5,6,7")
                .startDate(LocalDate.now().minusDays(10))
                .generatedUntil(LocalDate.now())
                .build();
        when(workScheduleRuleRepository.findByEndDateIsNullAndGeneratedUntilBefore(any()))
                .thenReturn(List.of(rule));
        when(employeeRepository.findById("e1")).thenReturn(Optional.of(
                Employee.builder().id("e1").status(EmployeeStatus.INACTIVE).build()));

        service.extendRollingWindow();

        verify(workScheduleRepository, times(0)).save(any(WorkSchedule.class));
    }

    @Test
    void deleteOccurrenceBlockedWhenAttendanceExists() {
        WorkSchedule schedule = WorkSchedule.builder().id("s1").employeeId("e1")
                .shiftId("sh1").workDate(DAY).build();
        when(workScheduleRepository.findById("s1")).thenReturn(Optional.of(schedule));
        when(attendanceRecordRepository.findByScheduleId("s1")).thenReturn(
                Optional.of(new com.rms.restaurant.module.attendance.model.AttendanceRecord()));

        assertThatThrownBy(() -> service.deleteOccurrence("s1"))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SCHEDULE_HAS_ATTENDANCE);
    }
}
