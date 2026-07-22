-- V48: Payroll configuration singleton (Thiết lập tính lương).
-- Persistence only — no scheduler consumes auto_create/auto_update_enabled and no PIT
-- calculation reads personal_income_tax_enabled yet; these are stored for future features.

CREATE TABLE payroll_settings (
    id                            NVARCHAR(36) NOT NULL PRIMARY KEY,
    payroll_cutoff_day            INT          NOT NULL DEFAULT 1,   -- 1..28
    auto_create_enabled           BIT          NOT NULL DEFAULT 1,
    auto_update_enabled           BIT          NOT NULL DEFAULT 1,
    personal_income_tax_enabled   BIT          NOT NULL DEFAULT 0,
    created_at                    DATETIME2,
    updated_at                    DATETIME2
);

INSERT INTO payroll_settings (id, created_at, updated_at)
VALUES ('c0000000-0000-0000-0000-000000000001', SYSUTCDATETIME(), SYSUTCDATETIME());
