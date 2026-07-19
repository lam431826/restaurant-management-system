-- V30: Attendance & Shift Management (SRS_AT v1.1) — manager-operated attendance.
-- Model: work_shifts (template) -> work_schedule_rules (weekly repeat, BR-AT-04) ->
-- work_schedules (materialized per-day occurrences) -> attendance_records (0..1 per schedule)
-- -> violations (BR-AT-12). Keyed to employees(id) — NOT users(id) like the legacy roster_*
-- tables (see V28 header note); the roster module stays frozen alongside.
-- Derived metrics (late/early/OT/credit) are persisted at marking time: settings changes
-- apply prospectively only (UC-AT-05 step 6).

CREATE TABLE work_shifts (
    id                     NVARCHAR(36)  NOT NULL PRIMARY KEY,
    name                   NVARCHAR(100) NOT NULL,
    start_time             TIME          NOT NULL,
    end_time               TIME          NOT NULL,               -- end <= start => overnight, ends next day
    check_in_window_start  TIME,                                 -- BR-AT-14: punch-to-shift matching window,
    check_in_window_end    TIME,                                 --   independent of late/early grace
    apply_scope            NVARCHAR(255),                        -- free text; single restaurant => no logic
    status                 NVARCHAR(20)  NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE
    created_at             DATETIME2,
    updated_at             DATETIME2,
    CONSTRAINT uq_work_shifts_name UNIQUE (name)
);

CREATE TABLE work_schedule_rules (
    id                NVARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id       NVARCHAR(36) NOT NULL,
    shift_id          NVARCHAR(36) NOT NULL,
    days_of_week      NVARCHAR(20) NOT NULL,   -- CSV of ISO weekdays, e.g. '1,3,5' (1=Mon .. 7=Sun)
    start_date        DATE         NOT NULL,
    end_date          DATE,                    -- NULL = endless => rolling 93-day window (BR-AT-04)
    work_on_holidays  BIT          NOT NULL DEFAULT 0,   -- stored per SRS; inert until a holiday calendar exists
    generated_until   DATE         NOT NULL,   -- materialization high-water mark
    created_at        DATETIME2,
    updated_at        DATETIME2,
    CONSTRAINT fk_ws_rules_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_ws_rules_shift    FOREIGN KEY (shift_id)    REFERENCES work_shifts(id)
);

CREATE TABLE work_schedules (
    id                      NVARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id             NVARCHAR(36) NOT NULL,
    shift_id                NVARCHAR(36) NOT NULL,
    work_date               DATE         NOT NULL,
    rule_id                 NVARCHAR(36),            -- NULL = one-off schedule
    substitute_employee_id  NVARCHAR(36),            -- BR-AT-07: covers this occurrence
    created_at              DATETIME2,
    updated_at              DATETIME2,
    CONSTRAINT fk_work_schedules_employee   FOREIGN KEY (employee_id)            REFERENCES employees(id),
    CONSTRAINT fk_work_schedules_shift      FOREIGN KEY (shift_id)               REFERENCES work_shifts(id),
    CONSTRAINT fk_work_schedules_rule       FOREIGN KEY (rule_id)                REFERENCES work_schedule_rules(id),
    CONSTRAINT fk_work_schedules_substitute FOREIGN KEY (substitute_employee_id) REFERENCES employees(id),
    -- Makes rule materialization and the nightly extension job idempotent (insert-if-absent).
    CONSTRAINT uq_work_schedules_emp_shift_date UNIQUE (employee_id, shift_id, work_date)
);

CREATE TABLE attendance_records (
    id                   NVARCHAR(36)  NOT NULL PRIMARY KEY,
    schedule_id          NVARCHAR(36)  NOT NULL,
    type                 NVARCHAR(20)  NOT NULL,   -- PRESENT | LEAVE_APPROVED | LEAVE_UNAPPROVED (BR-AT-06)
    actual_check_in      DATETIME2,
    actual_check_out     DATETIME2,
    worked_minutes       INT           NOT NULL DEFAULT 0,
    late_minutes         INT           NOT NULL DEFAULT 0,   -- beyond grace only (BR-AT-09)
    early_leave_minutes  INT           NOT NULL DEFAULT 0,   -- beyond grace only (BR-AT-09)
    ot_minutes           INT           NOT NULL DEFAULT 0,   -- beyond configured minimum only (BR-AT-10)
    work_credit          DECIMAL(4,2)  NOT NULL DEFAULT 0,   -- cong: 0 / 0.5 / up to 1.00 (BR-AT-08)
    auto_filled          BIT           NOT NULL DEFAULT 0,   -- middle shift of a merged punch (BR-AT-11)
    note                 NVARCHAR(500),
    created_by           NVARCHAR(150),
    created_at           DATETIME2,
    updated_at           DATETIME2,
    CONSTRAINT fk_attendance_records_schedule FOREIGN KEY (schedule_id) REFERENCES work_schedules(id),
    CONSTRAINT uq_attendance_records_schedule UNIQUE (schedule_id)   -- 0..1 record per schedule
);

-- Singleton (exactly one row, seeded below). Durations stored in minutes.
CREATE TABLE attendance_settings (
    id                              NVARCHAR(36) NOT NULL PRIMARY KEY,
    standard_workday_minutes        INT          NOT NULL DEFAULT 480,  -- BR-AT-08
    half_day_enabled                BIT          NOT NULL DEFAULT 0,
    half_day_min_minutes            INT          NOT NULL DEFAULT 0,
    half_day_max_minutes            INT          NOT NULL DEFAULT 270,  -- worked < this => 0.5 cong
    late_enabled                    BIT          NOT NULL DEFAULT 1,
    late_grace_minutes              INT          NOT NULL DEFAULT 0,    -- BR-AT-09
    early_leave_enabled             BIT          NOT NULL DEFAULT 1,
    early_leave_grace_minutes       INT          NOT NULL DEFAULT 0,    -- BR-AT-09
    ot_before_enabled               BIT          NOT NULL DEFAULT 1,
    ot_before_min_minutes           INT          NOT NULL DEFAULT 0,    -- BR-AT-10
    ot_after_enabled                BIT          NOT NULL DEFAULT 1,
    ot_after_min_minutes            INT          NOT NULL DEFAULT 0,    -- BR-AT-10
    merged_shift_enabled            BIT          NOT NULL DEFAULT 0,    -- BR-AT-11
    merged_shift_max_count          INT          NOT NULL DEFAULT 2,
    merged_shift_max_break_minutes  INT          NOT NULL DEFAULT 60,
    manual_default_time_mode        NVARCHAR(20) NOT NULL DEFAULT 'SHIFT_TIME', -- SHIFT_TIME | ACTUAL_TIME (BR-AT-05)
    created_at                      DATETIME2,
    updated_at                      DATETIME2
);

INSERT INTO attendance_settings (id, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000001', SYSUTCDATETIME(), SYSUTCDATETIME());

CREATE TABLE violation_types (
    id              NVARCHAR(36)   NOT NULL PRIMARY KEY,
    name            NVARCHAR(150)  NOT NULL,
    penalty_amount  DECIMAL(12, 0) NOT NULL DEFAULT 0,
    deleted         BIT            NOT NULL DEFAULT 0,   -- soft delete once referenced by violations
    created_at      DATETIME2,
    updated_at      DATETIME2
);

CREATE TABLE violations (
    id                    NVARCHAR(36)   NOT NULL PRIMARY KEY,
    attendance_record_id  NVARCHAR(36)   NOT NULL,
    violation_type_id     NVARCHAR(36)   NOT NULL,
    count                 INT            NOT NULL DEFAULT 1,
    applied_penalty       DECIMAL(12, 0) NOT NULL,   -- unit amount snapshot, overridable (UC-AT-06)
    created_at            DATETIME2,
    updated_at            DATETIME2,
    CONSTRAINT fk_violations_record FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id),
    CONSTRAINT fk_violations_type   FOREIGN KEY (violation_type_id)    REFERENCES violation_types(id)
);

CREATE INDEX idx_work_schedules_date     ON work_schedules(work_date);
CREATE INDEX idx_work_schedules_emp_date ON work_schedules(employee_id, work_date);
CREATE INDEX idx_ws_rules_end_date       ON work_schedule_rules(end_date);
CREATE INDEX idx_violations_record       ON violations(attendance_record_id);
