# Restaurant Management System — Shift Management

> Use Case Specifications and Business Rules for the **Shift Management** module.
> The module is modeled as **two separate layers** that must not be conflated:
> - **Work Shift (Staff Rostering)** — *who is scheduled to work, and attendance.*
> - **Cash Shift (POS Session)** — *one shift per cashier, opened independently, reconciled individually.*

---

## 1. Conceptual Model

| Aspect | Work Shift (Rostering) | Cash Shift (POS Session) |
|--------|------------------------|--------------------------|
| Nature | HR / scheduling | Financial / operational |
| Answers | *Who works, when?* | *What money moved through this cashier's hands?* |
| Cardinality | Many staff on the same schedule; many-to-many via assignment | **One OPEN shift per cashier** at a time; multiple cashiers can have OPEN shifts simultaneously |
| Owner | Manager (creates), Staff (works) | Each Cashier (opens and closes their own) |
| Lifecycle | `SCHEDULED → CHECKED_IN → CHECKED_OUT` (or `NO_SHOW`) | `OPEN → CLOSED` (optionally `PENDING_RECON` for deferred non-cash) |
| Tracks | Assignment, attendance, worked hours, labor cost | Opening float, handover float, cash in/out, sales by payment method, discrepancy per method |

**Relationship.** A Cash Shift belongs to a single cashier and runs within the time frame of their Work Shift. The two lifecycles are independent — neither forces the other. The link is the `cashier_id` on the Cash Shift record.

**Cardinality (1-to-N).** A single Work Shift may contain **multiple Cash Shifts** for the same cashier (e.g., mid-shift reconciliation, till/counter change, break, cash deposit threshold). At any instant a cashier has **at most one OPEN** Cash Shift (BR-CS-01). The common case is 1 Work Shift : 1 Cash Shift; multiple is *allowed*, not required. A Cash Shift can never span across different cashiers' work shifts — changing cashier means closing the current shift and opening a new one (handover).

```
Work Shift  1 ──── N  Cash Shift   (same cashier; ≥1 cash shift per work shift, max 1 OPEN at a time)
Cashier     1 ──── N  Cash Shift   (one person, many shifts over time, only 1 OPEN per instant)
Cash Shift  1 ──── N  Payment      (each payment belongs to exactly one cash shift)
```

**Bàn giao giữa ca.** Khi Thu ngân A kết thúc và Thu ngân B bắt đầu, A đếm thực tế và nhập số tiền bàn giao. Con số đó trở thành opening float của ca B, đồng thời là căn cứ tính discrepancy của ca A. Két vật lý chỉ có một, nhưng trách nhiệm tài chính được tách rõ theo từng ca.

---

## 2. Actors

| ID | Actor | Role in this module |
|----|-------|---------------------|
| AC-02 | Waiter | Views own schedule, clocks in/out, requests swap/leave |
| AC-03 | Cashier | All of the above **plus** opens/closes their own cash shift, records cash movements, performs handover |
| AC-04 | Kitchen Staff | Views own schedule, clocks in/out |
| AC-05 | Manager | Defines shift templates, builds schedule, assigns staff, approves swaps/leave, views labor & daily summary reports |
| AC-07 | System | Sends reminders, auto-flags late/no-show, enforces per-cashier open-shift constraint |

---

## 3. Use Case List

### 3.1 Work Shift (Rostering) — `WS`

| ID | Use Case | Primary Actor |
|----|----------|---------------|
| WS-01 | Define Shift Template | Manager |
| WS-02 | Create / Publish Schedule | Manager |
| WS-03 | Assign Staff to Shift | Manager |
| WS-04 | View My Schedule | Staff |
| WS-05 | Request Shift Swap / Leave | Staff |
| WS-06 | Approve / Reject Swap / Leave | Manager |
| WS-07 | Clock In | Staff |
| WS-08 | Clock Out | Staff |
| WS-09 | View Attendance / Labor Report | Manager |

### 3.2 Cash Shift (POS Session) — `CS`

| ID | Use Case | Primary Actor |
|----|----------|---------------|
| CS-01 | Open Cash Shift | Cashier |
| CS-02 | Record Cash In / Out | Cashier |
| CS-03 | View Current Shift Summary | Cashier / Manager |
| CS-04 | Close Cash Shift & Handover | Cashier |
| CS-05 | View Daily Summary | Manager |
| CS-06 | View Shift History / Report | Manager |

---

## 4. Use Case Specifications

> In Alternative Flows: `A#` = alternative *successful* path, `E#` = *error/exception*.

### 4.1 Work Shift

#### WS-01 — Define Shift Template
**Primary Actor** Manager (AC-05) · **Secondary** System (AC-07)
**Description** As a manager, I want to define reusable shift templates (name, start/end time, break, headcount) so I can build schedules quickly.
**Preconditions** Manager is authenticated.
**Postconditions** A shift template is stored and available for scheduling.

| # | Actor | System |
|---|-------|--------|
| 1 | Opens template management, clicks *New Template*. | Displays the template form. |
| 2 | Enters name, start/end time, break minutes, target headcount per role. | Validates that end time > start time and break < shift length. |
| 3 | Saves. | Persists the template, confirms. |

**Alternative Flows**
- **E1 (Step 2):** Invalid time range → block save, highlight the field.
- **E2 (Step 2):** Duplicate template name → prompt for a different name.

---

#### WS-02 — Create / Publish Schedule
**Primary Actor** Manager · **Secondary** System
**Description** As a manager, I want to build a schedule for a date range from templates and publish it so staff can see their assigned shifts.
**Preconditions** At least one shift template exists.
**Postconditions** A schedule is created; on publish, staff are notified.

| # | Actor | System |
|---|-------|--------|
| 1 | Selects a date range and creates a draft schedule. | Creates the schedule in `DRAFT` status. |
| 2 | Adds shift instances per day from templates (UC WS-03 to assign staff). | Shows the schedule grid with coverage gaps highlighted. |
| 3 | Clicks *Publish*. | Validates coverage, sets status to `PUBLISHED`, notifies assigned staff. |

**Alternative Flows**
- **A1 (Step 3):** Manager republishes after edits → system versions the schedule and re-notifies only affected staff.
- **E1 (Step 3):** Required role left uncovered → system warns; manager may publish anyway with an acknowledgment.

---

#### WS-03 — Assign Staff to Shift
**Primary Actor** Manager · **Secondary** System
**Description** As a manager, I want to assign a staff member to a shift instance so the roster is complete.
**Preconditions** A draft shift instance exists.
**Postconditions** Staff is assigned; an attendance record is created in `SCHEDULED`.

| # | Actor | System |
|---|-------|--------|
| 1 | Selects a shift instance and a staff member. | Checks the staff member is not already assigned to an overlapping shift. |
| 2 | Confirms assignment. | Creates assignment + `SCHEDULED` attendance record. |

**Alternative Flows**
- **E1 (Step 1):** Overlapping assignment → block, show the conflicting shift.
- **E2 (Step 1):** Minimum-rest rule violated (see BR-WS-05) → block with reason.

---

#### WS-04 — View My Schedule
**Primary Actor** Staff (AC-02/03/04)
**Description** As a staff member, I want to view my upcoming shifts so I know when to work.
**Preconditions** Staff is authenticated; schedule is published.
**Postconditions** None (read-only).
*Simple view UC → see FR-WS-04. Returns only the requesting user's own published shifts.*

---

#### WS-05 — Request Shift Swap / Leave
**Primary Actor** Staff · **Secondary** Manager, System
**Description** As a staff member, I want to request a swap with a colleague or request leave for a shift so I can handle conflicts.
**Preconditions** Staff has a published `SCHEDULED` shift in the future.
**Postconditions** A request in `PENDING` is created and routed to the manager.

| # | Actor | System |
|---|-------|--------|
| 1 | Selects a shift, chooses *Swap* (picks colleague) or *Leave* (gives reason). | Validates the shift is in the future and not already requested. |
| 2 | Submits. | Creates `PENDING` request, notifies manager (and target colleague if swap). |

**Alternative Flows**
- **E1 (Step 1):** Shift starts within the freeze window (BR-WS-06) → block, advise contacting manager directly.

---

#### WS-06 — Approve / Reject Swap / Leave
**Primary Actor** Manager · **Secondary** Staff, System
**Description** As a manager, I want to approve or reject swap/leave requests so the roster stays valid.
**Preconditions** A `PENDING` request exists.
**Postconditions** Request resolved; roster updated on approval; requester notified.

| # | Actor | System |
|---|-------|--------|
| 1 | Opens pending requests, reviews details and coverage impact. | Shows the request and resulting coverage. |
| 2 | Approves or rejects (with optional note). | On approve: reassigns shift (swap) or marks `LEAVE`, updates attendance, notifies parties. On reject: keeps original, notifies requester. |

**Alternative Flows**
- **E1 (Step 2):** Approving a swap would double-book the target → block, show conflict.

---

#### WS-07 — Clock In
**Primary Actor** Staff · **Secondary** System
**Description** As a staff member, I want to clock in at the start of my shift so my attendance and worked hours are recorded.
**Preconditions** Staff has a `SCHEDULED` shift starting near the current time.
**Postconditions** Attendance moves to `CHECKED_IN` with a timestamp.

| # | Actor | System |
|---|-------|--------|
| 1 | Clicks *Clock In*. | Checks current time is within the allowed window around shift start (BR-WS-07). |
| 2 | — | Records check-in time, sets `CHECKED_IN`, flags `LATE` if past the grace period. |

**Alternative Flows**
- **A1 (Step 1):** Early clock-in inside the window → allowed; worked hours counted from shift start, not early time (BR-WS-08).
- **E1 (Step 1):** Outside the allowed window → block, advise manager override.

---

#### WS-08 — Clock Out
**Primary Actor** Staff · **Secondary** System
**Description** As a staff member, I want to clock out at the end of my shift so my worked hours are finalized.
**Preconditions** Attendance is `CHECKED_IN`.
**Postconditions** Attendance moves to `CHECKED_OUT`; worked hours computed.

| # | Actor | System |
|---|-------|--------|
| 1 | Clicks *Clock Out*. | Checks the cashier has no OPEN cash shift; if early, requires a reason. Records check-out time, computes worked hours (BR-WS-08/11), sets `CHECKED_OUT` (flags `EARLY_LEAVE` if before scheduled end). |

**Alternative Flows**
- **A1 (Step 1):** Clock-out before scheduled end → require reason (`LEAVE_APPROVED` / `LEAVE_UNAPPROVED` / `INCIDENT`), flag `EARLY_LEAVE` (BR-WS-11).
- **E1 (Step 1):** Cashier still has an OPEN cash shift → **block**; must close/hand over first (BR-X-02).
- **E2 (Step 1):** No matching `CHECKED_IN` record → block.

---

#### WS-09 — View Attendance / Labor Report
**Primary Actor** Manager
**Description** As a manager, I want attendance and labor-hour reports per period so I can monitor staffing and cost.
*View UC → see FR-WS-09. Aggregates from attendance records (worked hours, late count, no-shows). Labor cost is derived here, never from the cash shift.*

---

### 4.2 Cash Shift

#### CS-01 — Open Cash Shift
**Primary Actor** Cashier (AC-03) · **Secondary** System
**Description** As a cashier, I want to open my own cash shift with an opening float so my sales can be tracked and later reconciled separately from other cashiers.
**Preconditions** Cashier is authenticated and `CHECKED_IN` on a work shift (BR-X-01); cashier has **no** OPEN cash shift of their own.
**Postconditions** A cash shift in `OPEN` is created for this cashier with the opening float recorded.

| # | Actor | System |
|---|-------|--------|
| 1 | Clicks *Open Shift*, enters opening cash float. | Verifies this cashier has no existing OPEN shift (BR-CS-01). |
| 2 | Confirms. | Creates `OPEN` shift linked to `cashier_id`, stamps open time, records float. |

**Alternative Flows**
- **E1 (Step 1):** Cashier already has an OPEN shift → block, show the existing open shift details.
- **E2 (Step 1):** Cashier scheduled but not clocked in → prompt to clock in first (BR-X-01).
- **E3 (Step 1):** Cashier has no shift today, or already clocked out → block; allow only via manager override with reason (BR-X-01).

`POST /api/shifts`

---

#### CS-02 — Record Cash In / Out
**Primary Actor** Cashier · **Secondary** System
**Description** As a cashier, I want to record non-sale cash movements (paid-in, paid-out, petty cash) against my shift so the expected cash is accurate at close.
**Preconditions** Cashier has an OPEN cash shift.
**Postconditions** A cash movement is appended to this cashier's shift ledger.

| # | Actor | System |
|---|-------|--------|
| 1 | Selects *Cash In* or *Cash Out*, enters amount + reason. | Validates amount > 0, reason present, and movement belongs to the cashier's own OPEN shift. |
| 2 | Confirms. | Appends movement with timestamp + cashier_id, updates expected cash for this shift. |

**Alternative Flows**
- **E1 (Step 2):** Cash Out exceeds expected cash on hand for this shift → warn (configurable: block or allow with note).

`POST /api/shifts/{id}/cash`

---

#### CS-03 — View Current Shift Summary
**Primary Actor** Cashier / Manager
**Description** As a cashier, I want to see the live summary of my open shift; as a manager, I want to see any cashier's open shift summary.
**Preconditions** The shift exists and is OPEN.
**Postconditions** None (read-only).
*View UC → see FR-CS-03. Shows expected cash, actual sales by payment method, cash movements for that specific shift.*

`GET /api/shifts/{id}/summary`

---

#### CS-04 — Close Cash Shift & Handover
**Primary Actor** Cashier · **Secondary** Manager, System
**Description** As a cashier, I want to close my shift by counting cash on hand, entering actuals per payment method, and recording the handover amount so the system computes my discrepancies and locks my shift.
**Preconditions** Cashier's own shift is OPEN.
**Postconditions** Shift is `CLOSED` (or `PENDING_RECON`); discrepancies recorded; handover amount available as float for the next cashier.

| # | Actor | System |
|---|-------|--------|
| 1 | Clicks *Close Shift*. | Computes expected per method for **this cashier's shift**: cash = opening float + cash sales + cash-in − cash-out (refunds/voids excluded, BR-CS-03); non-cash = recorded sales per method. |
| 2 | Counts physical cash, enters actual amount. | Computes cash discrepancy (actual − expected cash). Flags if beyond tolerance (BR-CS-05). |
| 3 | Enters actual figures for non-cash methods (card batch, e-wallet, bank). | Computes per-method discrepancy for each non-cash method. |
| 4 | Enters handover amount (cash physically passed to next cashier or deposited). | Records handover amount; this becomes the opening float for the next cashier's shift. |
| 5 | Confirms close with optional note if discrepancy flagged. | Locks shift to `CLOSED`, stamps closer + close time, stores all discrepancies and handover amount. |

**Alternative Flows**
- **A1 (Step 3):** Non-cash settlement figures not yet available → cashier skips non-cash actuals; shift enters `PENDING_RECON`; manager finalizes non-cash later (BR-CS-06).
- **E1 (Step 2/3):** Discrepancy exceeds tolerance threshold → reason note mandatory before proceeding (BR-CS-05).
- **E2 (Step 4):** Handover amount > actual cash counted → block; cashier must recount or adjust.

`PUT /api/shifts/{id}/close`

---

#### CS-05 — View Daily Summary
**Primary Actor** Manager
**Description** As a manager, I want to see a consolidated daily summary aggregating all cashiers' closed shifts for a given date so I can audit total revenue, per-cashier performance, and discrepancies.
**Preconditions** Manager is authenticated; at least one shift exists for the selected date.
**Postconditions** None (read-only).

| # | Actor | System |
|---|-------|--------|
| 1 | Selects a date and opens *Daily Summary*. | Aggregates all shifts for that date (CLOSED and PENDING_RECON). Flags any OPEN shifts as INCOMPLETE. |
| 2 | Views the report. | Displays: (a) Day-level totals by payment method; (b) Per-cashier breakdown (shift time, sales, discrepancy per method, handover); (c) Overall cash discrepancy. |
| 3 | (Optional) Drills into a cashier's shift. | Opens that shift's detail view (CS-06). |

**Tiered display:**

```
Tầng 1 — Tổng ngày    Doanh thu theo phương thức, số đơn
Tầng 2 — Theo ca      Từng thu ngân: giờ làm, doanh thu, lệch quỹ, số tiền bàn giao
Tầng 3 — Theo đơn     Drill-down chi tiết giao dịch (khi điều tra)
```

**Alternative Flows**
- **A1 (Step 1):** One or more shifts are still OPEN → summary shows partial data with an `INCOMPLETE` banner; manager may wait or proceed.
- **A1 (Step 1):** Date has no shifts → system displays "No shifts recorded for this date."

`GET /api/shifts/daily-summary?date=YYYY-MM-DD`

---

#### CS-06 — View Shift History / Report
**Primary Actor** Manager
**Description** As a manager, I want to review individual past shifts with full detail so I can audit a specific cashier's cash handling.
**Preconditions** Manager is authenticated.
**Postconditions** None (read-only); closed shifts are immutable.
*View UC → see FR-CS-06. Filterable by cashier, date range, status. Shows float, movements, sales, discrepancy, handover.*

---

## 5. Business Rules

### 5.1 Work Shift — `BR-WS`
- **BR-WS-01** A shift template must have end time strictly after start time, and break duration less than total shift length.
- **BR-WS-02** A staff member cannot be assigned to two shifts whose time ranges overlap.
- **BR-WS-03** A schedule is only visible to staff once it is `PUBLISHED`; `DRAFT` schedules are manager-only.
- **BR-WS-04** Editing a published schedule creates a new version and re-notifies only the affected staff.
- **BR-WS-05** *(Configurable)* A minimum rest period (default: 8 hours) must separate a staff member's consecutive shifts.
- **BR-WS-06** Swap/leave requests are blocked once a shift enters its freeze window (default: < 12h before start); changes within the window require manager action directly.
- **BR-WS-07** Clock-in is permitted only within an allowed window around shift start (default: 30 min before to 60 min after). Beyond the grace period (default: 15 min late) the record is flagged `LATE`.
- **BR-WS-08** Worked hours run from the actual clock-in (not earlier than scheduled start) to the actual clock-out. **Early clock-out** uses the actual out time (hours short are not auto-filled); **late clock-out / overrun** is capped at scheduled end unless a manager approves overtime; **early clock-in** does not extend paid hours.
- **BR-WS-11** Clocking out before the scheduled end is permitted, but: (a) the system blocks it while the cashier still owns an OPEN cash shift (BR-X-02) — the shift must be closed/handed over first; (b) the staff member must select a reason — `LEAVE_APPROVED` / `LEAVE_UNAPPROVED` / `INCIDENT` — with an optional note; (c) `worked_minutes` is computed to the actual out time; (d) the attendance record is flagged `EARLY_LEAVE` so Payroll (BR-PR-01/02) and reports reflect the shortfall.
- **BR-WS-09** A `SCHEDULED` shift with no clock-in past its end is auto-marked `NO_SHOW` by the System.
- **BR-WS-10** Labor cost and worked-hour reports derive exclusively from attendance records, never from cash shift data.

### 5.2 Cash Shift — `BR-CS`
- **BR-CS-01** **Each cashier may have at most one OPEN cash shift at any time.** Multiple cashiers can have OPEN shifts simultaneously — there is no system-wide single-shift constraint.
- **BR-CS-02** Only the cashier who opened the shift or a manager may close it.
- **BR-CS-03** Expected cash for a shift = opening float + cash sales + cash-in − cash-out. **Refund/void transactions are excluded** from reconciliation entirely.
- **BR-CS-04** Reconciliation at close covers **all payment methods** (cash, card, e-wallet, bank transfer), each with its own expected, actual, and discrepancy figure, scoped to **this cashier's shift only**.
- **BR-CS-05** If any per-method discrepancy exceeds the configured tolerance, a reason note is mandatory before the shift can close.
- **BR-CS-06** Non-cash settlement figures (card batch, e-wallet reports, bank statements) may be unavailable at close time. The cashier may close the cash portion immediately, moving the shift to `PENDING_RECON`; a manager finalizes non-cash actuals later, after which the shift becomes `CLOSED`.
- **BR-CS-07** A `CLOSED` shift is immutable; corrections are made via a separate adjustment record, never by editing the shift.
- **BR-CS-08** Every payment is attributed to the shift of the cashier who processed it at the time of payment. If no OPEN shift exists for that cashier, the system blocks the payment action.
- **BR-CS-09** The handover amount entered at close (BR-CS-04 Step 4) is recorded on the closing shift and made available as the suggested opening float when the next cashier opens their shift. The next cashier must confirm or override it.
- **BR-CS-10** Daily Summary (CS-05) aggregates all shifts for the selected date. A shift with status `OPEN` or `PENDING_RECON` is included as partial data with an `INCOMPLETE` flag.
- **BR-CS-11** Closing a cash shift does **not** end the work shift. While still `CHECKED_IN`, a cashier may open a **new** cash shift (its opening float = the cash currently held / previous handover amount). A `CLOSED` shift is immutable (BR-CS-07) — "reopening" always creates a new shift, never reactivates the closed one. During the gap between closing one shift and opening the next, the cashier has no OPEN shift and therefore cannot take payments (BR-CS-08).

### 5.3 Cross-Layer Rules — `BR-X`
- **BR-X-01** A cashier must be `CHECKED_IN` on an active work shift to open a cash shift. The pre-open check distinguishes three states:
  - *Scheduled but not yet clocked in* → prompt the cashier to clock in first, then allow.
  - *No shift scheduled today* → block; requires manager override.
  - *Already clocked out* → block; requires manager override.
  Any override is performed by a manager, requires a reason, and is written to an audit log. *(The CHECKED_IN requirement itself is configurable; if disabled, the system warns but allows.)*
- **BR-X-02** Clocking out (WS-08/BR-WS-11) while owning an OPEN cash shift is **blocked**; the cashier must close or hand over the cash shift first. This prevents "orphan" cash that no closed shift reconciles.
- **BR-X-03** Work Shift and Cash Shift are independent entities with independent lifecycles; neither status transition forces the other. The only structural link is `cashier_id` on the Cash Shift record.
- **BR-X-04** Labor cost and financial reconciliation are never mixed: revenue figures come from Cash Shift records; worked hours and labor cost come from Work Shift attendance records.

---

## 6. DB Schema (Key Entities)

```sql
-- Ca làm việc (rostering)
WorkShift (
  id, template_id, date, start_time, end_time
)

-- Phân công nhân viên vào ca
ShiftAssignment (
  id, work_shift_id, staff_id,
  status  -- SCHEDULED | CHECKED_IN | CHECKED_OUT | NO_SHOW | LEAVE
  check_in_time, check_out_time, worked_minutes
)

-- Ca thu ngân (mỗi thu ngân 1 ca riêng)
CashShift (
  id, cashier_id,           -- FK: 1 thu ngân, 1 ca OPEN tại 1 thời điểm
  opened_at, closed_at,
  opening_float,
  handover_amount,          -- số tiền bàn giao khi đóng ca
  status  -- OPEN | CLOSED | PENDING_RECON
)
-- Unique constraint: (cashier_id, status = 'OPEN') — enforce BR-CS-01

-- Giao dịch tiền mặt trong ca
CashMovement (
  id, shift_id, cashier_id,
  type   -- CASH_IN | CASH_OUT,
  amount, reason, created_at
)

-- Đối soát theo phương thức thanh toán
ShiftReconciliation (
  id, shift_id, payment_method,
  expected_amount, actual_amount, discrepancy,
  note, finalized_at
)

-- Payment gắn với ca của cashier xử lý
Payment (
  id, order_id,
  shift_id,        -- ca của cashier xử lý payment
  cashier_id,
  payment_method, amount, created_at
)
```

---

## 7. Open Decisions to Confirm in the SRS

1. **BR-WS-05** Giá trị rest period (mặc định 8 giờ, hoặc tắt).
2. **BR-WS-07** Cửa sổ clock-in và ngưỡng late (mặc định 30/60/15 phút).
3. **BR-X-01** Clock-in bắt buộc trước khi mở ca thu ngân — **đã chốt: bắt buộc**, ngoại lệ qua manager override có log. Cần xác nhận ai có quyền override (chỉ Manager, hay cả Accountant).
4. **BR-CS-05** Ngưỡng tolerance lệch quỹ cho từng phương thức.
5. **BR-CS-06** Có dùng trạng thái `PENDING_RECON` không, hay yêu cầu nhập đủ tất cả phương thức trước khi đóng ca.
6. **CS-05 Daily Summary** — nếu có ca đang OPEN cuối ngày: hệ thống tự trigger cảnh báo lúc 23:59 hay chờ manager phát hiện thủ công?
