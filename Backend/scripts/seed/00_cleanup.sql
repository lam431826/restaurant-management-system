-- Wipe transactional/history data before seeding 3 months of fresh history.
-- Deletes ONLY dev/test fixture rows created 20-22/07/2026 (and anything else in these
-- tables) -- master data (users, menu, tables, promotions, cashbook_categories, singleton
-- settings) is left untouched. Child tables are deleted before their parents to respect FKs.
-- Run manually via sqlcmd; not wired into any application startup path.

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
UNION ALL SELECT 'cashbook_vouchers', COUNT(*) FROM cashbook_vouchers;
