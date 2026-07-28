# Luồng xử lý module Payroll (Bảng lương)

> Trình bày theo pipeline: Người dùng thao tác → API → Controller → Service → Repository → Database → Response → Frontend hiển thị.
> Cấu trúc dữ liệu: `PayrollSheet` (bảng lương, trạng thái `GENERATING → DRAFT → FINALIZED`, hoặc `DRAFT → CANCELLED`) chứa nhiều `Payslip` (phiếu lương từng nhân viên, `ACTIVE`/`CANCELLED`), mỗi `Payslip` có thể có nhiều `PayslipPayment` (lượt chi trả thực tế).

## 1️⃣ Tạo bảng lương mới (tự động tính lương từ chấm công)

```
Người dùng: Manager chọn kỳ lương (tháng/tùy chỉnh) + phạm vi nhân viên (tất cả/tùy chọn) → "Tạo bảng lương"
↓
API: POST /api/payroll/sheets
↓
Controller: PayrollController.createSheet()
↓
Service: PayrollServiceImpl.createSheet() → generatePayslips() → computeFor() (mỗi nhân viên)
   - lấy dữ liệu chấm công từ module Attendance: listForPayroll(), violationTotal()
   - SalaryCalculator.compute(): tính lương chính + OT theo loại lương (SHIFT/HOURLY/FIXED)
   - sheet chuyển GENERATING → DRAFT ngay trong cùng transaction (BR-PAY-09)
↓
Repository: EmployeeRepository.search()/findByIdIn(), SalarySettingRepository.findByEmployeeId(),
            PayrollHolidayRepository.findAllByHolidayDateBetween(), PayrollSheetRepository.save(),
            PayslipRepository.saveAll()
↓
Database: INSERT payroll_sheets + INSERT nhiều payslips (1 phiếu/nhân viên)
↓
Response: PayrollSheetResponse (status=DRAFT)
↓
Frontend: Payroll.tsx thêm bảng lương mới vào danh sách, điều hướng sang PayrollUpdate.tsx
```

## 2️⃣ Sửa tay phiếu lương trên bảng nháp

```
Người dùng: Manager mở bảng lương DRAFT, sửa tay lương chính/OT/khấu trừ của 1 dòng nhân viên
↓
API: PUT /api/payroll/sheets/{id}/payslips
↓
Controller: PayrollController.saveDraft()
↓
Service: PayrollServiceImpl.saveDraft() — chỉ cho phép khi sheet đang DRAFT (BR-PAY-11)
   - field nào không gửi (null) thì giữ nguyên; field có sửa thì đánh dấu *Overridden=true
↓
Repository: PayslipRepository.findById() (từng dòng) → .save()
↓
Database: UPDATE payslips (mainSalary/overtimeSalary/deduction + cờ *Overridden)
↓
Response: List<PayslipRowResponse> (bảng lương sau khi sửa)
↓
Frontend: PayrollUpdate.tsx cập nhật lại bảng, đánh dấu ô đã chỉnh tay
```

## 3️⃣ Tính lại bảng lương (reload)

```
Người dùng: Manager bấm "Tính lại" → chọn chế độ Toàn bộ (FULL) hoặc Theo ngày công (BY_WORKDAY)
↓
API: POST /api/payroll/sheets/{id}/reload  { mode }
↓
Controller: PayrollController.reload()
↓
Service: PayrollServiceImpl.reload() — chỉ khi sheet đang DRAFT/GENERATING (BR-PAY-12)
   - FULL: tính lại toàn bộ kể cả khấu trừ, xóa mọi giá trị sửa tay (kể cả deduction)
   - BY_WORKDAY: chỉ tính lại lương chính/OT theo chấm công mới nhất, GIỮ NGUYÊN khấu trừ đã sửa tay
↓
Repository: EmployeeRepository (đối chiếu nhân viên còn tồn tại), computeFor() nội bộ (Attendance),
            PayslipRepository.save() từng dòng, PayrollSheetRepository.save() (dataRefreshedAt)
↓
Database: UPDATE nhiều payslips + UPDATE payroll_sheets.dataRefreshedAt
↓
Response: PayrollSheetResponse (đã reload)
↓
Frontend: PayrollUpdate.tsx nạp lại toàn bộ bảng lương
```

## 4️⃣ Chốt bảng lương (Finalize)

```
Người dùng: Manager kiểm tra xong, bấm "Chốt lương"
↓
API: POST /api/payroll/sheets/{id}/finalize
↓
Controller: PayrollController.finalizeSheet()
↓
Service: PayrollServiceImpl.finalizeSheet() — chỉ khi đang DRAFT (khóa mọi sửa/tính lại sau đó)
↓
Repository: PayrollSheetRepository.findById() → .save()
↓
Database: UPDATE payroll_sheets (status=FINALIZED, finalizedBy, finalizedAt)
↓
Response: PayrollSheetResponse
↓
Frontend: Payroll.tsx/PayrollUpdate.tsx khóa các nút sửa/tính lại, mở nút "Chi trả"
```

## 5️⃣ Hủy bảng lương (chỉ khi còn nháp)

```
Người dùng: Manager bấm "Hủy bảng lương" trên 1 bảng đang DRAFT
↓
API: POST /api/payroll/sheets/{id}/cancel
↓
Controller: PayrollController.cancelSheet()
↓
Service: PayrollServiceImpl.cancelSheet() — chỉ khi đang DRAFT
↓
Repository: PayrollSheetRepository.findById() → .save()
↓
Database: UPDATE payroll_sheets (status=CANCELLED)
↓
Response: 204 No Content
↓
Frontend: Payroll.tsx cập nhật trạng thái "Đã hủy" trong danh sách
```

## 6️⃣ Chi trả lương (tạo phiếu chi Sổ quỹ tự động)

```
Người dùng: Manager chọn 1 hoặc nhiều phiếu lương đã FINALIZED → nhập số tiền chi + PTTT → "Chi trả"
↓
API: POST /api/payroll/sheets/{id}/payments
↓
Controller: PayrollController.pay()
↓
Service: PayrollServiceImpl.pay() → recordPayment() từng phiếu
   - kiểm tra số tiền hợp lệ (>0, ≤ số còn lại)
   - gọi CashbookService.createSystemVoucher() (module Cashbook) — tự sinh phiếu chi hệ thống
     danh mục "SALARY_PAYMENT", đối tượng nhóm EMPLOYEE (BR-PAY-16/17)
   - cập nhật paidAmount + paymentStatus (PARTIAL/PAID) của từng payslip
   - rollUpSheetPaymentStatus(): tính lại trạng thái thanh toán tổng của cả bảng lương
↓
Repository: PayslipRepository.findById()/save(), PayslipPaymentRepository.save(),
            (cross-module) CashbookVoucherRepository.save() qua CashbookService,
            PayrollSheetRepository.save()
↓
Database: INSERT payslip_payments + INSERT cashbook_vouchers + UPDATE payslips.paidAmount/paymentStatus
           + UPDATE payroll_sheets.paymentStatus
↓
Response: List<PaymentResponse>
↓
Frontend: Payroll.tsx hiện trạng thái "Đã thanh toán/Thanh toán một phần"; phiếu chi vừa tạo
          sẽ xuất hiện ngay trong CashBook.tsx (Sổ quỹ) với nguồn gốc = "PAYROLL"
```

## 7️⃣ Hủy 1 phiếu lương cá nhân (khi chưa chi trả)

```
Người dùng: Manager bấm "Hủy phiếu" trên 1 dòng nhân viên trong bảng lương
↓
API: POST /api/payroll/payslips/{id}/cancel
↓
Controller: PayrollController.cancelPayslip()
↓
Service: PayrollServiceImpl.cancelPayslip() — chặn nếu đã có bất kỳ khoản chi trả nào (BR-PAY-18)
↓
Repository: PayslipRepository.findById() → .save(), PayrollSheetRepository.save() (rollUp)
↓
Database: UPDATE payslips.status=CANCELLED + UPDATE payroll_sheets.paymentStatus
↓
Response: 204 No Content
↓
Frontend: PayrollUpdate.tsx đánh dấu dòng đã hủy, loại khỏi tổng bảng lương
```

## 8️⃣ Quản lý ngày lễ / mẫu lương / cấu hình payroll (CRUD đơn giản)

```
Người dùng: Manager mở Cài đặt → tab "Tính lương" → thêm/sửa/xóa Ngày lễ, Mẫu lương, hoặc đổi
            cấu hình chung (ngày chốt lương...)
↓
API: /api/payroll/holidays (CRUD), /api/payroll/salary-templates (CRUD), /api/payroll/settings (GET/PUT)
↓
Controller: PayrollHolidayController, SalaryTemplateController, PayrollSettingController
↓
Service: PayrollHolidayServiceImpl / SalaryTemplateServiceImpl / PayrollSettingServiceImpl
   - đều check trùng tên/ngày trước khi lưu; Mẫu lương áp dụng kiểu copy-on-apply
     (không có FK ngược từ SalarySetting, sửa/xóa mẫu sau không ảnh hưởng nhân viên đã áp dụng — BR-PAY-01)
↓
Repository: PayrollHolidayRepository / SalaryTemplateRepository / PayrollSettingRepository
↓
Database: INSERT/UPDATE/DELETE payroll_holidays hoặc salary_templates; UPDATE payroll_settings (singleton)
↓
Response: tương ứng từng entity (Response DTO hoặc 204)
↓
Frontend: SettingsPage.tsx (HolidayList/HolidayModal, SalaryTemplateList/SalaryTemplateModal);
          mẫu lương còn được EmployeeModal.tsx gọi lại khi gán lương cho 1 nhân viên cụ thể
```

---

### Ghi chú tổng quan

- **`SalaryCalculator`** (thuần Java, không phụ thuộc DB) là "bộ não" tính lương: SHIFT trả nguyên công theo đơn giá ngày thường/T7/CN/lễ + OT làm tròn xuống theo block + phạt trễ/về sớm làm tròn lên theo block; HOURLY trả theo đúng số phút làm việc (không OT, không phạt vì trễ tự nhiên làm giảm lương); FIXED trả cố định bất kể chấm công.
- Toàn bộ dữ liệu chấm công đầu vào (`AttendanceForPayroll`) đã được module Attendance áp ngưỡng trễ/OT (BR-AT-09/10) sẵn — Payroll **không được tính lại** các ngưỡng này, chỉ quy đổi phút sang tiền.
- Chiều ngược lại: module Employee (`EmployeeDeactivationCheckService`) và module Reporting đều đọc thẳng `PayrollSheetRepository`/`PayslipRepository` — đổi tên các repository này ảnh hưởng cả 2 module đó.
