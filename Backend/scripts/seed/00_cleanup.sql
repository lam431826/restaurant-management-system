-- Wipe everything seed.js owns before it regenerates 3 fresh months of history. Run by
-- seed.js itself (via run_seed.bat) before every run -- always run this FIRST, never after.
--
-- Transactional tables: deletes ALL rows (this is a dev/test reset tool, not scoped to
-- "only seed-created" rows -- any real data in these tables is expected to be disposable
-- here). Master data owned by the seed roster (5 fixed-name employees + their
-- salary_settings, the 'cashier02'/'waiter02' extra logins, payroll_holidays/salary_templates/
-- violation_types the seed itself creates) is also deleted by stable name, so a repeat run
-- never collides on duplicate codes/names. Left untouched: core users (admin/manager01/
-- cashier01/waiter01), work_shifts (Ca Sang/Ca Chieu/Ca Toi -- shared with real schedule
-- data going forward), menu_categories/menu_items/restaurant_tables/table_areas/promotions/
-- cashbook_categories/singleton settings -- all of these baseline/master rows are now
-- created by seed.js itself (insert-only-if-missing, see seed.js's "Step 1") rather than by
-- DataSeeder.java, which has been deleted.

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

DELETE FROM cashbook_vouchers;
DELETE FROM payslip_payments;
DELETE FROM payslips;
DELETE FROM payroll_sheets;
DELETE FROM violations;
DELETE FROM attendance_records;
DELETE FROM work_schedules;
DELETE FROM work_schedule_rules;
DELETE FROM invoice_item_allocations;
DELETE FROM payment_webhook_logs;
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM shift_payment_reconciliations;
DELETE FROM shifts;
DELETE FROM reservations;

-- Master data this script's roster owns (matched by stable name/username, not id -- ids are
-- randomized per run).
DELETE FROM salary_settings WHERE employee_id IN (
    SELECT id FROM employees WHERE name IN
        ('Nguyen Van A', 'Nguyen Van B', 'Nguyen Van C', 'Nguyen Van D', 'Nguyen Van E')
);
DELETE FROM employees WHERE name IN
    ('Nguyen Van A', 'Nguyen Van B', 'Nguyen Van C', 'Nguyen Van D', 'Nguyen Van E');
DELETE FROM users WHERE username IN ('cashier02', 'waiter02');
DELETE FROM payroll_holidays WHERE name IN ('Ngay Thong Nhat', 'Quoc Te Lao Dong');
DELETE FROM salary_templates WHERE name = 'Mau nhan vien phuc vu';
DELETE FROM violation_types WHERE name IN ('Nghi khong phep', 'Vi pham dong phuc');

PRINT 'Cleanup complete.';

SELECT 'orders' t, COUNT(*) c FROM orders
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'shifts', COUNT(*) FROM shifts
UNION ALL SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL SELECT 'work_schedules', COUNT(*) FROM work_schedules
UNION ALL SELECT 'attendance_records', COUNT(*) FROM attendance_records
UNION ALL SELECT 'violations', COUNT(*) FROM violations
UNION ALL SELECT 'payroll_sheets', COUNT(*) FROM payroll_sheets
UNION ALL SELECT 'payslips', COUNT(*) FROM payslips
UNION ALL SELECT 'payslip_payments', COUNT(*) FROM payslip_payments
UNION ALL SELECT 'cashbook_vouchers', COUNT(*) FROM cashbook_vouchers
UNION ALL SELECT 'employees', COUNT(*) FROM employees WHERE name IN
    ('Nguyen Van A', 'Nguyen Van B', 'Nguyen Van C', 'Nguyen Van D', 'Nguyen Van E');
