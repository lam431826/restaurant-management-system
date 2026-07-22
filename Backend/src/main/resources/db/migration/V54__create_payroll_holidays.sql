-- V54: Ngày lễ, Tết (public holiday calendar, BR-PAY-04) — lets SalaryCalculator finally
-- classify a work date as "holiday" for salary-rate purposes; previously always inert.

CREATE TABLE payroll_holidays (
    id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL,
    holiday_date  DATE          NOT NULL UNIQUE,
    created_at    DATETIME2,
    updated_at    DATETIME2
);
