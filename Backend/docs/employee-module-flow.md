# Luồng xử lý module Employee

> Trình bày theo pipeline: Người dùng thao tác → API → Controller → Service → Repository → Database → Response → Frontend hiển thị. Xem chi tiết đầy đủ (danh sách class, business rule, dependency...) tại [`employee-module-analysis.md`](./employee-module-analysis.md).

## 1️⃣ Xem danh sách nhân viên

```
Người dùng: Manager mở trang "Nhân viên", lọc theo mã/tên/SĐT/trạng thái
↓
API: GET /api/employees?code=...&name=...&status=...&page=...
↓
Controller: EmployeeController.list()
↓
Service: EmployeeServiceImpl.list()
↓
Repository: EmployeeRepository.search(code, name, phone, status, pageable)
↓
Database: chỉ SELECT, không đổi gì
↓
Response: PageResponse<EmployeeResponse>
↓
Frontend: Employees.tsx (EmployeeTable) vẽ bảng phân trang
```

## 2️⃣ Tạo hồ sơ nhân viên lần đầu (tự phục vụ — đường tạo duy nhất)

```
Người dùng: Nhân viên mới đăng nhập lần đầu → điền "Hồ sơ của tôi" → Lưu
↓
API: POST /api/employees/me
↓
Controller: EmployeeController.saveMyProfile()
↓
Service: EmployeeServiceImpl.saveMyProfile()
   - syncUserProfile(): đồng bộ name/phone/email ngược vào User
   - chưa có Employee gắn user này → tạo mới (code tự sinh, startDate = hôm nay)
↓
Repository: UserRepository.findByUsername(), EmployeeRepository.findByUserId(),
            existsByPhone(), .save()
↓
Database: UPDATE users (name/phone/email) + INSERT employees
↓
Response: EmployeeResponse
↓
Frontend: MyProfile.tsx báo lưu thành công, hiển thị mã nhân viên vừa tạo
```
*(Lưu ý: `POST /api/employees` cũng tồn tại trong code nhưng bị `@PreAuthorize("denyAll")` chặn hoàn toàn — không phải đường tạo hồ sơ dùng thực tế.)*

## 3️⃣ Manager cập nhật thông tin nhân viên

```
Người dùng: Manager mở EmployeeModal, sửa tên/SĐT/trạng thái... → Lưu
↓
API: PUT /api/employees/{id}
↓
Controller: EmployeeController.update()
↓
Service: EmployeeServiceImpl.update() → syncLinkedUser() nếu có tài khoản liên kết
↓
Repository: EmployeeRepository.findById(), existsByPhoneAndIdNot(), .save();
            UserRepository.findById(), .save() (nếu sync)
↓
Database: UPDATE employees (+ UPDATE users nếu có liên kết)
↓
Response: EmployeeResponse
↓
Frontend: EmployeeModal.tsx đóng modal, Employees.tsx nạp lại danh sách/EmployeeDetail.tsx cập nhật
```

## 4️⃣ Ngừng hoạt động nhân viên (có kiểm tra chéo module)

```
Người dùng: Manager bấm "Ngừng hoạt động" trên EmployeeDetail
↓
API: GET /api/employees/{id}/deactivation-check  (xem trước điều kiện)
     POST /api/employees/{id}/deactivate?acknowledgeWarnings=true/false
↓
Controller: EmployeeController.deactivationCheck() / deactivate()
↓
Service: EmployeeServiceImpl.deactivate() → EmployeeDeactivationCheckService.check()
   - đọc chéo: lịch tương lai (attendance), phiếu lương chưa chốt (payroll),
     ca POS đang mở (shift), chấm công dở dang hôm nay (attendance)
↓
Repository: WorkScheduleRepository, PayslipRepository, ShiftRepository,
            AttendanceRecordRepository... (đọc) → EmployeeRepository.save() (ghi)
↓
Database: UPDATE employees SET status = INACTIVE  (chỉ khi qua hết điều kiện)
↓
Response: 204 No Content (thành công) hoặc lỗi 409 kèm danh sách lý do chặn/cảnh báo
↓
Frontend: Employees.tsx / EmployeeDetail.tsx hiện modal cảnh báo nếu bị chặn,
          hoặc cập nhật trạng thái "Ngừng hoạt động" nếu thành công
```

## 5️⃣ Thiết lập lương cho nhân viên

```
Người dùng: Manager mở tab "Lương" trên EmployeeDetail → chọn loại lương + mức lương → Lưu
↓
API: PUT /api/employees/{id}/salary-setting
↓
Controller: EmployeeController.upsertSalarySetting()
↓
Service: EmployeeServiceImpl.upsertSalarySetting() — tìm theo employeeId, có thì update, chưa có thì tạo
↓
Repository: EmployeeRepository.findById() (guard), SalarySettingRepository.findByEmployeeId() → .save()
↓
Database: INSERT hoặc UPDATE salary_settings
↓
Response: SalarySettingResponse
↓
Frontend: EmployeeDetail.tsx hiển thị lại thông tin lương vừa lưu
```

## 6️⃣ Nhân viên tự cập nhật hồ sơ của mình (đã có hồ sơ)

```
Người dùng: Nhân viên mở "Hồ sơ của tôi" → sửa SĐT/địa chỉ/email... → Lưu
↓
API: POST /api/employees/me
↓
Controller: EmployeeController.saveMyProfile()
↓
Service: EmployeeServiceImpl.saveMyProfile() — nhánh "đã có Employee" → applyProfileFields() + save()
↓
Repository: EmployeeRepository.findByUserId() → .save(); UserRepository.save() (đồng bộ)
↓
Database: UPDATE employees + UPDATE users
↓
Response: EmployeeResponse
↓
Frontend: MyProfile.tsx hiện thông báo cập nhật thành công
```

## 7️⃣ Import CSV hàng loạt

```
Người dùng: Manager chọn file CSV + chiến lược (Dừng khi lỗi / Bỏ qua & tiếp tục) → Tải lên
↓
API: POST /api/employees/import  (multipart/form-data)
↓
Controller: EmployeeController.importCsv()
↓
Service: EmployeeServiceImpl.importCsv() — validate từng dòng (tên, SĐT, status, trùng code/phone
         trong file lẫn DB), giới hạn tối đa 500 dòng
↓
Repository: EmployeeRepository.findAll() (đối chiếu), existsByPhone[AndIdNot](), .save() nhiều lần
↓
Database: INSERT/UPDATE nhiều employees (hoặc không ghi gì nếu STOP_ON_ERROR gặp lỗi)
↓
Response: EmployeeImportResultResponse (created/updated/failed + danh sách lỗi từng dòng)
↓
Frontend: (chưa có UI tiêu thụ API này trong ManagementWebsite — chỉ gọi được trực tiếp)
```

## 8️⃣ Export CSV

```
Người dùng: Manager bấm "Xuất Excel/CSV" (theo bộ lọc hiện tại hoặc theo lựa chọn)
↓
API: GET /api/employees/export?code=...&status=...&ids=...
↓
Controller: EmployeeController.exportCsv()
↓
Service: EmployeeServiceImpl.exportCsv()
↓
Repository: EmployeeRepository.findByIdIn() (nếu chọn ids) hoặc .search() (theo bộ lọc)
↓
Database: chỉ SELECT, không đổi gì
↓
Response: byte[] CSV (UTF-8 BOM, header Content-Disposition: attachment)
↓
Frontend: (chưa có UI tiêu thụ API này trong ManagementWebsite — chỉ gọi được trực tiếp)
```
