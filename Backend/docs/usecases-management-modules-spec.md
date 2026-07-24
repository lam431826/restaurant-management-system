# Use Case Specification — Attendance, Cashbook, Employee, Payroll, Reporting, Shift

> Định dạng theo template mẫu do người dùng cung cấp (UC-PM-08 Split Invoice, UC-PM-02 Apply Promotion Discount).
> Đây là bản gộp (22 use case) của danh sách chi tiết ban đầu (39 use case) — mỗi UC nhóm nhiều endpoint cùng một vòng đời nghiệp vụ. Nguồn: `Backend/src/main/java/com/rms/restaurant/module/{attendance,cashbook,employee,payroll,reporting,shift}`, đối chiếu tới tận service-layer (validation order, `ApplicationError`, thay đổi trạng thái).

## 1. Use Case List

| Use Case ID | Use Case | Module | Primary Actor(s) |
|---|---|---|---|
| UC-AT-01 | Quản lý ca & lịch làm việc | Attendance | Manager, Administrator |
| UC-AT-02 | Quản lý chấm công | Attendance | Manager, Administrator |
| UC-AT-03 | Thiết lập cấu hình & danh mục chấm công | Attendance | Manager, Administrator |
| UC-AT-04 | Tự chấm công & xem lịch cá nhân | Attendance | Waiter, Cashier, Manager, Administrator |
| UC-CB-01 | Quản lý danh mục thu/chi | Cashbook | Manager, Administrator |
| UC-CB-02 | Quản lý phiếu thu/chi | Cashbook | Manager, Administrator |
| UC-CB-03 | Báo cáo & số dư quỹ | Cashbook | Manager, Administrator |
| UC-EMP-01 | Quản lý hồ sơ nhân viên | Employee | Manager, Administrator |
| UC-EMP-02 | Thiết lập lương nhân viên | Employee | Manager, Administrator |
| UC-EMP-03 | Xuất/nhập danh sách nhân viên qua CSV | Employee | Manager, Administrator |
| UC-EMP-04 | Tự quản lý hồ sơ cá nhân | Employee | Waiter, Cashier, Manager, Administrator |
| UC-PAY-01 | Thiết lập cấu hình tính lương | Payroll | Manager, Administrator |
| UC-PAY-02 | Quản lý bảng lương | Payroll | Manager, Administrator |
| UC-PAY-03 | Thanh toán & quản lý phiếu lương | Payroll | Manager, Administrator |
| UC-RPT-01 | Báo cáo cuối ngày bán hàng | Reporting | Manager, Administrator |
| UC-RPT-02 | Xem bảng điều khiển tổng quan kinh doanh | Reporting | Manager, Administrator |
| UC-RPT-03 | Xem báo cáo tài chính (P&L) | Reporting | Manager, Administrator |
| UC-RPT-04 | Thiết lập cấu hình báo cáo | Reporting | Manager, Administrator |
| UC-CS-01 | Mở/đóng ca làm việc | Shift | Cashier |
| UC-CS-02 | Duyệt/Ép đóng ca | Shift | Manager, Administrator |
| UC-CS-03 | Báo cáo ca làm việc | Shift | Cashier, Manager, Administrator |
| UC-CS-04 | Thiết lập cấu hình "Kết ca" | Shift | Manager, Administrator (sửa); mọi nhân viên (xem) |

---

## 2. Use Case Specifications

## 2.1 Module Attendance

### 2.1.1 UC-AT-01 — Quản lý ca & lịch làm việc

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to define shift templates and assign them to employees on a schedule (with optional weekly repeat) so that staffing coverage is planned in advance. |
| Preconditions | - For a new shift template: no other shift template has the same name.<br>- For scheduling: the target shift template is ACTIVE and the target employee is ACTIVE.<br>- For a repeating schedule: at least one valid weekday (1–7) is selected.<br>- The employee's total pairwise shift-overlap on the work date (including the new shift) does not exceed 12 hours (720 minutes). |
| Postconditions | - A shift template is created/updated/deleted; deletion cascades its schedule rules and occurrences, but is blocked once any attendance record already references it.<br>- A one-off schedule creates exactly one occurrence; a repeating schedule creates one repeat rule and materializes one occurrence per matching weekday within a rolling 93-day window (a nightly job extends the window going forward, skipping employees who became inactive).<br>- Cancelling a rule stops future materialization from a given date and deletes only its future, not-yet-attended occurrences; already-attended occurrences are kept. |
| Normal Sequence/Flow | Step 1 - Manager creates or edits a shift template (name, start/end time).<br>Step 2 - Manager selects one or more employees and a shift template, picks a date, and optionally enables "repeat weekly" with weekdays and an end date.<br>Step 3 - The system validates the shift/employee are active and checks the daily overlap limit, then creates the occurrence (or the rule plus its first batch of occurrences).<br>Step 4 - Manager views schedules for a date range/employee, deletes a single occurrence, or cancels a repeat rule from a given date onward. |
| Alternative Sequences/Flows | A1 - Duplicate shift template name → rejected.<br>A2 - Inactive shift template or inactive employee selected → rejected.<br>A3 - The employee's overlap on that date would exceed 12 hours → rejected.<br>A4 - Deleting a shift template that already has attendance records → rejected (deactivate it instead).<br>A5 - Deleting an occurrence that already has an attendance record → rejected; cancelling a rule instead silently preserves already-attended occurrences and only removes future, un-attended ones. |

### 2.1.2 UC-AT-02 — Quản lý chấm công

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to view timesheets and manually record, bulk-mark, correct or delete attendance — including merged-shift punches and violations — so that payroll and reporting reflect actual attendance accurately. |
| Preconditions | - The target work schedule(s) exist.<br>- For a "present" mark, the recorded check-out time is after the check-in time.<br>- A substitute may only be assigned for a leave-type mark (not "present"), must be a different employee, and must be ACTIVE.<br>- A merged-shift punch requires the feature to be enabled, at least 2 schedules of the same employee/day, a break between consecutive shifts within the configured limit, and no more than the configured max shift count. |
| Postconditions | - An attendance record is created/updated per schedule with type, actual check-in/out (if present), computed worked/late/early-leave/overtime minutes; deleting a record also deletes its violations.<br>- Violations for a record are fully replaced (not merged) with the submitted list; each penalty is snapshotted from the violation type unless manually overridden. |
| Normal Sequence/Flow | Step 1 - Manager opens the timesheet for a date range and reviews per-employee/day cells and the period summary.<br>Step 2 - Manager selects one or more schedules and marks attendance type, optionally entering actual times, a substitute, or "merged punch" for consecutive shifts.<br>Step 3 - The system validates and computes attendance metrics, saving one record per schedule.<br>Step 4 - Manager opens a record's violation list and replaces it with the correct set of violation types/penalties.<br>Step 5 - Manager deletes an incorrect attendance record. |
| Alternative Sequences/Flows | A1 - Check-out time not after check-in time → rejected.<br>A2 - Substitute specified for a "present" mark, is the employee themself, or is inactive/not found → rejected.<br>A3 - Bulk substitute requested for more than one schedule at once → rejected.<br>A4 - Merged-shift punch attempted while disabled, with fewer than 2 shifts, mixed employees/days, exceeding the max shift count, or exceeding the max break gap → rejected.<br>A5 - Violation replacement references an unknown violation type → rejected. |

### 2.1.3 UC-AT-03 — Thiết lập cấu hình & danh mục chấm công

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to configure global attendance rules (grace periods, half-day thresholds, overtime thresholds, merged-shift limits) and maintain the violation-type catalog so that attendance is evaluated consistently. |
| Preconditions | - All submitted numeric thresholds are ≥ 0.<br>- If half-day counting is enabled, its minimum threshold is less than its maximum.<br>- If merged-shift punching is enabled, its max shift count is ≥ 2 and its max break is ≥ 0. |
| Postconditions | - The single attendance configuration is updated with the new thresholds/flags, used by all future attendance computation.<br>- A violation type is created/updated, or removed — removal is a soft-delete (hidden from the active catalog) if any historical violation already references it, otherwise a hard delete. |
| Normal Sequence/Flow | Step 1 - Manager opens attendance settings and edits grace/threshold/merged-shift values.<br>Step 2 - The system validates the values as a whole and saves the configuration.<br>Step 3 - Manager opens the violation-type catalog and adds, edits, or removes a type (name, penalty amount). |
| Alternative Sequences/Flows | A1 - Any threshold is negative, half-day min ≥ max, or merged-shift limits are inconsistent while enabled → the whole update is rejected.<br>A2 - Updating/deleting a violation type that doesn't exist → rejected.<br>A3 - Deleting a violation type already used in attendance history → it is hidden instead of removed, preserving historical totals. |

### 2.1.4 UC-AT-04 — Tự chấm công & xem lịch cá nhân

| Field | Nội dung |
|---|---|
| Primary Actors | Waiter; Cashier; Manager; Administrator (bất kỳ nhân viên nào, tự phục vụ) |
| Secondary Actors | None |
| Description | As an employee, I want to view my own work schedule/timesheet and check myself in and out of today's shift so that my attendance is recorded without needing a manager to do it for me. |
| Preconditions | - The caller has a linked employee record.<br>- Check-in: the target schedule belongs to the caller, its work date is today, and the caller has not already checked in.<br>- Check-out: the caller has already checked in and has not already checked out. |
| Postconditions | - Check-in creates/updates the caller's attendance record for that schedule with the current check-in time.<br>- Check-out updates the same record with the current check-out time, preserving the check-in time and any note. |
| Normal Sequence/Flow | Step 1 - Employee opens "Lịch làm việc" and views their own schedule and timesheet.<br>Step 2 - At the start of their shift, the employee taps Check-in on today's schedule.<br>Step 3 - At the end of the shift, the employee taps Check-out on the same schedule. |
| Alternative Sequences/Flows | A1 - The schedule does not belong to the caller, or does not exist → rejected (reported generically, not distinguished from "forbidden").<br>A2 - Check-in attempted on a schedule not dated today → rejected.<br>A3 - Check-in attempted twice for the same schedule → rejected.<br>A4 - Check-out attempted before any check-in, or attempted twice → rejected. |

## 2.2 Module Cashbook

### 2.2.1 UC-CB-01 — Quản lý danh mục thu/chi

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to create, edit and remove cashbook categories so that receipts and payments can be classified consistently. |
| Preconditions | - The category name is unique (case-insensitive) across all categories.<br>- For deletion: the category is not system-reserved, and is not referenced by any existing voucher (voided or not). |
| Postconditions | - A category is created/updated with its name and type (receipt/payment), or removed if no voucher references it. |
| Normal Sequence/Flow | Step 1 - Manager adds a new category (name, type) or edits an existing one.<br>Step 2 - The system checks name uniqueness and saves.<br>Step 3 - Manager deletes a category no longer needed.<br>Step 4 - The system checks it isn't system-reserved and isn't used by any voucher before deleting. |
| Alternative Sequences/Flows | A1 - Duplicate category name → rejected.<br>A2 - Attempt to delete a system-reserved category (used internally by automatic payroll/sales vouchers) → rejected regardless of usage.<br>A3 - Attempt to delete a category already used by at least one voucher → rejected. |

### 2.2.2 UC-CB-02 — Quản lý phiếu thu/chi

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | System (tự sinh phiếu từ Payroll/Payment) |
| Description | As a manager, I want to record, search/export and void cashbook vouchers so that all manual and system-generated cash movements are tracked. |
| Preconditions | - Manual voucher creation: the chosen category's type matches the voucher's declared type; the partner group is not CUSTOMER (reserved for system-generated vouchers), and if EMPLOYEE is chosen a partner must be specified.<br>- Void: the target voucher exists and is not already voided. |
| Postconditions | - A manual voucher is created with a generated code (receipt/payment sequence), attributed to the acting user; system-generated vouchers (from a salary payment or an order payment) are created automatically with their own category and are not subject to the manual partner-group restriction.<br>- Voiding a voucher flags it voided; the original amount/category are left unchanged (no reversing entry), and it is excluded from income/expense sums going forward. |
| Normal Sequence/Flow | Step 1 - Manager records a manual receipt or payment voucher (category, amount, fund, partner, note).<br>Step 2 - The system validates category-type match and partner-group rules, generates a voucher code, and saves.<br>Step 3 - Manager searches/filters vouchers (date range, fund, type, category, creator, partner, voided flag) or exports the full filtered list.<br>Step 4 - Manager voids an incorrect voucher.<br>Note - the Payroll and Payment modules automatically call the same voucher-creation logic whenever a salary payment or an order payment completes, bypassing manual-entry validation. |
| Alternative Sequences/Flows | A1 - Category type does not match the voucher's declared type → rejected.<br>A2 - Partner group is CUSTOMER on a manual voucher, or EMPLOYEE without a partner selected → rejected.<br>A3 - Voiding an already-voided voucher → rejected. |

### 2.2.3 UC-CB-03 — Báo cáo & số dư quỹ

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to view income/expense/balance totals for a fund and period, and set each fund's opening balance, so that I can track cash position. |
| Preconditions | - None beyond authentication for viewing the summary (read-only aggregation).<br>- Updating an opening balance has no additional business validation beyond the request shape. |
| Postconditions | - The summary returns opening + income − expense as a single aggregate for the requested fund/date range (income/expense exclude voided vouchers).<br>- Updating a fund's opening balance overwrites its single current value; since there is no per-period snapshot, every future summary query for any date range reflects the new value, not only going forward. |
| Normal Sequence/Flow | Step 1 - Manager opens the cashbook summary, optionally filtering by fund and date range.<br>Step 2 - The system computes opening balance plus income and expense totals within the range and returns the resulting balance.<br>Step 3 - Manager opens opening-balance settings and updates the starting amount for a fund (cash or bank). |
| Alternative Sequences/Flows | A1 - No fund selected → totals are aggregated across all funds combined instead of one.<br>A2 - Opening balance changed after reports have already been reviewed → past and future summary queries alike reflect the new value, since it is not versioned by period. |

## 2.3 Module Employee

### 2.3.1 UC-EMP-01 — Quản lý hồ sơ nhân viên

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to search, view, create, edit, deactivate and set an avatar for employee records so that staff information stays accurate and organized. |
| Preconditions | - A new/edited employee code (if manually supplied) and phone number are unique among employees.<br>- If a linked user account is specified, that user exists and is not already linked to another employee.<br>- If the employee has a linked user account and its name/phone/email are edited, the new phone/email are also unique among user accounts. |
| Postconditions | - A new employee is created (auto-generated code if none supplied) with status ACTIVE, or an existing employee's fields — including status — are updated; matching name/phone/email changes propagate to a linked user account.<br>- Deactivating an employee sets status = INACTIVE only — it does not touch a linked user account, does not cancel already-materialized future schedules, and does not check for an open shift; only future recurring-schedule generation stops for them.<br>- Uploading an avatar is a partial update affecting only the avatar field. |
| Normal Sequence/Flow | Step 1 - Manager searches/filters the employee list (code, name, phone, status) and opens a record.<br>Step 2 - Manager creates a new employee or edits an existing one.<br>Step 3 - The system validates code/phone uniqueness (and the user-account link, if any) and saves.<br>Step 4 - Manager uploads a new avatar image for the employee.<br>Step 5 - Manager deactivates an employee who has left. |
| Alternative Sequences/Flows | A1 - Duplicate employee code or phone → rejected.<br>A2 - Linked user id does not exist, or is already linked to a different employee → rejected.<br>A3 - Propagated name/phone/email conflicts with another user account → rejected.<br>A4 - Deactivating an employee does not automatically resolve their already-scheduled future shifts — these must be handled separately if needed. |

### 2.3.2 UC-EMP-02 — Thiết lập lương nhân viên

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to configure an individual employee's salary type, base wage and (optionally) an overtime formula so that their payroll is computed correctly. |
| Preconditions | - The employee exists. |
| Postconditions | - The employee's salary setting (type, base wage, advanced-rate formula, overtime enabled + rates, applied template name) is created if none existed, or updated otherwise; values are copied at apply-time, so later edits to a shared salary template never retroactively change an employee whose setting already applied it. |
| Normal Sequence/Flow | Step 1 - Manager opens an employee's salary-setting tab.<br>Step 2 - If none exists yet, the system shows a blank/default form; otherwise it shows the current setting.<br>Step 3 - Manager sets or edits the salary type, base wage, and overtime configuration (optionally starting from a salary template).<br>Step 4 - The system saves the setting for that employee. |
| Alternative Sequences/Flows | A1 - Employee does not exist → rejected.<br>A2 - Required fields (salary type, base wage) missing → rejected by basic input validation. |

### 2.3.3 UC-EMP-03 — Xuất/nhập danh sách nhân viên qua CSV

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to export the employee list to CSV and import a CSV of employees so that bulk data can be backed up or bulk-loaded. |
| Preconditions | - Import: a non-empty CSV file is supplied, with at most 500 data rows.<br>- Each import row: name and phone are present, phone matches the local mobile format, and (for new rows) the code and phone are not already used elsewhere in the database or earlier in the same file. |
| Postconditions | - Export produces a CSV of the filtered/selected employees.<br>- Import with "dừng khi lỗi": if any row fails validation, nothing at all is persisted, and every error is reported.<br>- Import with "bỏ qua & tiếp tục": all valid rows are created/updated (matching an existing code updates that employee; otherwise a new employee is created with an auto-generated code), while invalid rows are skipped and reported individually. |
| Normal Sequence/Flow | Step 1 - Manager exports the current (filtered or selected) employee list to CSV.<br>Step 2 - Manager prepares a CSV of new/updated employees and chooses an import strategy.<br>Step 3 - Manager uploads the file; the system parses and validates every row.<br>Step 4 - Depending on the chosen strategy, the system persists nothing (if any row failed, under "dừng khi lỗi") or persists all valid rows and reports the skipped ones (under "bỏ qua & tiếp tục"). |
| Alternative Sequences/Flows | A1 - File missing/empty, or unreadable → rejected outright.<br>A2 - More than 500 rows in the file → rejected outright, before any row is processed.<br>A3 - Individual row errors (missing name/phone, invalid phone format, duplicate code/phone within the file or against existing data, invalid status value) → collected as per-row errors; whether they block the whole import depends on the chosen strategy. |

### 2.3.4 UC-EMP-04 — Tự quản lý hồ sơ cá nhân

| Field | Nội dung |
|---|---|
| Primary Actors | Waiter; Cashier; Manager; Administrator (bất kỳ nhân viên nào, tự phục vụ) |
| Secondary Actors | None |
| Description | As an employee, I want to view and update my own profile information so that my contact details stay current without needing a manager to edit them for me. |
| Preconditions | - The caller is authenticated; if no employee record is linked yet, one is created on first save.<br>- The submitted phone (and email, if given) is not already used by another employee or user account. |
| Postconditions | - The caller's user account name/phone/email are synced; on first save, a new employee record is created and linked to the caller (auto-generated code, status ACTIVE); on later saves, the existing linked employee's editable fields are updated.<br>- Locked fields (employee code, status, timekeeping code, avatar, user link) are never changed through this flow. |
| Normal Sequence/Flow | Step 1 - Employee opens "Hồ sơ của tôi".<br>Step 2 - If no employee record is linked yet, the system shows a profile form prefilled from the account's basic info; otherwise it shows the existing profile.<br>Step 3 - Employee edits allowed fields (name, phone, email, start date, note, ID number, birthday, gender, address) and saves.<br>Step 4 - The system validates uniqueness, creates the employee record on first save or updates it otherwise, and syncs the linked user account's basic info. |
| Alternative Sequences/Flows | A1 - Submitted phone/email already used by another account → rejected.<br>A2 - Two concurrent first-time saves race to create the employee record → the second is rejected as already-linked rather than creating a duplicate. |

## 2.4 Module Payroll

### 2.4.1 UC-PAY-01 — Thiết lập cấu hình tính lương

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to maintain salary templates, global payroll settings and the holiday calendar so that payroll sheets are computed with the correct rates and rules. |
| Preconditions | - A salary template's name is unique.<br>- The payroll cutoff day is between 1 and 28.<br>- A holiday's date is not already in the holiday calendar. |
| Postconditions | - A salary template (rate formulas for weekend/Sunday/holiday/overtime) is created/updated/deleted; deleting or editing a template never retroactively changes employees who already applied it.<br>- The single payroll configuration (cutoff day, auto-create/auto-update/personal-income-tax flags) is updated.<br>- A holiday date is added/updated/removed from the calendar; already-computed payroll sheets are not retroactively recalculated when holidays change. |
| Normal Sequence/Flow | Step 1 - Manager creates/edits/removes salary templates (rate formulas per day type).<br>Step 2 - Manager edits the global payroll configuration (cutoff day, flags).<br>Step 3 - Manager adds/edits/removes holiday dates used to classify holiday-rate pay. |
| Alternative Sequences/Flows | A1 - Duplicate salary-template name → rejected.<br>A2 - Payroll cutoff day outside 1–28 → rejected.<br>A3 - Duplicate holiday date → rejected. |

### 2.4.2 UC-PAY-02 — Quản lý bảng lương

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to create a payroll sheet for a period and set of employees, review and adjust each employee's computed payslip, recompute it from attendance, and finalize or cancel the sheet so that payroll for a period is prepared and locked in. |
| Preconditions | - Period start is not after period end; for a monthly sheet, the period must be exactly one full calendar month.<br>- If scope is a custom employee subset, at least one valid employee id is given.<br>- Saving a draft row or reloading requires the sheet to still be in DRAFT (reload also allows the brief GENERATING state); each payslip touched must be ACTIVE.<br>- Finalizing or cancelling the whole sheet requires it to be in DRAFT status. |
| Postconditions | - Sheet creation synchronously computes one payslip per selected employee (main/OT salary from attendance + salary setting, initial deduction = attendance-violation total), leaving the sheet in DRAFT.<br>- Saving a draft row overrides only the submitted fields (main/OT/deduction), flagging each as manually overridden.<br>- Reloading recomputes main/OT/shift-count/worked-minutes and clears their overridden flags in both modes; a full reload additionally resets deduction to the recomputed violation total, while a "by workday" reload leaves a manually-edited deduction untouched.<br>- Finalizing locks the sheet (status = FINALIZED); it can no longer be saved-as-draft, reloaded, or cancelled as a whole afterward.<br>- Cancelling a DRAFT sheet sets it to CANCELLED without touching its payslips. |
| Normal Sequence/Flow | Step 1 - Manager creates a payroll sheet for a period and employee scope.<br>Step 2 - The system computes an initial payslip per employee from attendance and salary settings.<br>Step 3 - Manager reviews payslips and manually adjusts main/OT/deduction on specific rows (saved as a draft).<br>Step 4 - Manager reloads the sheet from attendance ("full" or "by workday") if attendance data changed after creation.<br>Step 5 - Manager finalizes the sheet once satisfied, locking it for payment. |
| Alternative Sequences/Flows | A1 - Invalid period (start after end, or a non-full-month range for a monthly sheet) → rejected.<br>A2 - Custom scope with no valid employees → rejected.<br>A3 - Draft edit/reload attempted on a sheet not in an editable state → rejected.<br>A4 - Manager cancels the sheet instead of finalizing (only possible while still DRAFT) → the sheet is discarded without affecting individual payslip records. |

### 2.4.3 UC-PAY-03 — Thanh toán & quản lý phiếu lương

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | System (tự sinh phiếu chi sổ quỹ) |
| Description | As a manager, I want to record salary payments against a finalized sheet's payslips, and view or cancel individual payslips, so that employees are paid and payroll records stay accurate. |
| Preconditions | - The payroll sheet is FINALIZED.<br>- Each targeted payslip is ACTIVE, and the payment amount is positive and does not exceed that payslip's remaining unpaid amount.<br>- Cancelling a payslip requires it to have zero payments recorded so far. |
| Postconditions | - Each payment auto-creates a cashbook voucher and increases the payslip's paid amount; the payslip's payment status becomes PAID once fully covered, otherwise PARTIAL; the parent sheet's status is rolled up from all its active payslips.<br>- Cancelling an eligible payslip sets it to CANCELLED and excludes it from the sheet's roll-up; no voucher is created or reversed since a cancellable payslip has no payment history. |
| Normal Sequence/Flow | Step 1 - Manager opens a finalized payroll sheet and selects one or more payslips to pay, entering an amount (full or partial) and method per payslip.<br>Step 2 - The system validates the sheet is finalized and each amount is valid, records each payment, updates payslip status, and auto-generates the corresponding cashbook voucher.<br>Step 3 - The system recomputes the sheet's overall payment status.<br>Step 4 - Manager views an individual payslip's detail or its full payment history at any time.<br>Step 5 - Manager cancels a payslip that turns out to be wrong, as long as it has never been paid. |
| Alternative Sequences/Flows | A1 - Sheet not yet finalized → payment rejected.<br>A2 - Payment amount is non-positive, or exceeds the payslip's remaining balance → rejected.<br>A3 - Targeted payslip is already cancelled → rejected.<br>A4 - Attempt to cancel a payslip that already has any payment (even partial) → rejected. |

## 2.5 Module Reporting

### 2.5.1 UC-RPT-01 — Báo cáo cuối ngày bán hàng

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to view a detailed sales report for a chosen date/time window, filtered by staff, payment method, area or table, so that I can review a day's (or any period's) sales activity. |
| Preconditions | - A from/to datetime range is supplied. |
| Postconditions | - No state change — a read-only list of paid-invoice rows within the window, with the requested filters applied, is returned; the window is bucketed by when each invoice was created, regardless of whether the underlying order is still open or already closed. |
| Normal Sequence/Flow | Step 1 - Manager selects a date or custom time range for the end-of-day report, and optionally a staff/payment-method/area/table filter.<br>Step 2 - The system retrieves every paid invoice created within the window, joins order/cashier/table/item/payment data, and applies the requested filters.<br>Step 3 - The system returns the resulting sales rows for the manager to review. |
| Alternative Sequences/Flows | A1 - The chosen range contains no paid invoices → an empty list is returned, not an error.<br>A2 - "From" is after "to" → no rows match; the report returns empty rather than raising a validation error. |

### 2.5.2 UC-RPT-02 — Xem bảng điều khiển tổng quan kinh doanh

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want a dashboard overview of revenue, payment-method breakdown and top-selling items for a period so that I can quickly gauge business performance. |
| Preconditions | - A from/to datetime range and a granularity (hour or day) are supplied. |
| Postconditions | - No state change — revenue KPIs, a continuous revenue time series bucketed by the chosen granularity, a payment-method breakdown, and the top 5 items by revenue are returned, all anchored to when each payment actually settled. |
| Normal Sequence/Flow | Step 1 - Manager opens the dashboard and selects a date/time range and a bucket granularity.<br>Step 2 - The system aggregates settled payments within the window into revenue totals, a time series, a payment-method breakdown and top items.<br>Step 3 - The system returns the dashboard snapshot. |
| Alternative Sequences/Flows | A1 - No settled payments in the window → all totals are zero and the series shows zero-filled buckets rather than an error. |

### 2.5.3 UC-RPT-03 — Xem báo cáo tài chính (P&L)

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to view a profit-and-loss report for a year, broken down by month/quarter/year, combining sales revenue, cost of goods sold, accrued payroll expense and manually-tracked cashbook categories, so that I can assess overall profitability. |
| Preconditions | - A year and a granularity (month/quarter/year) are supplied. |
| Postconditions | - No state change — one P&L row per requested period (net revenue, COGS, gross profit, payroll + category expenses, operating profit, other income, net profit) is returned, most-recent period first; supporting "chi phí"/"thu nhập khác" category lines are also available read-only (edited only via the Cashbook module). |
| Normal Sequence/Flow | Step 1 - Manager selects a year and a period granularity for the financial report.<br>Step 2 - The system aggregates paid-invoice revenue and cost of goods sold, finalized payroll sheets' payslip totals (attributed to the month each sheet's period ends in), and manually-tracked cashbook category totals (excluding system-generated vouchers, to avoid double-counting).<br>Step 3 - The system computes and returns each period's P&L line, plus the underlying category breakdown. |
| Alternative Sequences/Flows | A1 - Requested year is in the future → an empty report is returned instead of an error.<br>A2 - A payroll sheet uses a custom (non-monthly) period → its cost is attributed entirely to the month its period ends in, without proration across months. |

### 2.5.4 UC-RPT-04 — Thiết lập cấu hình báo cáo

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to configure report-related settings (a custom revenue-window toggle and cutoff time) so that reporting can be tailored to the restaurant's business-day boundaries. |
| Preconditions | - None beyond authentication; the setting row always exists (seeded). |
| Postconditions | - The single report configuration is updated with the submitted toggle and cutoff time. |
| Normal Sequence/Flow | Step 1 - Manager opens report settings and toggles the custom revenue-window option and/or edits the cutoff time.<br>Step 2 - The system saves the updated configuration. |
| Alternative Sequences/Flows | A1 - The configuration row is missing (should never happen post-setup) → a system error is raised.<br>**Ghi chú:** hiện tại thiết lập này được lưu nhưng chưa được Báo cáo cuối ngày/Dashboard/Báo cáo tài chính đọc lại — cả ba đều bucket theo đúng khoảng from/to do người dùng truyền vào, chưa áp dụng cutoff này. Cần rà soát nếu có kế hoạch nối logic. |

## 2.6 Module Shift

### 2.6.1 UC-CS-01 — Mở/đóng ca làm việc

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier |
| Secondary Actors | None |
| Description | As a cashier, I want to open a cash shift with a starting float and later close it by counting my actual cash so that my POS session is properly bounded and reconciled. |
| Preconditions | - Open: the cashier has no other OPEN shift.<br>- Close: the shift is OPEN, the caller is its owner or a manager/admin, and there are no active (unpaid) orders outstanding; the entered handover amount does not exceed the counted actual cash. |
| Postconditions | - Opening creates a new OPEN shift with the given opening cash and a business date derived from the configured cutoff time.<br>- Closing computes revenue and cash/online variance per payment method, requires a note if the cash variance exceeds the configured tolerance, and moves the shift to CLOSED (or PENDING_MANAGER_CONFIRM/PENDING_RECON depending on settings), recording closing cash, handover amount and variance. |
| Normal Sequence/Flow | Step 1 - Cashier opens a new shift, entering the opening cash amount (pre-filled with a suggestion based on their last handover).<br>Step 2 - Cashier works the shift, processing orders and payments.<br>Step 3 - At end of shift, cashier initiates "Đóng ca", counts the actual cash on hand, and enters the handover amount and any card-batch total.<br>Step 4 - The system reconciles cash vs. expected, validates there are no unfinished orders, and closes (or routes to manager confirmation) the shift. |
| Alternative Sequences/Flows | A1 - Cashier already has an open shift → opening rejected.<br>A2 - Unfinished orders exist at close time → closing rejected until they are resolved.<br>A3 - Cash variance exceeds tolerance and no closing note is provided → rejected.<br>A4 - Handover amount exceeds actual counted cash → rejected.<br>A5 - "Manager must confirm closing" setting is enabled → the shift is routed to PENDING_MANAGER_CONFIRM instead of closing immediately (see UC-CS-02). |

### 2.6.2 UC-CS-02 — Duyệt/Ép đóng ca

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator |
| Secondary Actors | None |
| Description | As a manager, I want to force-close a stale or abandoned open shift, and approve or reject a cashier's close request awaiting confirmation, so that shifts are always properly resolved. |
| Preconditions | - Force-close: the shift is OPEN or already flagged STALE (left open past the end of its business day).<br>- Approve/Reject: the shift is currently in PENDING_MANAGER_CONFIRM. |
| Postconditions | - Force-close reconciles cash the same way a normal close would, keeps the original cashier as accountable owner while recording the manager as who closed it, and always ends in FORCE_CLOSED.<br>- Approve moves the shift to CLOSED (or PENDING_RECON if settlement matching applies).<br>- Reject reopens the shift to OPEN, clearing its close-time data and recording the manager's reason, so the cashier can fix and resubmit. |
| Normal Sequence/Flow | Step 1 - Manager reviews shifts flagged STALE or sitting in PENDING_MANAGER_CONFIRM.<br>Step 2 - For a stale shift, manager force-closes it after a physical cash count.<br>Step 3 - For a pending-confirmation shift, manager reviews the handover sheet and approves or rejects it.<br>Step 4 - On rejection, the cashier sees the shift reopened with the manager's reason and can correct and resubmit the close. |
| Alternative Sequences/Flows | A1 - Force-close attempted on a shift that is not OPEN/STALE → rejected.<br>A2 - Approve/reject attempted on a shift not in PENDING_MANAGER_CONFIRM → rejected. |

### 2.6.3 UC-CS-03 — Báo cáo ca làm việc

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Manager; Administrator |
| Secondary Actors | None |
| Description | As a cashier or manager, I want to view a shift's detailed summary, a day's aggregated cashier performance, or the full list of all shifts, so that cash handling can be reviewed and audited. |
| Preconditions | - Viewing a specific shift's summary: caller is its owner or a manager/admin.<br>- Daily summary and full shift list: caller is a manager/admin. |
| Postconditions | - No state change (read-only), except that viewing an OPEN shift past its business-day cutoff automatically flags it STALE as a side effect of the read. |
| Normal Sequence/Flow | Step 1 - Cashier views their own current or a specific past shift's summary.<br>Step 2 - Manager views the same for any shift, or requests a daily summary aggregating every cashier's shifts for a chosen business date.<br>Step 3 - Manager browses the full, paginated list of all shifts in the system. |
| Alternative Sequences/Flows | A1 - A non-owner, non-manager attempts to view someone else's shift summary → rejected.<br>A2 - The requested shift has no reconciliation rows yet (still open) → provisional (expected-only) figures are shown instead.<br>A3 - The requested business day includes shifts still open/pending → the daily summary is flagged incomplete. |

### 2.6.4 UC-CS-04 — Thiết lập cấu hình "Kết ca"

| Field | Nội dung |
|---|---|
| Primary Actors | Manager; Administrator (sửa); mọi nhân viên đã đăng nhập (xem) |
| Secondary Actors | None |
| Description | As a manager, I want to configure shift-closing rules (such as whether a manager must confirm every close) so that cash-handling policy is enforced consistently at the POS. |
| Preconditions | - None beyond authentication (the setting row always exists); only manager/admin may change it. |
| Postconditions | - The single shift-closing configuration is updated; every staff member's POS screen reads this setting to decide how to present its Mở ca/Đóng ca UI and whether a close requires manager confirmation. |
| Normal Sequence/Flow | Step 1 - Any logged-in staff member's POS screen fetches the current "Kết ca" configuration on load.<br>Step 2 - Manager opens shift settings and edits the closing policy.<br>Step 3 - The system saves the updated configuration; subsequent shift closes follow the new rule. |
| Alternative Sequences/Flows | A1 - A non-manager attempts to update the setting → rejected (read-only for them). |
