# Business Rules — Attendance, Cashbook, Employee, Payroll, Reporting, Shift

> Tổng hợp quy tắc nghiệp vụ (Business Rule) từ code hiện có (`Backend/src/main/java/com/rms/restaurant/module/{attendance,cashbook,employee,payroll,reporting,shift}`), đối chiếu tận service-layer.
> Cột **Nguồn**: `code` = mã BR lấy nguyên văn từ comment trong source code (có thể tra lại bằng cách grep chính mã đó); `gán mới` = quy tắc có thật trong logic/validation nhưng source code chưa gắn mã BR — tôi gán một mã mới theo mạch số để tiện tham chiếu, không phải mã chính thức trong code.
> Không bao gồm BR-CS-18/BR-CS-19/BR-X-05/BR-X-05a (ca nổi — floating shift) vì tính năng này đã bị xóa khỏi hệ thống ngày 24/07/2026.

## 1. Module Attendance (`BR-AT`)

| ID | Quy tắc | Áp dụng tại | Nguồn |
|---|---|---|---|
| BR-AT-02 | Không được xóa một mẫu ca làm việc nếu đã có bản ghi chấm công tham chiếu tới ca đó qua lịch làm việc; chỉ có thể ngừng hoạt động (INACTIVE). | `WorkShiftServiceImpl.delete` | code |
| BR-AT-03 | Tổng thời gian trùng lặp (overlap) theo cặp giữa các ca của cùng một nhân viên trong một ngày không được vượt quá 12 giờ (720 phút), kể cả ca sắp thêm vào. | `WorkScheduleServiceImpl.checkOverlapLimit` | code |
| BR-AT-04 | Lịch làm việc lặp lại (repeat rule) được "vật lý hóa" thành các occurrence cụ thể trong cửa sổ cuộn 93 ngày kể từ hiện tại; watermark `generatedUntil` đảm bảo cả tạo tương tác lẫn job đêm mở rộng cửa sổ đều idempotent (không tạo trùng). | `WorkScheduleServiceImpl.materialize`, `extendRollingWindow` | code |
| BR-AT-07 | Người làm thay (substitute) chỉ được gán cho loại chấm công nghỉ phép (không áp dụng cho "có mặt"), không được là chính nhân viên được xếp ca, và phải đang ở trạng thái ACTIVE. | `AttendanceServiceImpl.applySubstitute` | code |
| BR-AT-11 | Chấm công gộp nhiều ca liên tiếp (merged punch) của cùng một nhân viên/cùng ngày chỉ được thực hiện khi: tính năng "gộp ca" đang bật, số ca gộp không vượt giới hạn cấu hình, và khoảng nghỉ giữa các ca liên tiếp không vượt mức tối đa cấu hình. | `AttendanceServiceImpl.markMerged`, `AttendanceCalculator.splitMergedPunch` | code |
| BR-AT-12 | Mức phạt của một vi phạm được chụp nhanh (snapshot) từ loại vi phạm tại thời điểm ghi nhận (trừ khi người dùng ghi đè thủ công); tổng các mức phạt này cũng chính là khoản khấu trừ mặc định khi hệ thống tính phiếu lương ban đầu. | `AttendanceServiceImpl.replaceViolations`; dùng lại tại `PayrollServiceImpl.computeFor` | code |
| BR-EMP-04 | Nhân viên đã ngừng hoạt động (INACTIVE) sẽ không được vật lý hóa thêm occurrence mới từ lịch lặp lại; các occurrence đã tạo trước đó (khi nhân viên còn ACTIVE) vẫn được giữ nguyên. | `WorkScheduleServiceImpl.extendRollingWindow` | code (thuộc domain Employee, áp dụng chéo sang Attendance) |
| BR-AT-13 | Xóa một loại vi phạm đã từng được sử dụng trong lịch sử chấm công chỉ ẩn nó khỏi danh mục đang hoạt động (soft-delete), không xóa cứng — giữ nguyên số liệu lịch sử. | `AttendanceServiceImpl.deleteViolationType` | gán mới |
| BR-AT-14 | Cấu hình chấm công (ngưỡng nửa ngày, đi trễ/về sớm, OT trước/sau ca, giới hạn gộp ca) được xác thực như một khối thống nhất trước khi lưu: mọi giá trị âm, hoặc ngưỡng nửa ngày min ≥ max, hoặc giới hạn gộp ca không hợp lệ khi đang bật, đều khiến toàn bộ yêu cầu cập nhật bị từ chối. | `AttendanceSettingServiceImpl.validate` | gán mới |
| BR-AT-15 | Nhân viên chỉ được tự check-in cho đúng lịch làm việc của **ngày hôm nay**, và không được check-in hai lần cho cùng một lịch; check-out yêu cầu đã check-in trước đó và cũng không được thực hiện hai lần. | `AttendanceServiceImpl.checkIn`, `checkOut` | gán mới |

## 2. Module Cashbook (`BR-CB`)

| ID | Quy tắc | Áp dụng tại | Nguồn |
|---|---|---|---|
| BR-CB-01 | Tên danh mục thu/chi phải duy nhất (không phân biệt hoa/thường) trên toàn hệ thống, không phân biệt theo loại thu hay chi. | `CashbookServiceImpl.createCategory`, `updateCategory` | gán mới |
| BR-CB-02 | Danh mục hệ thống (được seed sẵn với mã cố định, phục vụ phiếu tự động lương/bán hàng) không bao giờ được xóa, bất kể đã phát sinh phiếu hay chưa — kiểm tra này chạy trước cả kiểm tra "đang được sử dụng". | `CashbookServiceImpl.deleteCategory` | gán mới |
| BR-CB-03 | Danh mục đã có ít nhất một phiếu (kể cả phiếu đã hủy) tham chiếu tới thì không được xóa. | `CashbookServiceImpl.deleteCategory` | gán mới |
| BR-CB-04 | Khi lập phiếu thủ công, loại danh mục được chọn (thu/chi) phải khớp với chính loại của danh mục đó. | `CashbookServiceImpl.createVoucher` | gán mới |
| BR-CB-05 | Nhóm đối tác "Khách hàng" (CUSTOMER) chỉ dành cho phiếu do hệ thống tự sinh; phiếu lập thủ công không được chọn nhóm này. Nếu chọn nhóm "Nhân viên" (EMPLOYEE) thì bắt buộc phải chỉ định một đối tác cụ thể. | `CashbookServiceImpl.validateManualPartner` | gán mới |
| BR-CB-06 | Hủy phiếu (void) chỉ đánh dấu cờ `voided=true`; không tạo bút toán đảo và không xóa phiếu gốc. Một phiếu đã hủy không thể hủy lần thứ hai. Phiếu đã hủy bị loại khỏi các phép tính tổng thu/chi. | `CashbookServiceImpl.voidVoucher` | gán mới |
| BR-CB-07 | Số dư đầu kỳ của mỗi quỹ (tiền mặt/ngân hàng) là một giá trị hiện hành duy nhất, không lưu theo từng kỳ báo cáo riêng biệt — thay đổi số dư đầu kỳ hôm nay sẽ ảnh hưởng tới **mọi** lần truy vấn báo cáo tổng hợp sau đó, kể cả khi lọc theo khoảng thời gian quá khứ. | `CashbookServiceImpl.updateOpeningBalance`, `getSummary` | gán mới |
| BR-CB-08 | Nghiệp vụ thanh toán lương (Payroll) và thanh toán hóa đơn (Payment) tự động sinh phiếu sổ quỹ hệ thống (system voucher, qua `createSystemVoucher`) và không phải tuân theo các ràng buộc dành riêng cho phiếu thủ công (khớp loại danh mục, ràng buộc nhóm đối tác). | `CashbookServiceImpl.createSystemVoucher`; gọi từ `PayrollServiceImpl.recordPayment`, `PaymentServiceImpl.createReceiptVoucher` | gán mới |

## 3. Module Employee (`BR-EMP`)

| ID | Quy tắc | Áp dụng tại | Nguồn |
|---|---|---|---|
| BR-IMP-02 | Một lần nhập CSV không được vượt quá 500 dòng dữ liệu; nếu vượt, toàn bộ file bị từ chối trước khi xử lý bất kỳ dòng nào. | `EmployeeServiceImpl.importCsv` | code |
| BR-IMP-03 | Người dùng bắt buộc phải chọn chiến lược nhập (Dừng khi lỗi / Bỏ qua & tiếp tục) trước khi thực hiện import; không có giá trị mặc định ngầm định. | `EmployeeController.importCsv`, `dto/ImportStrategy.java` | code |
| BR-EMP-01 | Mã nhân viên (nếu nhập tay) và số điện thoại phải duy nhất trong toàn bộ danh sách nhân viên. | `EmployeeServiceImpl.create`, `update` | gán mới |
| BR-EMP-02 | Một tài khoản người dùng (User) chỉ được liên kết với đúng một hồ sơ nhân viên tại một thời điểm. | `EmployeeServiceImpl.linkUser` | gán mới |
| BR-EMP-03 | Khi tên/điện thoại/email của một nhân viên có tài khoản liên kết được cập nhật, thông tin tương ứng trên tài khoản người dùng cũng được đồng bộ theo — với ràng buộc duy nhất riêng, độc lập, trên chính bảng người dùng. | `EmployeeServiceImpl.syncLinkedUser` | gán mới |
| BR-EMP-04b | Vô hiệu hóa nhân viên chỉ đổi trạng thái sang INACTIVE; không tự động hủy các lịch làm việc tương lai đã tạo sẵn, không khóa/hủy liên kết tài khoản người dùng, và không kiểm tra ca đang mở trước khi cho phép. | `EmployeeServiceImpl.deactivate` | gán mới |
| BR-EMP-05 | Mẫu lương (Salary Template) được áp dụng theo kiểu sao chép giá trị tại thời điểm áp dụng (copy-on-apply) — sửa hoặc xóa mẫu sau đó không ảnh hưởng ngược tới nhân viên đã áp dụng mẫu trước đó. | `SalaryTemplateServiceImpl.update/delete`; `EmployeeServiceImpl.upsertSalarySetting` | gán mới |
| BR-EMP-06 | Hồ sơ tự phục vụ ("Hồ sơ của tôi") vận hành như một upsert: lần lưu đầu tiên tạo mới bản ghi nhân viên gắn với tài khoản đang đăng nhập, các lần sau chỉ cập nhật. Mã nhân viên, trạng thái, mã chấm công, ảnh đại diện và liên kết tài khoản không thể tự chỉnh sửa qua luồng này. | `EmployeeServiceImpl.saveMyProfile`, `applyProfileFields` | gán mới |

## 4. Module Payroll (`BR-PAY`)

| ID | Quy tắc | Áp dụng tại | Nguồn |
|---|---|---|---|
| BR-PAY-04 | Danh sách ngày lễ/Tết cung cấp dữ liệu đầu vào để phân loại mức lương ngày lễ khi tính lương. | `PayrollHolidayController`; dùng bởi `SalaryCalculator` | code |
| BR-PAY-09 | Việc tính phiếu lương cho toàn bộ nhân viên diễn ra đồng bộ, trong cùng giao dịch với việc tạo bảng lương — bảng lương chuyển thẳng sang trạng thái Nháp (DRAFT) ngay sau khi tính xong; trạng thái "đang tạo" (GENERATING) không tồn tại lâu đủ để người dùng quan sát được ở luồng bình thường. | `PayrollServiceImpl.createSheet` | code |
| BR-PAY-12 | Tải lại (reload) một bảng lương có 2 chế độ: **Toàn bộ** (FULL) tính lại mọi giá trị và xóa mọi ghi đè thủ công, kể cả khoản khấu trừ; **Theo ngày làm việc** (BY_WORKDAY) chỉ tính lại phần lương chính/OT từ chấm công, giữ nguyên khoản khấu trừ đã chỉnh tay. | `PayrollServiceImpl.reload`, `applyRecompute` | code |
| BR-PAY-13 | Dữ liệu chấm công dùng để tính lương được chụp nhanh (snapshot) tại thời điểm tính, giúp một bảng lương đã Chốt (FINALIZED) giữ nguyên bất biến dù dữ liệu chấm công gốc thay đổi sau đó. | `PayrollServiceImpl.finalizeSheet`; `Payslip.attendanceSnapshot` | code |
| BR-PAY-18 | Một phiếu lương đã có bất kỳ khoản thanh toán nào (kể cả một phần) thì không thể hủy — chỉ phiếu lương chưa từng được trả mới hủy được. | `PayrollServiceImpl.cancelPayslip` | code |
| BR-PAY-19 | Kỳ lương theo tháng (MONTHLY) bắt buộc phải là một tháng dương lịch trọn vẹn (từ ngày 1 đến ngày cuối cùng của tháng); phạm vi Tùy chọn (CUSTOM scope) yêu cầu chỉ định ít nhất một nhân viên hợp lệ. | `PayrollServiceImpl.validatePeriod`, `resolveEmployees` | gán mới |
| BR-PAY-20 | Chỉ bảng lương ở trạng thái Nháp (DRAFT) mới được lưu chỉnh sửa, tải lại, chốt hoặc hủy toàn bộ. Bảng lương đã Chốt (FINALIZED) chỉ còn thực hiện được thao tác thanh toán và hủy từng phiếu lương chưa thanh toán. | `PayrollServiceImpl.saveDraft`, `reload`, `finalizeSheet`, `cancelSheet` | gán mới |
| BR-PAY-21 | Mỗi lần thanh toán lương phải có số tiền dương và không được vượt quá số còn phải trả (Tổng lương phiếu − đã trả) của phiếu lương đó; cho phép trả nhiều lần/từng phần cho cùng một phiếu. | `PayrollServiceImpl.validateAmount` | gán mới |
| BR-PAY-22 | Mỗi khoản thanh toán lương (kể cả một phần) tự động sinh một phiếu chi sổ quỹ riêng biệt, không gộp nhiều lần trả vào một phiếu, ghi rõ nhân viên nhận và phiếu lương liên quan. | `PayrollServiceImpl.recordPayment` | gán mới |
| BR-PAY-23 | Trạng thái thanh toán của cả bảng lương được suy ra (roll-up) từ trạng thái các phiếu lương đang hoạt động (không tính phiếu đã hủy) của nó: "Đã trả" nếu tất cả đã trả đủ, "Trả một phần" nếu có ít nhất một phiếu có ghi nhận thanh toán, còn lại là "Chưa trả". | `PayrollServiceImpl.rollUpSheetPaymentStatus` | gán mới |
| BR-PAY-24 | Tên mẫu lương phải duy nhất; mỗi ngày lễ (theo ngày dương lịch cụ thể) chỉ được khai báo một lần; ngày cắt kỳ lương (payroll cutoff day) phải trong khoảng 1–28. | `SalaryTemplateServiceImpl`, `PayrollHolidayServiceImpl`, `PayrollSettingServiceImpl.validate` | gán mới |

## 5. Module Reporting (`BR-RPT`)

| ID | Quy tắc | Áp dụng tại | Nguồn |
|---|---|---|---|
| BR-RPT-01 | Báo cáo cuối ngày và Báo cáo tài chính gộp doanh thu theo thời điểm **hóa đơn được tạo** (`invoice.createdAt`); riêng Dashboard tổng quan gộp theo thời điểm **thanh toán thực sự tất toán** (`payment.paidAt`) — hai mốc thời gian khác nhau có chủ đích, không hoán đổi cho nhau. | `ReportServiceImpl.getEndOfDaySales`, `getFinancialReport` (theo `invoice.createdAt`) vs. `getDashboardOverview` (theo `payment.paidAt`) | gán mới |
| BR-RPT-02 | Chi phí lương trong Báo cáo tài chính chỉ tính từ các bảng lương đã Chốt (FINALIZED), và được phân bổ trọn vào tháng chứa ngày kết thúc kỳ lương — không phân bổ theo tỷ lệ cho các kỳ Tùy chọn không tròn tháng. | `ReportServiceImpl.accumulatePayroll` | gán mới |
| BR-RPT-03 | Các dòng "Chi phí"/"Thu nhập khác" trong Báo cáo tài chính chỉ tính từ phiếu sổ quỹ **thủ công** (loại trừ phiếu do hệ thống tự sinh từ lương/thanh toán hóa đơn), nhằm tránh tính trùng với các dòng doanh thu/chi phí lương đã có sẵn trong báo cáo. | `ReportServiceImpl.accumulateCashbookCategoryLines` | gán mới |
| BR-RPT-04 | Yêu cầu báo cáo tài chính cho một năm nằm trong tương lai trả về kết quả rỗng thay vì báo lỗi. | `ReportServiceImpl.getFinancialReport` | gán mới |
| BR-RPT-05 | Cấu hình "khung giờ doanh thu tùy chỉnh" (bật/tắt + giờ cắt) hiện chỉ được lưu trữ qua UC-RPT-04, **chưa** được bất kỳ báo cáo nào (cuối ngày/dashboard/tài chính) đọc lại và áp dụng vào logic tính toán — cần lưu ý khi mô tả hành vi hệ thống, tránh khẳng định nhầm là đã hoạt động. | `ReportSettingServiceImpl`; xác nhận không có tham chiếu nào từ `ReportServiceImpl` | gán mới |

## 6. Module Shift (`BR-CS`)

> Ghi chú: BR-CS-18, BR-CS-19, BR-X-05, BR-X-05a (mở/gộp "ca nổi") từng tồn tại trong code nhưng đã bị xóa cùng tính năng ca nổi (24/07/2026) — không còn hiệu lực, không liệt kê ở đây.

| ID | Quy tắc | Áp dụng tại | Nguồn |
|---|---|---|---|
| BR-CS-01 | Mỗi thu ngân chỉ được có tối đa một ca đang mở (OPEN) tại một thời điểm. | `ShiftServiceImpl.open` | code |
| BR-CS-02 | Chỉ chủ ca (người đã mở ca) hoặc Manager/Admin mới được đóng ca. | `ShiftServiceImpl.close` | code |
| BR-CS-03 | Tiền mặt kỳ vọng cuối ca = quỹ tiền mặt đầu ca + doanh thu tiền mặt phát sinh trong ca. | `ShiftServiceImpl.buildExpectedAmounts` | code |
| BR-CS-04 / BR-CS-13 | Thu ngân chỉ đối soát tiền mặt khi đóng ca; ba kênh thanh toán online được tự động ghi actual = expected tại thời điểm đóng (không tạo lệch tại đây) — việc đối soát thật với kênh online diễn ra sau, qua BR-CS-06. | `ShiftServiceImpl.close` | code |
| BR-CS-05 | Ghi chú đóng ca là bắt buộc chỉ khi độ lệch tiền mặt vượt ngưỡng dung sai cấu hình (mặc định = 0, tức bất kỳ lệch nào khác 0 cũng cần ghi chú). | `ShiftServiceImpl.close` | code |
| BR-CS-06 | Ca đóng chỉ chuyển sang trạng thái chờ đối soát (PENDING_RECON) khi tính năng đối soát thanh toán online (settlement matching) đang bật **và** ca có doanh thu online > 0; ngược lại đóng thẳng sang CLOSED. | `ShiftServiceImpl.close` | code |
| BR-CLOSE-06 | Không được đóng ca khi còn đơn hàng đang hoạt động, chưa thanh toán (PENDING/ACCEPTED/PREPARING/SERVED). | `ShiftServiceImpl.close` | code |
| BR-CS-08 | Doanh thu theo từng phương thức thanh toán được tính từ các khoản thanh toán đã PAID và đã được gắn (attribute) vào đúng ca đang xử lý. | `ShiftServiceImpl.close`, `forceClose` | code |
| BR-CS-09 | Số tiền bàn giao (handover amount) khi đóng ca không được vượt quá số tiền mặt thực đếm được. | `ShiftServiceImpl.close` | code |
| BR-CS-09/11 | Số quỹ đầu ca được gợi ý khi mở ca mới = số tiền bàn giao của lần đóng ca gần nhất của chính thu ngân đó. | `ShiftServiceImpl.getSuggestedOpeningFloat` | code |
| BR-CS-10 | Bất kỳ ca nào trong một ngày kinh doanh chưa ở trạng thái CLOSED (đang mở, chờ Manager xác nhận, chờ đối soát...) sẽ khiến báo cáo tổng hợp ngày đó bị đánh dấu "chưa đầy đủ" (incomplete). | `ShiftServiceImpl.dailySummary` | code |
| BR-CS-12 | Tổng tiền quẹt thẻ POS (card batch total) nhập khi đóng ca chỉ mang tính đối chiếu thông tin — không bao giờ tạo ra chênh lệch và không bao giờ chặn việc đóng ca. | `ShiftServiceImpl.close` | code |
| BR-CS-14 | Ngày kinh doanh (business date) của một ca được xác định theo giờ cắt ngày có thể cấu hình (mặc định 05:00), không theo nửa đêm dương lịch — ca mở trước giờ cắt thuộc về ngày kinh doanh của hôm trước. | `ShiftServiceImpl.businessDate` | code |
| BR-CS-15 | Ca còn mở quá thời điểm kết thúc ngày kinh doanh của nó (qua giờ cắt của ngày hôm sau) sẽ tự động được đánh dấu STALE ngay khi hệ thống đọc tới nó lần tiếp theo. Chỉ Manager/Admin mới được ép đóng (force-close) một ca STALE/OPEN quá hạn, sau khi kiểm đếm tiền mặt thực tế; thu ngân gốc vẫn là người chịu trách nhiệm (cashierId không đổi), Manager chỉ được ghi nhận là người thực hiện thao tác đóng. | `ShiftServiceImpl.markStaleIfElapsed`, `forceClose` | code |
| BR-SUM-01 | Tổng kết ca luôn hiển thị đủ 3 giá trị cho từng phương thức thanh toán: kỳ vọng (expected), thực tế (actual) và chênh lệch (variance). | `ShiftMapper.toSummary` | code |
| BR-CS-16 | Khi cấu hình "Kết ca" yêu cầu Manager xác nhận, mọi yêu cầu đóng ca sẽ chuyển ca sang PENDING_MANAGER_CONFIRM thay vì đóng ngay. Manager có thể duyệt (chuyển tiếp sang CLOSED/PENDING_RECON theo đúng quy tắc BR-CS-06) hoặc từ chối (mở lại ca ở trạng thái OPEN, xóa sạch dữ liệu đóng ca đã nhập và ghi lại lý do từ chối). | `ShiftServiceImpl.approveClose`, `rejectClose` | gán mới |
