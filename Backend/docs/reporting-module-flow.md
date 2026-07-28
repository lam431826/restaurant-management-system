# Luồng xử lý module Reporting (Báo cáo)

> Trình bày theo pipeline: Người dùng thao tác → API → Controller → Service → Repository → Database → Response → Frontend hiển thị.
> Đặc điểm riêng của module này: **gần như toàn bộ là read-only** — không có entity/bảng dữ liệu nghiệp vụ nào của riêng module Reporting (chỉ có 1 bảng cấu hình singleton `report_settings`). Mọi con số hiển thị đều được tính **tại chỗ bằng Java** (không dùng `GROUP BY` SQL) từ dữ liệu của các module khác: `payment` (Invoice, Payment, InvoiceItemAllocation), `order` (Order, OrderItem), `payroll` (PayrollSheet, Payslip), `cashbook` (CashbookCategory, CashbookVoucher), `authentication` (User), `table` (RestaurantTable).

## 1️⃣ Xem báo cáo cuối ngày (End-of-Day Sales)

```
Người dùng: Manager mở "Báo cáo cuối ngày", chọn khoảng thời gian + lọc nhân viên/PTTT/khu vực/bàn
↓
API: GET /api/reports/end-of-day?from=...&to=...&staffIds=...&paymentMethod=...&areaName=...&tableName=...
↓
Controller: ReportController.getEndOfDaySales()
↓
Service: ReportServiceImpl.getEndOfDaySales()
   - loadSettledInvoices(): lấy các Payment đã PAID trong khoảng thời gian, khử trùng lặp về 1 payment/invoice
   - loadEndOfDayLookup(): tra cứu Order, User (tên nhân viên), RestaurantTable, số lượng món/hóa đơn
   - toRow(): build từng dòng EndOfDaySalesRow, lọc thêm theo staff/PTTT/khu vực/bàn trong bộ nhớ
↓
Repository: PaymentRepository.findSettledPaidBetween(), OrderRepository.findAllById(),
            UserRepository.findAllById(), TableRepository.findAll(),
            InvoiceItemAllocationRepository.findAllByInvoiceIds()
↓
Database: chỉ SELECT, không đổi gì
↓
Response: List<EndOfDaySalesRow>
↓
Frontend: EndOfDayReport.tsx (qua EndOfDayPreview) vẽ bảng doanh thu theo hóa đơn
```

## 2️⃣ Xem dashboard tổng quan (doanh thu, biểu đồ, top món)

```
Người dùng: Manager mở trang chủ Dashboard, chọn khoảng thời gian + độ chi tiết (theo giờ/ngày)
↓
API: GET /api/reports/dashboard?from=...&to=...&granularity=HOUR|DAY  (gọi 2 lần: kỳ hiện tại + kỳ trước để so sánh)
↓
Controller: ReportController.getDashboardOverview()
↓
Service: ReportServiceImpl.getDashboardOverview()
   - loadSettledInvoices() (dùng chung với báo cáo cuối ngày)
   - buildRevenue(): tổng gross/discount/net revenue, số hóa đơn, giá trị TB/hóa đơn
   - buildRevenueSeries(): chia bucket theo giờ/ngày, cộng dồn theo paidAt
   - buildPaymentBreakdown(): gom theo phương thức thanh toán
   - buildTopItems(): top 5 món bán chạy theo doanh thu
↓
Repository: PaymentRepository.findSettledPaidBetween(), InvoiceItemAllocationRepository.findAllByInvoiceIds(),
            OrderItemRepository.findAllById()
↓
Database: chỉ SELECT, không đổi gì
↓
Response: DashboardOverviewResponse { revenue, revenueSeries, paymentBreakdown, topItems }
↓
Frontend: Dashboard.tsx tự động poll mỗi 60s, đẩy dữ liệu xuống KPICards.tsx, RevenueChart.tsx,
          OrderActivityChart.tsx, PaymentBreakdown.tsx, MenuPerformance.tsx
```

## 3️⃣ Xem báo cáo tài chính (Thu chi / P&L theo tháng-quý-năm)

```
Người dùng: Manager mở "Báo cáo thu chi", chọn năm + độ chi tiết (Tháng/Quý/Năm)
↓
API: GET /api/reports/financial?year=...&granularity=MONTH|QUARTER|YEAR
     GET /api/reports/financial/lines   (gọi song song để lấy tên danh mục chi phí/thu nhập khác)
↓
Controller: ReportController.getFinancialReport() / getFinancialReportLines()
↓
Service: ReportServiceImpl.getFinancialReport()
   - accumulateRevenueAndCogs(): doanh thu bán hàng + giá vốn (COGS) từ hóa đơn đã thanh toán
   - accumulatePayroll(): chi phí lương theo cơ sở dồn tích (accrual) — chỉ tính phiếu lương đã FINALIZED,
     gán vào tháng theo periodEnd của bảng lương
   - accumulateCashbookCategoryLines(): cộng các phiếu thu/chi THỦ CÔNG (loại trừ phiếu hệ thống payroll/thanh toán
     hóa đơn để không tính trùng) theo từng danh mục do Manager tạo trong Sổ quỹ
   - toResponse(): tính netRevenue, grossProfit, expenses, operatingProfit, netProfit theo công thức P&L
↓
Repository: PaymentRepository.findSettledPaidBetween(), InvoiceItemAllocationRepository.findAllByInvoiceIds(),
            PayrollSheetRepository.findFinalizedOverlapping(), PayslipRepository.findByPayrollSheetIdIn(),
            CashbookCategoryRepository.findByCodeIsNullAndAccountingToIncomeTrueOrderByNameAsc(),
            CashbookVoucherRepository.findForFinancialReport()
↓
Database: chỉ SELECT, không đổi gì
↓
Response: List<FinancialPeriodResponse> (mới nhất trước) + List<FinancialCategoryLineDto>
↓
Frontend: FinancialReport.tsx (qua FinancialReportPreview) vẽ bảng P&L theo kỳ, kèm các dòng danh mục con
```

## 4️⃣ Cấu hình báo cáo (giờ chốt doanh thu trong ngày)

```
Người dùng: Manager mở "Thiết lập báo cáo" trong trang Cài đặt → đổi giờ chốt doanh thu → Lưu
↓
API: GET /api/reports/settings   (đọc khi mở trang)
     PUT /api/reports/settings   (lưu khi bấm nút)
↓
Controller: ReportSettingController.get() / update()
↓
Service: ReportSettingServiceImpl.get() / update()
↓
Repository: ReportSettingRepository.findById(FIXED_ID) → .save()
↓
Database: UPDATE report_settings (1 dòng duy nhất, id cố định — đây là ghi DB DUY NHẤT của cả module Reporting)
↓
Response: ReportSettingResponse { customRevenueWindowEnabled, revenueCutoffTime, updatedAt }
↓
Frontend: SettingsPage.tsx lưu thành công; lần mở EndOfDayReport.tsx sau đó sẽ tự set giờ kết thúc mặc định
          theo revenueCutoffTime (nếu người dùng chưa tự chỉnh filter)
```

---

### Ghi chú tổng quan

- Toàn bộ module **không có endpoint ghi dữ liệu nghiệp vụ nào** — chỉ luồng 4️⃣ (cấu hình) có `UPDATE`, và nó chỉ ảnh hưởng tới **giá trị mặc định** hiển thị trên FE, không ảnh hưởng số liệu report.
- 2 bảng migration `financial_custom_lines`/`financial_custom_line_values` (V43) đã **tồn tại trong schema nhưng không còn được code nào tham chiếu** — phần dòng "Chi phí/Thu nhập khác" đã được chuyển sang lấy trực tiếp từ danh mục Sổ quỹ (`CashbookCategory`/`CashbookVoucher`) thay vì 2 bảng này.
