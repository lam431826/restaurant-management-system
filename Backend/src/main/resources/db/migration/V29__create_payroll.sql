-- V29: Payroll Management (SRS_PAY v1.2) — payroll sheets, payslips, salary payments.
-- Payslips snapshot employee code/name and per-record attendance JSON so FINALIZED sheets
-- stay immutable (BR-PAY-13) and survive employee soft-delete (BR-EMP-04/05).
-- payslip_payments.voucher_code (PC%06d) is the Cash Book (Sổ quỹ) voucher stub — BR-PAY-17;
-- the Cash Book module does not exist yet.

CREATE TABLE payroll_sheets (
    id                 NVARCHAR(36)   NOT NULL PRIMARY KEY,
    code               NVARCHAR(20)   NOT NULL UNIQUE,
    name               NVARCHAR(150)  NOT NULL,
    pay_term           NVARCHAR(20)   NOT NULL,                  -- MONTHLY | CUSTOM
    period_start       DATE           NOT NULL,
    period_end         DATE           NOT NULL,
    scope              NVARCHAR(20)   NOT NULL,                  -- ALL | CUSTOM
    status             NVARCHAR(20)   NOT NULL DEFAULT 'DRAFT',  -- GENERATING | DRAFT | FINALIZED | CANCELLED
    payment_status     NVARCHAR(20)   NOT NULL DEFAULT 'UNPAID', -- UNPAID | PARTIAL | PAID
    note               NVARCHAR(1000),
    created_by         NVARCHAR(150),
    finalized_by       NVARCHAR(150),
    finalized_at       DATETIME2,
    data_refreshed_at  DATETIME2,
    created_at         DATETIME2,
    updated_at         DATETIME2
);

CREATE TABLE payslips (
    id                    NVARCHAR(36)   NOT NULL PRIMARY KEY,
    code                  NVARCHAR(20)   NOT NULL UNIQUE,
    payroll_sheet_id      NVARCHAR(36)   NOT NULL,
    employee_id           NVARCHAR(36)   NOT NULL,
    employee_code         NVARCHAR(20)   NOT NULL,
    employee_name         NVARCHAR(150)  NOT NULL,
    salary_type           NVARCHAR(20),                              -- NULL = employee has no salary setting
    main_salary           DECIMAL(12, 0) NOT NULL DEFAULT 0,
    overtime_salary       DECIMAL(12, 0) NOT NULL DEFAULT 0,
    deduction             DECIMAL(12, 0) NOT NULL DEFAULT 0,
    main_overridden       BIT            NOT NULL DEFAULT 0,
    overtime_overridden   BIT            NOT NULL DEFAULT 0,
    deduction_overridden  BIT            NOT NULL DEFAULT 0,
    paid_amount           DECIMAL(12, 0) NOT NULL DEFAULT 0,
    payment_status        NVARCHAR(20)   NOT NULL DEFAULT 'UNPAID',  -- UNPAID | PARTIAL | PAID
    status                NVARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | CANCELLED
    shift_count           INT            NOT NULL DEFAULT 0,
    worked_minutes        INT            NOT NULL DEFAULT 0,
    ot_minutes            INT            NOT NULL DEFAULT 0,
    attendance_snapshot   NVARCHAR(MAX),
    created_at            DATETIME2,
    updated_at            DATETIME2,
    CONSTRAINT fk_payslips_sheet    FOREIGN KEY (payroll_sheet_id) REFERENCES payroll_sheets(id),
    CONSTRAINT fk_payslips_employee FOREIGN KEY (employee_id)      REFERENCES employees(id),
    CONSTRAINT uq_payslips_sheet_employee UNIQUE (payroll_sheet_id, employee_id)
);

CREATE TABLE payslip_payments (
    id            NVARCHAR(36)   NOT NULL PRIMARY KEY,
    payslip_id    NVARCHAR(36)   NOT NULL,
    voucher_code  NVARCHAR(20)   NOT NULL UNIQUE,
    amount        DECIMAL(12, 0) NOT NULL,
    method        NVARCHAR(20)   NOT NULL,   -- CASH | TRANSFER
    paid_at       DATETIME2      NOT NULL,
    note          NVARCHAR(500),
    created_by    NVARCHAR(150),
    created_at    DATETIME2,
    CONSTRAINT fk_payslip_payments_payslip FOREIGN KEY (payslip_id) REFERENCES payslips(id)
);

CREATE INDEX idx_payroll_sheets_status    ON payroll_sheets(status);
CREATE INDEX idx_payslips_employee        ON payslips(employee_id);
CREATE INDEX idx_payslip_payments_payslip ON payslip_payments(payslip_id);
