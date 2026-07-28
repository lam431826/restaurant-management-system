# Luồng xử lý module Shift (Ca thu ngân)

> Trình bày theo pipeline: Người dùng thao tác → API → Controller → Service → Repository → Database → Response → Frontend hiển thị.
> Lưu ý: đây là **ca thu ngân (cash-register shift)** — khác hoàn toàn với "ca làm việc" của module Attendance (`WorkShift`). `Shift.status` là **chuỗi tự do** (`"OPEN"`, `"CLOSED"`, `"PENDING_RECON"`, `"PENDING_MANAGER_CONFIRM"`, `"STALE"`, `"FORCE_CLOSED"`), không phải enum. Phân quyền của module này **không nằm ở `@PreAuthorize`** (hầu hết endpoint chỉ yêu cầu đã đăng nhập) mà được kiểm tra thủ công bên trong `ShiftServiceImpl` (chủ ca / MANAGER).

## 1️⃣ Mở ca làm việc

```
Người dùng: Cashier đăng nhập POS, chưa có ca mở → nhập tiền quỹ đầu ca → "Mở ca"
↓
API: POST /api/shifts  { openingCash }
↓
Controller: ShiftController.open()
↓
Service: ShiftServiceImpl.open() — chặn nếu cashier đã có ca "OPEN" (BR-CS-01),
         tính businessDate theo giờ cutoff (mặc định 05:00, BR-CS-14)
↓
Repository: UserRepository.findByUsername(), ShiftRepository.findByCashierIdAndStatus("OPEN"),
            ShiftRepository.save()
↓
Database: INSERT shifts (status="OPEN")
↓
Response: ShiftSummaryResponse
↓
Frontend: OpenShiftModal.tsx đóng modal; CashierOrders.tsx bắt đầu phiên bán hàng
```
*(Trước khi mở, `OpenShiftModal.tsx` gọi `GET /api/shifts/suggested-float` để gợi ý số tiền quỹ đầu ca = `handoverAmount` của ca gần nhất — BR-CS-09/11.)*

## 2️⃣ Xử lý thanh toán khi đang có ca mở (gate check)

```
Người dùng: Cashier bấm "Thanh toán" cho 1 đơn hàng
↓
API: POST /api/payments  (module payment, không phải module shift)
↓
Controller: PaymentController → PaymentServiceImpl.process()
↓
Service: PaymentServiceImpl.requireCashierWithOpenShift()
   - nếu cấu hình "Bắt buộc kết ca" (ShiftSetting.shiftClosingRequired) đang bật
     mà cashier KHÔNG có ca "OPEN" → từ chối thanh toán
↓
Repository: ShiftRepository.findByCashierIdAndStatus("OPEN"), ShiftSettingService.current()
↓
Database: nếu hợp lệ → Payment.shiftId/cashierId được gán theo ca đang mở (BR-CS-08)
↓
Response: lỗi PAYMENT_NO_OPEN_SHIFT (403) nếu chưa mở ca, hoặc PaymentResponse nếu thành công
↓
Frontend: CashierOrders.tsx bắt buộc mở ca trước khi cho thao tác thanh toán
```

## 3️⃣ Đóng ca (cashier tự đóng)

```
Người dùng: Cashier bấm "Đóng ca" → nhập tiền mặt kiểm đếm thực tế (+ ghi chú nếu lệch quỹ)
↓
API: PUT /api/shifts/{id}/close  { cashActual, handoverAmount, cardBatchTotal?, closingNote? }
↓
Controller: ShiftController.close()
↓
Service: ShiftServiceImpl.close()
   - chỉ chủ ca hoặc MANAGER được đóng (BR-CS-02)
   - chặn nếu còn đơn hàng chưa xử lý xong trong hệ thống (BR-CLOSE-06)
   - tính doanh thu/kỳ vọng theo từng PTTT chỉ từ Payment đã "PAID" của ca này (BR-CS-08)
   - chỉ đối soát tiền mặt; PTTT online tự khớp actual=expected (BR-CS-04/13)
   - lệch quỹ tiền mặt vượt ngưỡng mà chưa ghi chú → từ chối (BR-CS-05)
   - handoverAmount > tiền mặt thực tế → từ chối (BR-CS-09)
   - trạng thái kết quả: PENDING_MANAGER_CONFIRM (nếu bật xác nhận), hoặc PENDING_RECON
     (nếu bật đối soát online & có doanh thu online), hoặc CLOSED
↓
Repository: ShiftRepository.findById(), PaymentRepository.findByShiftIdAndStatus("PAID"),
            ShiftPaymentReconciliationRepository.deleteByShiftId()/saveAll(), ShiftRepository.save()
↓
Database: INSERT/UPDATE shift_payment_reconciliations + UPDATE shifts (status, closedAt, closingCash...)
↓
Response: ShiftSummaryResponse
↓
Frontend: CloseShiftModal.tsx đóng modal; nếu PENDING_MANAGER_CONFIRM thì Header.tsx hiện
          "Đang chờ quản lý xác nhận"; sự kiện realtime /topic/shifts cũng đẩy cập nhật này
```

## 4️⃣ Duyệt / Từ chối đóng ca (khi bật "Quản lý xác nhận kết ca")

```
Người dùng: Manager mở màn "Đối soát ca" → bấm "Duyệt" hoặc "Từ chối" cho ca đang PENDING_MANAGER_CONFIRM
↓
API: PUT /api/shifts/{id}/approve-close   hoặc   PUT /api/shifts/{id}/reject-close { reason }
↓
Controller: ShiftController.approveClose() / rejectClose()
↓
Service: ShiftServiceImpl.approveClose() / rejectClose() — chỉ MANAGER/ADMIN
   - Duyệt: chuyển sang PENDING_RECON hoặc CLOSED
   - Từ chối: đưa ca quay lại "OPEN", xóa dữ liệu đối soát cũ, ghi chú lý do từ chối
↓
Repository: ShiftRepository.findById(), ShiftPaymentReconciliationRepository.findByShiftId()/deleteByShiftId(),
            ShiftRepository.save()
↓
Database: UPDATE shifts.status (+ xóa/ghi lại shift_payment_reconciliations)
↓
Response: ShiftSummaryResponse
↓
Frontend: ShiftReconciliation.tsx cập nhật danh sách qua realtime /topic/shifts;
          nếu bị từ chối, CashierOrders.tsx của cashier đó hiện lại banner lý do từ chối
          và cho phép đóng ca lại
```

## 5️⃣ Đóng ca bắt buộc (Manager, ca "quên đóng"/STALE)

```
Người dùng: Manager thấy ca ở trạng thái STALE hoặc OPEN quá lâu → bấm "Đóng ca bắt buộc"
↓
API: PUT /api/shifts/{id}/force-close  { cashActual, reason }
↓
Controller: ShiftController.forceClose()
↓
Service: ShiftServiceImpl.forceClose() — chỉ MANAGER/ADMIN (BR-CS-15); ca phải đang OPEN hoặc STALE
   - tính lại kỳ vọng/lệch quỹ như đóng ca thường, nhưng luôn ra thẳng FORCE_CLOSED
   - closedBy = Manager, cashierId (chủ ca) giữ nguyên để vẫn quy trách nhiệm đúng người
↓
Repository: ShiftRepository.findById(), PaymentRepository.findByShiftIdAndStatus("PAID"),
            ShiftPaymentReconciliationRepository.deleteByShiftId()/saveAll(), ShiftRepository.save()
↓
Database: UPDATE shifts (status="FORCE_CLOSED", closedBy, closingNote="FORCE_CLOSED by manager: ...")
↓
Response: ShiftSummaryResponse
↓
Frontend: ShiftReconciliation.tsx đóng modal xác nhận, danh sách reload
```

## 6️⃣ Xem báo cáo đối soát ca theo ngày

```
Người dùng: Manager mở "Đối soát ca" → chọn ngày
↓
API: GET /api/shifts/daily-summary?date=YYYY-MM-DD
↓
Controller: ShiftController.dailySummary()  (chỉ MANAGER)
↓
Service: ShiftServiceImpl.dailySummary()
   - lấy toàn bộ ca theo businessDate (BR-CS-14), tự đánh dấu STALE nếu ca mở quá hạn
   - gom tổng theo PTTT (methodTotals) và theo từng cashier (shifts)
   - incomplete=true nếu còn ca nào chưa CLOSED (BR-CS-10)
↓
Repository: ShiftRepository.findByBusinessDateOrderByOpenedAtAsc(), UserRepository.findAllById(),
            ShiftPaymentReconciliationRepository.findByShiftId() (từng ca)
↓
Database: chỉ SELECT (kèm side-effect UPDATE status→STALE nếu phát hiện ca quá hạn)
↓
Response: DailySummaryResponse { methodTotals, shifts, incomplete }
↓
Frontend: ShiftReconciliation.tsx vẽ 2 tầng bảng: tổng theo PTTT + chi tiết từng ca/cashier,
          hiện nút "Duyệt/Từ chối/Đóng bắt buộc" tương ứng theo status từng dòng
```

## 7️⃣ Cấu hình kết ca

```
Người dùng: Manager mở Cài đặt → tab Báo cáo → bật/tắt "Bắt buộc kết ca" / "Quản lý xác nhận kết ca"
↓
API: GET /api/shifts/settings   (đọc)
     PUT /api/shifts/settings   (lưu, chỉ MANAGER/ADMIN)
↓
Controller: ShiftSettingController.get() / update()
↓
Service: ShiftSettingServiceImpl.get() / update()
↓
Repository: ShiftSettingRepository.findById(FIXED_ID) → .save()
↓
Database: UPDATE shift_settings (1 dòng duy nhất, id cố định)
↓
Response: ShiftSettingResponse
↓
Frontend: SettingsPage.tsx lưu ngay khi đổi (optimistic update); cấu hình này ảnh hưởng
          ngay tới luồng 2️⃣ (bắt buộc mở ca) và luồng 3️⃣ (có cần Manager duyệt hay không)
```

---

### Ghi chú tổng quan

- **Không có UI nào gọi `GET /api/shifts` (danh sách phân trang toàn bộ ca)** — endpoint tồn tại nhưng chưa có màn hình tiêu thụ.
- Trường `cardBatchTotal` (BR-CS-12, tổng đối soát máy POS thẻ) có đủ ở DTO/entity nhưng **`CloseShiftModal.tsx` hiện chưa thu thập giá trị này** — luôn gửi `undefined`.
- Cột `merged_into_shift_id` trong bảng `shifts` là **cột chết** (còn lại từ tính năng "ca nổi" — floating shift — đã bị xóa khỏi code, chỉ giữ cột để không phá dữ liệu cũ).
