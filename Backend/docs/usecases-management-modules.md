# Use Case toàn bộ – Module Attendance, Cashbook, Employee, Payroll, Reporting, Shift

> Tổng hợp từ các Controller/Service backend hiện có (`Backend/src/main/java/com/rms/restaurant/module/{attendance,cashbook,employee,payroll,reporting,shift}`).
> Mỗi use case tương ứng 1 nhóm chức năng nghiệp vụ (có thể gồm nhiều endpoint liên quan).

## 1. Module Attendance (Chấm công) — mã `UC-AT`

| Use Case ID | Use Case | Feature | Use Case Description |
|---|---|---|---|
| UC-AT-01 | Quản lý mẫu ca làm việc | Thiết lập ca làm việc | Manager/Admin tạo, xem danh sách, cập nhật, xóa các mẫu ca làm việc (tên ca, giờ bắt đầu/kết thúc) dùng làm cơ sở để lập lịch làm việc. |
| UC-AT-02 | Lập lịch làm việc cho nhân viên | Lịch làm việc | Manager/Admin tạo lịch làm việc cho nhân viên theo ca (hỗ trợ quy tắc lặp lại và vật lý hóa từng occurrence); xem lịch theo khoảng ngày/nhân viên; xóa 1 occurrence hoặc hủy lặp lại của cả rule kể từ 1 ngày cụ thể. |
| UC-AT-03 | Xem bảng chấm công & tổng hợp kỳ | Chấm công | Manager/Admin xem bảng timesheet (theo ô ngày × nhân viên) và bảng tổng hợp chấm công (số công, giờ làm, vi phạm...) trong một khoảng ngày. |
| UC-AT-04 | Ghi nhận chấm công thủ công | Chấm công | Manager/Admin chỉnh sửa/ghi đè bản ghi chấm công của một lịch làm việc (giờ vào/ra thực tế, trạng thái), chấm công hàng loạt (bulk mark), xem chi tiết và xóa (hủy) một bản ghi chấm công. |
| UC-AT-05 | Thiết lập cấu hình chấm công | Cấu hình chấm công | Manager/Admin xem và cập nhật cấu hình chấm công chung áp dụng cho toàn hệ thống (singleton, ví dụ ngưỡng đi trễ/về sớm). |
| UC-AT-06 | Quản lý loại vi phạm & ghi nhận vi phạm | Vi phạm chấm công | Manager/Admin định nghĩa danh mục loại vi phạm (đi trễ, về sớm, vắng không phép...); xem và cập nhật (thay thế toàn bộ) danh sách vi phạm gắn với một bản ghi chấm công. |
| UC-AT-07 | Tự chấm công & xem lịch cá nhân | Tự phục vụ (Self-service) | Nhân viên (Waiter/Cashier/Manager/Admin) tự xem lịch làm việc + timesheet của chính mình, tự check-in và check-out cho ca được phân theo lịch. |

## 2. Module Cashbook (Sổ quỹ) — mã `UC-CB`

| Use Case ID | Use Case | Feature | Use Case Description |
|---|---|---|---|
| UC-CB-01 | Quản lý danh mục thu/chi | Danh mục sổ quỹ | Manager/Admin tạo, xem, cập nhật, xóa danh mục khoản thu/chi dùng để phân loại phiếu thu/phiếu chi. |
| UC-CB-02 | Lập phiếu thu/chi | Phiếu thu/chi | Manager/Admin tạo phiếu thu hoặc phiếu chi thủ công (đối tác, số tiền, quỹ tiền mặt/ngân hàng, danh mục, ghi chú...); hệ thống cũng tự động sinh phiếu từ các nghiệp vụ thanh toán hóa đơn và trả lương. |
| UC-CB-03 | Tra cứu & xuất danh sách phiếu | Phiếu thu/chi | Manager/Admin tìm kiếm, lọc phiếu theo nhiều tiêu chí (khoảng thời gian, quỹ, loại thu/chi, danh mục, người tạo, đối tác, trạng thái hủy...) có phân trang; hoặc xuất toàn bộ danh sách (không phân trang) phục vụ export dữ liệu. |
| UC-CB-04 | Hủy phiếu (void) | Phiếu thu/chi | Manager/Admin hủy một phiếu thu/chi đã lập (đánh dấu voided) thay vì xóa vĩnh viễn, đảm bảo vết kiểm toán. |
| UC-CB-05 | Xem tổng hợp thu/chi & tồn quỹ | Báo cáo sổ quỹ | Manager/Admin xem tổng số tiền thu, chi và tồn quỹ theo từng quỹ (tiền mặt/ngân hàng) trong một khoảng thời gian. |
| UC-CB-06 | Thiết lập số dư đầu kỳ | Số dư đầu kỳ | Manager/Admin xem và cập nhật số dư đầu kỳ (opening balance) cho từng quỹ tiền mặt/ngân hàng. |

## 3. Module Employee (Nhân viên) — mã `UC-EMP`

| Use Case ID | Use Case | Feature | Use Case Description |
|---|---|---|---|
| UC-EMP-01 | Tra cứu danh sách & chi tiết nhân viên | Hồ sơ nhân viên | Manager/Admin tìm kiếm, lọc danh sách nhân viên theo mã, tên, số điện thoại, trạng thái (có phân trang); xem chi tiết hồ sơ một nhân viên. |
| UC-EMP-02 | Tạo & cập nhật hồ sơ nhân viên | Hồ sơ nhân viên | Manager/Admin thêm mới nhân viên và cập nhật thông tin hồ sơ (tên, số điện thoại, email, ngày sinh, giới tính, địa chỉ, số CMND/CCCD, mã chấm công, ghi chú, ngày vào làm...). |
| UC-EMP-03 | Vô hiệu hóa nhân viên | Hồ sơ nhân viên | Manager/Admin ngừng hoạt động (deactivate) một nhân viên đã nghỉ việc. |
| UC-EMP-04 | Thiết lập lương cho nhân viên | Thiết lập lương nhân viên | Manager/Admin xem và cập nhật cấu hình lương riêng của từng nhân viên (mẫu lương áp dụng, mức lương cơ bản...). |
| UC-EMP-05 | Xuất/nhập danh sách nhân viên qua CSV | Xuất/nhập dữ liệu | Manager/Admin xuất danh sách nhân viên ra file CSV theo bộ lọc hoặc danh sách ID chọn sẵn; nhập danh sách nhân viên hàng loạt từ file CSV theo chiến lược nhập (import strategy) đã chọn. |
| UC-EMP-06 | Tải ảnh đại diện nhân viên | Hồ sơ nhân viên | Manager/Admin tải lên và cập nhật ảnh đại diện (avatar) cho một nhân viên. |
| UC-EMP-07 | Tự quản lý hồ sơ cá nhân | Tự phục vụ (Self-service) | Nhân viên (Waiter/Cashier/Manager/Admin) tự xem và tự cập nhật hồ sơ cá nhân của chính mình ("Hồ sơ của tôi"). |

## 4. Module Payroll (Tính lương) — mã `UC-PAY`

| Use Case ID | Use Case | Feature | Use Case Description |
|---|---|---|---|
| UC-PAY-01 | Quản lý mẫu lương (Salary Template) | Mẫu lương | Manager/Admin tạo, xem danh sách, cập nhật, xóa mẫu công thức tính lương (dạng rates JSON) để áp dụng cho nhân viên. |
| UC-PAY-02 | Thiết lập cấu hình tính lương | Cấu hình lương | Manager/Admin xem và cập nhật cấu hình tính lương chung áp dụng toàn hệ thống (singleton, ví dụ kỳ lương, công thức tăng ca OT). |
| UC-PAY-03 | Quản lý lịch nghỉ lễ/Tết | Ngày lễ tính lương | Manager/Admin khai báo, cập nhật, xóa danh sách ngày lễ/Tết dùng để phân loại mức lương ngày lễ khi tính bảng lương (BR-PAY-04). |
| UC-PAY-04 | Tạo & tra cứu bảng lương | Bảng lương | Manager/Admin tạo bảng lương mới cho một kỳ lương, tìm kiếm/lọc danh sách bảng lương theo từ khóa, kỳ lương, trạng thái (có phân trang); xem chi tiết một bảng lương. |
| UC-PAY-05 | Soạn thảo & tính lại phiếu lương | Bảng lương | Manager/Admin xem danh sách phiếu lương (payslip) trong một bảng lương, lưu bản nháp chỉnh sửa (draft), tải lại/tính lại dữ liệu chấm công vào bảng lương theo chế độ (mode) chọn trước. |
| UC-PAY-06 | Chốt & hủy bảng lương | Bảng lương | Manager/Admin chốt (finalize) bảng lương để khóa số liệu thành snapshot bất biến, hoặc hủy một bảng lương đang ở trạng thái nháp. |
| UC-PAY-07 | Thanh toán lương | Thanh toán lương | Manager/Admin ghi nhận một hoặc nhiều khoản thanh toán lương cho một bảng lương đã chốt, xem lại lịch sử thanh toán của bảng lương đó. |
| UC-PAY-08 | Xem & hủy phiếu lương | Phiếu lương | Manager/Admin xem chi tiết một phiếu lương, hủy một phiếu lương; xem toàn bộ lịch sử phiếu lương của một nhân viên cụ thể. |

## 5. Module Reporting (Báo cáo) — mã `UC-RPT`

| Use Case ID | Use Case | Feature | Use Case Description |
|---|---|---|---|
| UC-RPT-01 | Báo cáo cuối ngày bán hàng | Báo cáo cuối ngày | Manager/Admin xem báo cáo doanh thu bán hàng theo khoảng thời gian (một ngày hoặc tùy chọn), lọc theo nhân viên, phương thức thanh toán, khu vực, bàn. |
| UC-RPT-02 | Xem bảng điều khiển tổng quan kinh doanh | Bức tranh kinh doanh (Dashboard) | Manager/Admin xem tổng quan hoạt động kinh doanh (doanh thu, số đơn...) theo khoảng thời gian với độ chi tiết theo giờ (1 ngày) hoặc theo ngày (nhiều ngày). |
| UC-RPT-03 | Xem báo cáo tài chính (P&L) | Báo cáo tài chính | Manager/Admin xem báo cáo lãi lỗ theo tháng/quý/năm trong một năm cho trước, tổng hợp doanh thu, chi phí (lương dồn tích + sổ quỹ) và lợi nhuận. |
| UC-RPT-04 | Xem chi tiết dòng chi phí/thu nhập khác | Báo cáo tài chính | Manager/Admin xem chi tiết các dòng phụ "Chi phí"/"Thu nhập khác" trong báo cáo tài chính, được suy ra (read-only) từ danh mục Sổ quỹ; việc sửa số liệu gốc thực hiện tại module Cashbook. |
| UC-RPT-05 | Thiết lập cấu hình báo cáo | Cấu hình báo cáo | Manager/Admin xem và cập nhật cấu hình chung cho phân hệ báo cáo (singleton). |

## 6. Module Shift (Ca thu ngân / POS) — mã `UC-CS`

| Use Case ID | Use Case | Feature | Use Case Description |
|---|---|---|---|
| UC-CS-01 | Mở ca làm việc | Quản lý ca thu ngân | Cashier mở một ca làm việc mới, khai báo số tiền quỹ đầu ca (hệ thống gợi ý sẵn số quỹ dựa trên lần bàn giao ca gần nhất — BR-CS-09/11). |
| UC-CS-02 | Đóng ca làm việc | Quản lý ca thu ngân | Cashier đóng ca làm việc đang mở, đối chiếu số tiền mặt thực tế cuối ca với hệ thống. |
| UC-CS-03 | Ép đóng ca / Duyệt / Từ chối đóng ca | Quản lý ca thu ngân | Manager/Admin ép đóng (force-close) một ca còn mở hoặc quá hạn (BR-CS-15); duyệt (approve) hoặc từ chối (reject) một yêu cầu đóng ca đang ở trạng thái chờ xác nhận (PENDING_MANAGER_CONFIRM). |
| UC-CS-04 | Xem tổng kết ca | Báo cáo ca | Cashier/Manager xem tổng kết chi tiết của một ca (doanh thu, tiền mặt, giao dịch...); cashier xem ca đang mở của chính mình. |
| UC-CS-05 | Xem tổng hợp ca theo ngày & danh sách toàn bộ ca | Báo cáo ca | Manager/Admin xem tổng hợp các ca trong một ngày cụ thể; xem danh sách toàn bộ ca làm việc trong hệ thống (có phân trang). |
| UC-CS-06 | Thiết lập cấu hình "Kết ca" | Cấu hình ca | Manager/Admin cấu hình quy tắc kết ca (singleton); mọi nhân viên đã đăng nhập có thể xem cấu hình này để hiển thị đúng UI Mở ca/Đóng ca trên màn hình POS. |
