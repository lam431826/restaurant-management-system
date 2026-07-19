-- V31: Salary Templates (SRS_PAY BR-PAY-01) — named, reusable main/overtime rate configs.
-- Applying a template to an employee's salary_settings is a copy-on-apply from the frontend
-- (BR-PAY-01: editing/deleting a template must not retroactively affect employees who already
-- applied it), so there is no FK from salary_settings.salary_template to this table.

CREATE TABLE salary_templates (
    id                    NVARCHAR(36)   NOT NULL PRIMARY KEY,
    name                  NVARCHAR(100)  NOT NULL UNIQUE,
    main_salary_type      NVARCHAR(20)   NOT NULL,
    main_base_wage        DECIMAL(12, 0) NOT NULL DEFAULT 0,
    main_advanced_rates   NVARCHAR(MAX),
    overtime_enabled      BIT            NOT NULL DEFAULT 0,
    overtime_rates        NVARCHAR(MAX),
    created_at            DATETIME2,
    updated_at            DATETIME2
);
