-- V56: Remove the manual Cash In/Out ("Thu/Chi quỹ") feature — shift_cash_movements
-- and its FKs/index are no longer used (ShiftCashMovement/ShiftCashMovementRepository
-- removed from the codebase). Never edit V6/V8/V9, which created/altered this table.

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_scm_operator')
    ALTER TABLE shift_cash_movements DROP CONSTRAINT fk_scm_operator;

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_scm_shift')
    ALTER TABLE shift_cash_movements DROP CONSTRAINT fk_scm_shift;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_scm_shift' AND object_id = OBJECT_ID('shift_cash_movements'))
    DROP INDEX idx_scm_shift ON shift_cash_movements;

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'shift_cash_movements')
    DROP TABLE shift_cash_movements;
