# Luồng xử lý module Cashbook (Sổ quỹ)

> Trình bày theo pipeline: Người dùng thao tác → API → Controller → Service → Repository → Database → Response → Frontend hiển thị.
> Cấu trúc dữ liệu: `CashbookCategory` (danh mục thu/chi, có thể là danh mục hệ thống `code != null` hoặc danh mục Manager tự tạo `code = null`), `CashbookVoucher` (phiếu thu/chi, `sourceType` = `MANUAL`/`PAYROLL`/`INVOICE_PAYMENT`), `CashbookOpeningBalance` (số dư đầu kỳ, 1 dòng/quỹ: CASH/BANK/EWALLET).

## 1️⃣ Xem danh sách phiếu thu/chi (có lọc)

```
Người dùng: Manager mở "Sổ quỹ", lọc theo quỹ/thời gian/loại phiếu/danh mục/trạng thái/người tạo/đối tượng
↓
API: GET /api/cashbook/vouchers?search=...&fund=...&from=...&to=...&types=...&categoryIds=...
↓
Controller: CashbookController.listVouchers()
↓
Service: CashbookServiceImpl.listVouchers() — chuẩn hóa bộ lọc (EffectiveFilter)
↓
Repository: CashbookVoucherRepository.search() (JPQL phân trang, sort mặc định occurredAt DESC),
            CashbookCategoryRepository.findAllById() (tra tên danh mục hàng loạt)
↓
Database: chỉ SELECT, không đổi gì
↓
Response: PageResponse<VoucherResponse>
↓
Frontend: CashBook.tsx (qua CashBookTable) vẽ bảng phiếu, phân trang
```

## 2️⃣ Tạo phiếu thu/chi thủ công

```
Người dùng: Manager bấm "Phiếu thu" hoặc "Phiếu chi" → chọn danh mục + đối tượng + số tiền → Lưu
↓
API: POST /api/cashbook/vouchers
↓
Controller: CashbookController.createVoucher()
↓
Service: CashbookServiceImpl.createVoucher()
   - kiểm tra loại danh mục phải khớp loại phiếu (BR-CB-04)
   - nhóm đối tượng "Khách hàng" bị cấm cho phiếu thủ công (chỉ hệ thống mới dùng);
     nhóm "Nhân viên" bắt buộc chọn đúng 1 nhân viên (BR-CB-05)
   - sinh mã phiếu tự động PT/PC%06d (nextVoucherCode)
↓
Repository: CashbookCategoryRepository.findById(), CashbookVoucherRepository.findMaxCode()/save()
↓
Database: INSERT cashbook_vouchers (sourceType=MANUAL, voided=false)
↓
Response: VoucherResponse (201, Location: /cashbook/vouchers/{id})
↓
Frontend: CashFlowModal.tsx đóng modal; CashBook.tsx nạp lại trang đầu danh sách
```

## 3️⃣ Sửa phiếu thu/chi thủ công

```
Người dùng: Manager mở chi tiết 1 phiếu MANUAL chưa hủy → bấm "Chỉnh sửa" → đổi số tiền/danh mục/ghi chú
↓
API: PUT /api/cashbook/vouchers/{id}
↓
Controller: CashbookController.updateVoucher()
↓
Service: CashbookServiceImpl.updateVoucher()
   - chỉ sửa được phiếu sourceType=MANUAL (phiếu hệ thống PAYROLL/INVOICE_PAYMENT là read-only ở đây)
   - phiếu đã hủy không sửa được; loại phiếu (thu/chi) không được đổi
   - validate lại danh mục + đối tượng như lúc tạo (BR-CB-04/05)
↓
Repository: CashbookVoucherRepository.findById() → .save()
↓
Database: UPDATE cashbook_vouchers
↓
Response: VoucherResponse
↓
Frontend: CashFlowModal.tsx (chế độ edit) đóng, CashBook.tsx nạp lại trang hiện tại
```

## 4️⃣ Hủy phiếu (void)

```
Người dùng: Manager mở chi tiết phiếu → bấm "Hủy phiếu" → xác nhận
↓
API: PUT /api/cashbook/vouchers/{id}/void
↓
Controller: CashbookController.voidVoucher()
↓
Service: CashbookServiceImpl.voidVoucher() — chỉ đánh dấu cờ, KHÔNG tạo bút toán đảo,
         KHÔNG xóa phiếu gốc; áp dụng được cho cả phiếu thủ công lẫn phiếu hệ thống (BR-CB-06)
↓
Repository: CashbookVoucherRepository.findById() → .save()
↓
Database: UPDATE cashbook_vouchers.voided = true
↓
Response: VoucherResponse
↓
Frontend: CashBookDetail.tsx cập nhật trạng thái "Đã hủy"; phiếu bị loại khỏi mọi tính tổng
          (Summary, Báo cáo tài chính) nhưng vẫn hiện trong danh sách lịch sử
```

## 5️⃣ Quản lý danh mục thu/chi

```
Người dùng: Manager mở "Danh mục" trong form tạo phiếu → thêm/sửa/xóa 1 danh mục
↓
API: POST /api/cashbook/categories   PUT /api/cashbook/categories/{id}   DELETE /api/cashbook/categories/{id}
↓
Controller: CashbookController.createCategory() / updateCategory() / deleteCategory()
↓
Service: CashbookServiceImpl.createCategory()/updateCategory()/deleteCategory()
   - tên danh mục phải duy nhất, không phân biệt hoa/thường (BR-CB-01)
   - danh mục hệ thống (code != null, ví dụ SALARY_PAYMENT/SALES_RECEIPT) không bao giờ xóa được (BR-CB-02)
   - danh mục đã có phiếu tham chiếu (kể cả phiếu đã hủy) không xóa được (BR-CB-03)
↓
Repository: CashbookCategoryRepository.existsByNameIgnoreCase[AndIdNot](), .save()/.delete(),
            CashbookVoucherRepository.existsByCategoryId() (guard khi xóa)
↓
Database: INSERT/UPDATE/DELETE cashbook_categories (xóa là hard-delete, chỉ khi qua hết 2 điều kiện trên)
↓
Response: CategoryResponse hoặc 204 No Content
↓
Frontend: CategoryModal.tsx (mở từ CategoryPicker trong CashFlowModal.tsx) cập nhật danh sách danh mục
```

## 6️⃣ Xem tổng quan quỹ (tồn đầu kỳ, thu, chi, tồn cuối kỳ)

```
Người dùng: Manager chọn quỹ (Tiền mặt/Ngân hàng/Ví điện tử) + khoảng thời gian trên Sổ quỹ
↓
API: GET /api/cashbook/summary?fund=...&from=...&to=...
↓
Controller: CashbookController.getSummary()
↓
Service: CashbookServiceImpl.getSummary()
   - opening = số dư đầu kỳ HIỆN HÀNH của quỹ (không lưu theo từng kỳ báo cáo — BR-CB-07,
     đổi số dư đầu kỳ hôm nay ảnh hưởng ngược tới mọi báo cáo quá khứ)
   - income/expense = tổng phiếu thu/chi CHƯA HỦY (voided=false) trong khoảng thời gian
↓
Repository: CashbookOpeningBalanceRepository.findAll(), CashbookVoucherRepository.sumByType() (x2: thu, chi)
↓
Database: chỉ SELECT, không đổi gì
↓
Response: SummaryResponse { opening, income, expense, closing }
↓
Frontend: CashBookSummary.tsx hiển thị 4 số liệu (closing = opening + income - expense tính lại phía FE)
```

## 7️⃣ Xuất CSV danh sách phiếu

```
Người dùng: Manager bấm "Xuất Excel" trên Sổ quỹ (theo bộ lọc hiện tại)
↓
API: GET /api/cashbook/vouchers/export?...(cùng bộ filter với danh sách)
↓
Controller: CashbookController.exportVouchers()
↓
Service: CashbookServiceImpl.listVouchersUnpaged()
↓
Repository: CashbookVoucherRepository.searchAll() (không phân trang)
↓
Database: chỉ SELECT, không đổi gì
↓
Response: List<VoucherResponse> (toàn bộ, không phân trang)
↓
Frontend: CashBook.tsx tự dựng file CSV phía client (exportCsv()) từ dữ liệu trả về rồi tải xuống
```

## 8️⃣ (Hệ thống, không phải người dùng) Tự động sinh phiếu khi Payroll/Payment phát sinh

```
Trigger: Manager "Chi trả lương" (module Payroll) HOẶC Cashier/khách hàng thanh toán hóa đơn (module Payment)
↓
Gọi nội bộ: CashbookService.createSystemVoucher(SystemVoucherRequest)
   - từ PayrollServiceImpl.recordPayment() → danh mục "SALARY_PAYMENT", nhóm đối tượng EMPLOYEE
   - từ PaymentServiceImpl.createReceiptVoucher() → danh mục "SALES_RECEIPT", nhóm đối tượng CUSTOMER
↓
Service: CashbookServiceImpl.createSystemVoucher() — KHÔNG áp lại validate danh mục/đối tượng thủ công
         (tin tưởng module gọi vào), sinh mã phiếu PT/PC/TT%06d tùy sourceType
↓
Repository: CashbookCategoryRepository.findByCode(), CashbookVoucherRepository.save()
↓
Database: INSERT cashbook_vouchers (sourceType=PAYROLL hoặc INVOICE_PAYMENT, sourceReferenceId=payslipId/paymentId)
↓
Response: VoucherResponse (mã phiếu trả về được lưu ngược vào payslip_payments.voucherCode bên Payroll)
↓
Frontend: phiếu mới xuất hiện ngay trong CashBook.tsx ở lần tải danh sách kế tiếp,
          không sửa được (chỉ Hủy) vì không phải sourceType=MANUAL
```

---

### Ghi chú tổng quan

- **Endpoint số dư đầu kỳ (`GET/PUT /api/cashbook/opening-balance`) tồn tại ở backend nhưng chưa có UI tiêu thụ** — Frontend hiện chỉ đọc số dư đầu kỳ gián tiếp qua `getSummary()`, chưa có màn hình chỉnh sửa trực tiếp.
- Void (hủy phiếu) áp dụng được cho **mọi** `sourceType`, nhưng Sửa (`updateVoucher`) chỉ áp dụng cho `MANUAL` — đây là 2 quy tắc khác nhau, dễ nhầm lẫn khi đọc code.
- Module Reporting đọc thẳng `CashbookCategoryRepository`/`CashbookVoucherRepository` (chỉ phiếu `MANUAL`, loại trừ phiếu hệ thống để tránh tính trùng doanh thu/chi phí) để dựng báo cáo tài chính — xem `reporting-module-flow.md`.
