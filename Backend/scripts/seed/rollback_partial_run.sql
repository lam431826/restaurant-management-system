-- Reusable rollback for a partial seed_3_months.sql run. Removes ONLY the master-data
-- rows this script's own master-data block adds, matched by stable attributes (employee
-- code range, exact ASCII names/usernames/dates) rather than ids (ids are randomized
-- per run, so hardcoding them breaks on a second failed-and-regenerated attempt).
-- Pre-existing rows with different byte content (e.g. a diacritic "Ca Sáng" vs our plain
-- ASCII "Ca Sang", or "Di muon 1h" vs our "Nghi khong phep") are left untouched.
-- Transactional tables are already fully covered by 00_cleanup.sql; run that FIRST.

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

DELETE FROM salary_settings WHERE employee_id IN (
    SELECT id FROM employees WHERE code >= 'NV000004' OR code = 'NV000003'
);
DELETE FROM employees WHERE code >= 'NV000004';
DELETE FROM users WHERE username IN ('cashier02', 'cashier03', 'cashier04', 'cashier05');
DELETE FROM work_shifts WHERE name IN ('Ca Sang', 'Ca Toi');
DELETE FROM payroll_holidays WHERE holiday_date IN ('2026-04-30', '2026-05-01');
DELETE FROM salary_templates WHERE name = 'Mau nhan vien phuc vu';
DELETE FROM violation_types WHERE name IN ('Nghi khong phep', 'Vi pham dong phuc');

SELECT 'employees' t, COUNT(*) c FROM employees
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'work_shifts', COUNT(*) FROM work_shifts
UNION ALL SELECT 'payroll_holidays', COUNT(*) FROM payroll_holidays
UNION ALL SELECT 'salary_templates', COUNT(*) FROM salary_templates
UNION ALL SELECT 'violation_types', COUNT(*) FROM violation_types;
