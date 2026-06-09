-- V9: Add columns/tables that V8 declared but were never applied to the DB
-- (V8 was modified after it was already applied; repair updated the checksum only)

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shifts') AND name = 'closed_by')
    ALTER TABLE shifts ADD closed_by NVARCHAR(36);

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shifts') AND name = 'closing_note')
    ALTER TABLE shifts ADD closing_note NVARCHAR(500);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_shift_closed_by')
    ALTER TABLE shifts
        ADD CONSTRAINT fk_shift_closed_by FOREIGN KEY (closed_by) REFERENCES users(id);

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shift_cash_movements') AND name = 'operator_id')
    ALTER TABLE shift_cash_movements ADD operator_id NVARCHAR(36);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_scm_operator')
    ALTER TABLE shift_cash_movements
        ADD CONSTRAINT fk_scm_operator FOREIGN KEY (operator_id) REFERENCES users(id);

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'shift_payment_reconciliations')
BEGIN
    CREATE TABLE shift_payment_reconciliations (
        id              NVARCHAR(36)   NOT NULL PRIMARY KEY,
        shift_id        NVARCHAR(36)   NOT NULL,
        payment_method  NVARCHAR(20)   NOT NULL,
        expected_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
        actual_amount   DECIMAL(12, 0) NOT NULL DEFAULT 0,
        variance        DECIMAL(12, 0) NOT NULL DEFAULT 0,
        CONSTRAINT fk_spr_shift        FOREIGN KEY (shift_id) REFERENCES shifts(id),
        CONSTRAINT uq_spr_shift_method UNIQUE (shift_id, payment_method)
    );
    CREATE INDEX idx_spr_shift ON shift_payment_reconciliations(shift_id);
END
