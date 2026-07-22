package com.rms.restaurant.module.attendance.service.impl;

import com.rms.restaurant.common.utils.enums.AttendanceType;
import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.attendance.dto.AttendanceUpsertRequest;
import com.rms.restaurant.module.attendance.dto.BulkAttendanceRequest;
import com.rms.restaurant.module.attendance.dto.ViolationRequest;
import com.rms.restaurant.module.attendance.mapper.AttendanceMapper;
import com.rms.restaurant.module.attendance.model.AttendanceRecord;
import com.rms.restaurant.module.attendance.model.AttendanceSetting;
import com.rms.restaurant.module.attendance.model.Violation;
import com.rms.restaurant.module.attendance.model.ViolationType;
import com.rms.restaurant.module.attendance.model.WorkSchedule;
import com.rms.restaurant.module.attendance.model.WorkShift;
import com.rms.restaurant.module.attendance.repository.AttendanceRecordRepository;
import com.rms.restaurant.module.attendance.repository.ViolationRepository;
import com.rms.restaurant.module.attendance.repository.ViolationTypeRepository;
import com.rms.restaurant.module.attendance.repository.WorkScheduleRepository;
import com.rms.restaurant.module.attendance.repository.WorkShiftRepository;
import com.rms.restaurant.module.attendance.service.AttendanceCalculator;
import com.rms.restaurant.module.attendance.service.AttendanceSettingService;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceImplTest {

    @Mock private AttendanceRecordRepository recordRepository;
    @Mock private WorkScheduleRepository scheduleRepository;
    @Mock private WorkShiftRepository shiftRepository;
    @Mock private ViolationRepository violationRepository;
    @Mock private ViolationTypeRepository violationTypeRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private UserRepository userRepository;
    @Mock private AttendanceSettingService settingService;

    private AttendanceServiceImpl service;

    private static final LocalDate DAY = LocalDate.of(2026, 7, 15);

    private final WorkShift morning = WorkShift.builder()
            .id("sh1").name("Ca sáng").startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
            .status(WorkShiftStatus.ACTIVE).build();
    private final WorkSchedule schedule = WorkSchedule.builder()
            .id("s1").employeeId("e1").shiftId("sh1").workDate(DAY).build();
    private final AttendanceSetting settings = AttendanceSetting.builder()
            .id(AttendanceSetting.FIXED_ID)
            .lateEnabled(true).earlyLeaveEnabled(true).otBeforeEnabled(true).otAfterEnabled(true)
            .mergedShiftEnabled(true).mergedShiftMaxCount(2).mergedShiftMaxBreakMinutes(60)
            .build();

    @BeforeEach
    void setUp() {
        service = new AttendanceServiceImpl(recordRepository, scheduleRepository, shiftRepository,
                violationRepository, violationTypeRepository, employeeRepository, userRepository, settingService,
                new AttendanceCalculator(), new AttendanceMapper());
        lenient().when(settingService.current()).thenReturn(settings);
        lenient().when(scheduleRepository.findById("s1")).thenReturn(Optional.of(schedule));
        lenient().when(shiftRepository.findById("sh1")).thenReturn(Optional.of(morning));
        lenient().when(recordRepository.save(any(AttendanceRecord.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(scheduleRepository.save(any(WorkSchedule.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void upsertComputesMetricsForNewRecord() {
        when(recordRepository.findByScheduleId("s1")).thenReturn(Optional.empty());
        AttendanceUpsertRequest request = new AttendanceUpsertRequest(
                AttendanceType.PRESENT, LocalTime.of(8, 15), LocalTime.of(16, 0), null, null, null, null);

        var response = service.upsert("s1", request, "manager01");

        assertThat(response.workedMinutes()).isEqualTo(465);
        assertThat(response.lateMinutes()).isEqualTo(15);
        assertThat(response.type()).isEqualTo(AttendanceType.PRESENT);
    }

    @Test
    void upsertRecomputesExistingRecordOnResave() {
        AttendanceRecord existing = AttendanceRecord.builder().id("r1").scheduleId("s1")
                .type(AttendanceType.PRESENT).lateMinutes(99).build();
        when(recordRepository.findByScheduleId("s1")).thenReturn(Optional.of(existing));
        AttendanceUpsertRequest request = new AttendanceUpsertRequest(
                AttendanceType.PRESENT, LocalTime.of(8, 0), LocalTime.of(16, 0), null, null, null, null);

        var response = service.upsert("s1", request, "manager01");

        assertThat(response.lateMinutes()).isZero();
        assertThat(response.id()).isEqualTo("r1");
    }

    @Test
    void upsertAppliesManualOvertimeOverride() {
        when(recordRepository.findByScheduleId("s1")).thenReturn(Optional.empty());
        // Manager overrides OT to 15m before-shift + 2h after-shift, regardless of the auto-computed value.
        AttendanceUpsertRequest request = new AttendanceUpsertRequest(
                AttendanceType.PRESENT, LocalTime.of(7, 45), LocalTime.of(18, 0), null, null, 15, 120);

        var response = service.upsert("s1", request, "manager01");

        assertThat(response.otMinutes()).isEqualTo(135);
    }

    @Test
    void upsertRejectsCheckOutNotAfterCheckIn() {
        AttendanceUpsertRequest request = new AttendanceUpsertRequest(
                AttendanceType.PRESENT, LocalTime.of(8, 0), LocalTime.of(8, 0), null, null, null, null);

        assertThatThrownBy(() -> service.upsert("s1", request, "manager01"))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_RECORD_TIME_INVALID);
    }

    @Test
    void substituteRejectedWhenMoreThanOneSchedule() {
        BulkAttendanceRequest request = new BulkAttendanceRequest(
                List.of("s1", "s2"), AttendanceType.LEAVE_APPROVED, null, null, false, "e2", null);

        assertThatThrownBy(() -> service.bulkMark(request, "manager01"))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SUBSTITUTE_SINGLE_ONLY);
    }

    @Test
    void substituteRejectedWhenSameAsScheduledEmployee() {
        BulkAttendanceRequest request = new BulkAttendanceRequest(
                List.of("s1"), AttendanceType.LEAVE_APPROVED, null, null, false, "e1", null);

        assertThatThrownBy(() -> service.bulkMark(request, "manager01"))
                .isInstanceOf(ApplicationException.class)
                .extracting(e -> ((ApplicationException) e).getError())
                .isEqualTo(ApplicationError.AT_SUBSTITUTE_SELF);
    }

    @Test
    void substituteAcceptedForSingleLeaveSchedule() {
        when(recordRepository.findByScheduleId("s1")).thenReturn(Optional.empty());
        Employee sub = Employee.builder().id("e2").status(EmployeeStatus.ACTIVE).build();
        when(employeeRepository.findById("e2")).thenReturn(Optional.of(sub));
        BulkAttendanceRequest request = new BulkAttendanceRequest(
                List.of("s1"), AttendanceType.LEAVE_APPROVED, null, null, false, "e2", null);

        service.bulkMark(request, "manager01");

        assertThat(schedule.getSubstituteEmployeeId()).isEqualTo("e2");
    }

    @Test
    void mergedBulkMarkFlagsMiddleShiftAsAutoFilled() {
        WorkShift afternoon = WorkShift.builder().id("sh2").name("Ca chiều")
                .startTime(LocalTime.of(16, 0)).endTime(LocalTime.of(20, 0))
                .status(WorkShiftStatus.ACTIVE).build();
        WorkShift evening = WorkShift.builder().id("sh3").name("Ca tối")
                .startTime(LocalTime.of(20, 0)).endTime(LocalTime.of(23, 0))
                .status(WorkShiftStatus.ACTIVE).build();
        WorkSchedule s2 = WorkSchedule.builder().id("s2").employeeId("e1").shiftId("sh2").workDate(DAY).build();
        WorkSchedule s3 = WorkSchedule.builder().id("s3").employeeId("e1").shiftId("sh3").workDate(DAY).build();
        when(scheduleRepository.findById("s2")).thenReturn(Optional.of(s2));
        when(scheduleRepository.findById("s3")).thenReturn(Optional.of(s3));
        when(shiftRepository.findAllById(any())).thenReturn(List.of(morning, afternoon, evening));
        when(recordRepository.findByScheduleId(anyString())).thenReturn(Optional.empty());
        AttendanceSetting mergeSettings = AttendanceSetting.builder()
                .id(AttendanceSetting.FIXED_ID)
                .lateEnabled(true).earlyLeaveEnabled(true).otBeforeEnabled(true).otAfterEnabled(true)
                .mergedShiftEnabled(true).mergedShiftMaxCount(3).mergedShiftMaxBreakMinutes(60)
                .build();
        when(settingService.current()).thenReturn(mergeSettings);

        BulkAttendanceRequest request = new BulkAttendanceRequest(
                List.of("s1", "s2", "s3"), AttendanceType.PRESENT,
                LocalTime.of(8, 0), LocalTime.of(23, 0), true, null, null);

        var results = service.bulkMark(request, "manager01");

        assertThat(results).hasSize(3);
        assertThat(results.get(1).autoFilled()).isTrue();
        assertThat(results.get(0).autoFilled()).isFalse();
        assertThat(results.get(2).autoFilled()).isFalse();
    }

    @Test
    void replaceViolationsSnapshotsPenaltyAndComputesTotal() {
        AttendanceRecord record = AttendanceRecord.builder().id("r1").scheduleId("s1")
                .type(AttendanceType.PRESENT).build();
        when(recordRepository.findById("r1")).thenReturn(Optional.of(record));
        ViolationType type = ViolationType.builder().id("v1").name("Đi muộn").penaltyAmount(new BigDecimal("50000")).build();
        when(violationTypeRepository.findAllById(any())).thenReturn(List.of(type));
        when(violationRepository.save(any(Violation.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.replaceViolations("r1", List.of(new ViolationRequest("v1", 2, null)));

        verify(violationRepository).deleteByAttendanceRecordId("r1");
        assertThat(response).hasSize(1);
        assertThat(response.get(0).count()).isEqualTo(2);
        assertThat(response.get(0).appliedPenalty()).isEqualByComparingTo("50000");
    }

    @Test
    void violationTotalSumsCountTimesPenalty() {
        when(violationRepository.totalPenaltyForEmployee("e1", DAY, DAY))
                .thenReturn(new BigDecimal("150000"));
        BigDecimal total = service.violationTotal("e1", DAY, DAY);
        assertThat(total).isEqualByComparingTo("150000");
    }

    @Test
    void violationTotalDefaultsToZeroWhenNull() {
        when(violationRepository.totalPenaltyForEmployee("e1", DAY, DAY)).thenReturn(null);
        assertThat(service.violationTotal("e1", DAY, DAY)).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
