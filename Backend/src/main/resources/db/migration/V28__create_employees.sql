-- V28: Employee Records Management (SRS_EMP) — employee master data, decoupled from `users`.
-- `user_id` is an optional (0..1) link to a login account (BR-EMP-03); roster_* FKs still
-- reference users(id) directly for now — repointing them to `employees` is deferred until
-- SRS_AT_Attendance_Shift.md exists (see plan notes).

CREATE TABLE employees (
    id                NVARCHAR(36)   NOT NULL PRIMARY KEY,
    code              NVARCHAR(20)   NOT NULL UNIQUE,
    name              NVARCHAR(150)  NOT NULL,
    phone             NVARCHAR(20)   NOT NULL UNIQUE,
    status            NVARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    avatar_url        NVARCHAR(500),
    start_date        DATE,
    timekeep_code     NVARCHAR(50),
    note              NVARCHAR(1000),
    id_number         NVARCHAR(30),
    birthday          DATE,
    gender            NVARCHAR(10),
    address           NVARCHAR(300),
    email             NVARCHAR(150),
    user_id           NVARCHAR(36),
    created_at        DATETIME2,
    updated_at        DATETIME2,
    CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE salary_settings (
    id                    NVARCHAR(36)   NOT NULL PRIMARY KEY,
    employee_id           NVARCHAR(36)   NOT NULL UNIQUE,
    main_salary_type      NVARCHAR(20)   NOT NULL DEFAULT 'SHIFT',
    main_base_wage        DECIMAL(12, 0) NOT NULL DEFAULT 0,
    main_advanced_rates   NVARCHAR(MAX),
    overtime_enabled      BIT            NOT NULL DEFAULT 0,
    overtime_rates        NVARCHAR(MAX),
    salary_template       NVARCHAR(100),
    created_at            DATETIME2,
    updated_at            DATETIME2,
    CONSTRAINT fk_salary_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_name   ON employees(name);

-- Filtered index instead of a plain UNIQUE column: SQL Server allows only one NULL per
-- plain UNIQUE constraint, but most employees have no linked login account (user_id NULL).
CREATE UNIQUE INDEX uq_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;
