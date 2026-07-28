# Luồng xử lý module Attendance

> Trình bày theo pipeline: Người dùng thao tác → API → Controller → Service → Repository → Database → Response → Frontend hiển thị. Xem chi tiết đầy đủ (danh sách class, business rule, dependency...) tại [`attendance-module-analysis.md`](./attendance-module-analysis.md).

## 1️⃣ Tạo mẫu ca làm việc

```
Người dùng: Manager mở "Cấu hình ca" → nhập tên/giờ ca → Lưu
↓
API: POST /api/attendance/shifts
↓
Controller: WorkShiftController.create()
↓
Service: WorkShiftServiceImpl.create() — check trùng tên
↓
Repository: WorkShiftRepository.existsByNameIgnoreCase() → .save()
↓
Database: INSERT work_shifts
↓
Response: ShiftResponse (qua AttendanceMapper.toShiftResponse)
↓
Frontend: ShiftTemplateModal.tsx đóng modal, Schedule.tsx nạp lại danh sách ca
```

## 2️⃣ Xếp lịch làm việc (1 lần hoặc lặp tuần)

```
Người dùng: Manager kéo-thả / chọn nhân viên + ca + ngày (+ tick "lặp lại") → Lưu
↓
API: POST /api/attendance/schedules
↓
Controller: WorkScheduleController.create()
↓
Service: WorkScheduleServiceImpl.create()
   - lặp lại → tạo WorkScheduleRule rồi materialize() sinh occurrence tới 93 ngày
   - 1 lần → createOccurrence() trực tiếp
   - cả 2 đều check checkOverlapLimit() (BR-AT-03: tổng trùng giờ ≤ 12h)
↓
Repository: WorkScheduleRuleRepository.save(), WorkScheduleRepository.save()
↓
Database: INSERT work_schedule_rules (nếu lặp) + INSERT nhiều work_schedules
↓
Response: List<ScheduleResponse>
↓
Frontend: Schedule.tsx (ScheduleGrid) vẽ thêm ô lịch mới trên lưới tuần
```

## 3️⃣ Chấm công thủ công (Manager chấm cho nhân viên)

```
Người dùng: Manager click ô lịch trên Timesheet → chọn "Có mặt/Nghỉ" + giờ vào-ra → Lưu
↓
API: PUT /api/attendance/schedules/{scheduleId}/record
↓
Controller: AttendanceController.upsert()
↓
Service: AttendanceServiceImpl.upsert() → mark() → saveComputed()
   - AttendanceCalculator.compute(): tính lateMinutes, earlyLeaveMinutes, otMinutes, workCredit
↓
Repository: WorkScheduleRepository.findById(), WorkShiftRepository.findById(),
            AttendanceRecordRepository.findByScheduleId() → .save()
↓
Database: INSERT hoặc UPDATE attendance_records
↓
Response: AttendanceRecordResponse
↓
Frontend: Timesheet.tsx cập nhật màu ô (ON_TIME/LATE_EARLY/MISSING) theo TIMESHEET_STATUS_COLOR
```

## 4️⃣ Chấm công tự phục vụ (nhân viên tự vào/ra ca)

```
Người dùng: Nhân viên bấm "Vào ca" trên trang lịch của mình
↓
API: POST /api/attendance/schedules/{scheduleId}/check-in
↓
Controller: AttendanceController.checkIn()
↓
Service: AttendanceServiceImpl.checkIn() — chỉ cho lịch của chính mình, chỉ ngày hôm nay
↓
Repository: UserRepository.findByUsername(), EmployeeRepository.findByUserId(),
            AttendanceRecordRepository.findByScheduleId() → .save()
↓
Database: INSERT attendance_records (actualCheckIn = giờ hiện tại)
↓
Response: AttendanceRecordResponse
↓
Frontend: MySchedule.tsx đổi nút "Vào ca" thành "Ra ca"
```

*(bấm "Ra ca" → `POST /check-out` → `AttendanceServiceImpl.checkOut()` → UPDATE `actualCheckOut`, quy trình tương tự)*

## 5️⃣ Ghi nhận vi phạm cho 1 ca chấm công

```
Người dùng: Manager mở popup ô đã chấm công → thêm dòng vi phạm (loại + số lần)
↓
API: PUT /api/attendance/records/{id}/violations
↓
Controller: AttendanceController.replaceViolations()
↓
Service: AttendanceServiceImpl.replaceViolations() — xóa hết vi phạm cũ, chụp nhanh appliedPenalty
↓
Repository: ViolationRepository.deleteByAttendanceRecordId() → .save() từng dòng
↓
Database: DELETE + INSERT violations
↓
Response: List<ViolationResponse>
↓
Frontend: Timesheet.tsx hiện badge số tiền phạt (penaltyTotal) trên ô lịch
```

## 6️⃣ Xem bảng chấm công / tổng hợp kỳ

```
Người dùng: Manager chọn khoảng ngày trên Timesheet
↓
API: GET /api/attendance/timesheet?start=...&end=...  (hoặc /summary)
↓
Controller: AttendanceController.timesheet() / summary()
↓
Service: AttendanceServiceImpl.timesheet() / summary() — chỉ đọc, gom dữ liệu
↓
Repository: WorkScheduleRepository.findByWorkDateBetween(), AttendanceRecordRepository.findByScheduleIdIn(), ViolationRepository...
↓
Database: chỉ SELECT, không đổi gì
↓
Response: List<TimesheetCellResponse> / List<AttendanceSummaryRow>
↓
Frontend: Timesheet.tsx vẽ lưới nhân viên × ngày với trạng thái màu
```

## 7️⃣ Đổi cấu hình chấm công (giờ nghỉ, làm tròn OT, phạt trễ...)

```
Người dùng: Manager mở panel "Cấu hình" trên Timesheet → sửa thông số → Lưu
↓
API: PUT /api/attendance/settings
↓
Controller: AttendanceSettingController.update()
↓
Service: AttendanceSettingServiceImpl.update() — validate() cả khối trước khi lưu
↓
Repository: AttendanceSettingRepository.save()
↓
Database: UPDATE attendance_settings (1 dòng duy nhất, id cố định)
↓
Response: AttendanceSettingResponse
↓
Frontend: Timesheet.tsx đóng panel; các lượt chấm công SAU thời điểm này mới áp cấu hình mới
```

## 8️⃣ (Hệ thống, không phải người dùng) Vật lý hóa lịch lặp mỗi đêm

```
Trigger: cron 02:15 sáng mỗi ngày
↓
Job: ScheduleExtensionJob.extendRollingWindow()
↓
Service: WorkScheduleServiceImpl.extendRollingWindow() → materialize() cho từng rule vô hạn
↓
Repository: WorkScheduleRuleRepository.findByEndDateIsNullAndGeneratedUntilBefore() → WorkScheduleRepository.save()
↓
Database: INSERT thêm work_schedules cho các ngày mới lọt vào cửa sổ 93 ngày
↓
Response: — (không có HTTP response, job nội bộ)
↓
Frontend: lần sau Manager mở Schedule.tsx sẽ tự thấy lịch của các tuần mới đã có sẵn
```
