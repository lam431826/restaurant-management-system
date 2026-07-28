-- Paid approved-leave quota per calendar year (SalaryCalculator now pays LEAVE_APPROVED days
-- up to this many per employee per year; LEAVE_UNAPPROVED stays always unpaid). Default 12
-- mirrors the common VN statutory annual-leave allowance; managers can change it via
-- PUT /api/payroll/settings.
ALTER TABLE payroll_settings ADD
    paid_leave_days_per_year INT NOT NULL CONSTRAINT DF_payroll_settings_paid_leave_days_per_year DEFAULT 12;
