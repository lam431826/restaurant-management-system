-- V26: BR-CS-08 — bind every payment to the cashier's OPEN shift at the time of payment.
-- shift_id + cashier_id let shift revenue be attributed by ownership rather than by a
-- time window. Existing rows stay NULL (their shifts are already closed with stored totals).
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('payments') AND name = 'shift_id')
    ALTER TABLE payments ADD shift_id NVARCHAR(36);

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('payments') AND name = 'cashier_id')
    ALTER TABLE payments ADD cashier_id NVARCHAR(36);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_payments_shift')
    CREATE INDEX ix_payments_shift ON payments(shift_id);
