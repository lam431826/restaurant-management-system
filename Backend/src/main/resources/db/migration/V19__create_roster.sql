-- V19: Work Shift roster (templates, assignments, attendance, swap/leave requests, week publication)
-- Kept separate from `shifts` (Cash Shift / POS session) — these are two independent layers.

CREATE TABLE roster_shift_templates (
    id               NVARCHAR(36)   NOT NULL PRIMARY KEY,
    name             NVARCHAR(100)  NOT NULL,
    start_time       TIME           NOT NULL,
    end_time         TIME           NOT NULL,
    break_minutes    INT            NOT NULL DEFAULT 0,
    headcount_target INT            NOT NULL DEFAULT 0,
    wage             DECIMAL(12, 0) NOT NULL DEFAULT 0,
    created_at       DATETIME2,
    updated_at       DATETIME2,
    CONSTRAINT uq_roster_template_name UNIQUE (name)
);

CREATE TABLE roster_assignments (
    id                NVARCHAR(36)  NOT NULL PRIMARY KEY,
    employee_id       NVARCHAR(36)  NOT NULL,
    shift_template_id NVARCHAR(36)  NOT NULL,
    start_date        DATE          NOT NULL,
    repeat_weekly     BIT           NOT NULL DEFAULT 0,
    repeat_days       NVARCHAR(20),
    repeat_end        DATE,
    holiday_work      BIT           NOT NULL DEFAULT 0,
    excluded_dates    NVARCHAR(1000),
    created_at        DATETIME2,
    updated_at        DATETIME2,
    CONSTRAINT fk_ra_employee FOREIGN KEY (employee_id) REFERENCES users(id),
    CONSTRAINT fk_ra_template FOREIGN KEY (shift_template_id) REFERENCES roster_shift_templates(id)
);

CREATE TABLE roster_attendance (
    id                NVARCHAR(36)  NOT NULL PRIMARY KEY,
    employee_id       NVARCHAR(36)  NOT NULL,
    work_date         DATE          NOT NULL,
    shift_template_id NVARCHAR(36)  NOT NULL,
    assignment_id     NVARCHAR(36),
    status            NVARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED',
    check_in_at       DATETIME2,
    check_out_at      DATETIME2,
    worked_minutes    INT,
    late              BIT           NOT NULL DEFAULT 0,
    CONSTRAINT fk_att_employee FOREIGN KEY (employee_id) REFERENCES users(id),
    CONSTRAINT fk_att_template FOREIGN KEY (shift_template_id) REFERENCES roster_shift_templates(id),
    CONSTRAINT fk_att_assignment FOREIGN KEY (assignment_id) REFERENCES roster_assignments(id),
    CONSTRAINT uq_att_employee_date_shift UNIQUE (employee_id, work_date, shift_template_id)
);

CREATE TABLE roster_requests (
    id                  NVARCHAR(36)  NOT NULL PRIMARY KEY,
    type                NVARCHAR(10)  NOT NULL,
    requester_id        NVARCHAR(36)  NOT NULL,
    work_date           DATE          NOT NULL,
    shift_template_id   NVARCHAR(36)  NOT NULL,
    assignment_id       NVARCHAR(36)  NOT NULL,
    target_employee_id  NVARCHAR(36),
    reason              NVARCHAR(500),
    status              NVARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    manager_note        NVARCHAR(500),
    created_at          DATETIME2,
    CONSTRAINT fk_req_requester FOREIGN KEY (requester_id) REFERENCES users(id),
    CONSTRAINT fk_req_template FOREIGN KEY (shift_template_id) REFERENCES roster_shift_templates(id),
    CONSTRAINT fk_req_assignment FOREIGN KEY (assignment_id) REFERENCES roster_assignments(id),
    CONSTRAINT fk_req_target FOREIGN KEY (target_employee_id) REFERENCES users(id)
);

CREATE TABLE roster_week_publications (
    week_start    DATE          NOT NULL PRIMARY KEY,
    status        NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    version       INT           NOT NULL DEFAULT 0,
    published_at  DATETIME2
);

CREATE INDEX idx_ra_employee   ON roster_assignments(employee_id);
CREATE INDEX idx_ra_template   ON roster_assignments(shift_template_id);
CREATE INDEX idx_att_employee  ON roster_attendance(employee_id);
CREATE INDEX idx_att_date      ON roster_attendance(work_date);
CREATE INDEX idx_req_status    ON roster_requests(status);
CREATE INDEX idx_req_requester ON roster_requests(requester_id);
